import { Op } from 'sequelize';
import {
    Batch, BatchProductDemand, BatchProductTask, TaskWorkerAssignment,
    Product, User, DeliverySchedule, DeliveryItem, RetailOrder, RetailOrderItem
} from '../models/index.js';
import {
    calculateTotalProductTime, calculateWeighingDuration, calculateSoakingDuration,
    calculateCuttingDuration, calculateDryingDuration, recalculateRemainingTime
} from '../utils/taskMath.js';

// Get available batches for today
export const getTodayBatches = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const batches = await Batch.findAll({
            where: { status: 'active', is_deleted: false }
        });
        res.status(200).json({ success: true, batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Handle when a worker leaves a task (e.g. to switch to alarm)
const leaveTaskHelper = async (workerId) => {
    // Find if the worker is currently assigned to a RUNNING or PAUSED task
    const assignment = await TaskWorkerAssignment.findOne({
        where: { worker_id: workerId, left_at: null },
        include: [{ model: BatchProductTask, as: 'task' }]
    });

    if (assignment && assignment.task) {
        const task = assignment.task;
        if (['RUNNING', 'PAUSED'].includes(task.status)) {
            const activeAssignments = await TaskWorkerAssignment.findAll({ where: { task_id: task.id, left_at: null } });
            const oldWorkerCount = activeAssignments.length;
            const newWorkerCount = oldWorkerCount - 1;

            assignment.left_at = new Date();
            await assignment.save();

            // Recalculate time if it was running and there's a change in worker count
            if (task.status === 'RUNNING' && oldWorkerCount > 0) {
                const now = new Date();
                const elapsedRealSeconds = Math.floor((now.getTime() - new Date(task.started_at).getTime()) / 1000);
                const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;
                let currentRemaining = task.remaining_seconds - Math.floor(effectiveElapsed / oldWorkerCount);
                if (currentRemaining < 0) currentRemaining = 0;

                task.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);
                task.started_at = now; // reset start time for the new speed
                await task.save();
            }
        } else {
            // Just leave if it's NOT_STARTED
            assignment.left_at = new Date();
            await assignment.save();
        }
    }
};

const syncBatchDemand = async (batchId) => {
    const today = new Date().toISOString().split('T')[0];
    const demandMap = {};

    const schedules = await DeliverySchedule.findAll({
        where: { batch_id: batchId, scheduled_date: today },
        include: [{ model: DeliveryItem, as: 'DeliveryItems' }]
    });

    for (const s of schedules) {
        if (s.DeliveryItems) {
            for (const i of s.DeliveryItems) {
                if (i.product_id) demandMap[i.product_id] = (demandMap[i.product_id] || 0) + parseFloat(i.qty_gm || 0);
            }
        }
    }

    const retails = await RetailOrder.findAll({
        where: { batch_id: batchId, delivery_date: today, delivery_status: { [Op.notIn]: ['cancelled', 'delivered'] } },
        include: [{ model: RetailOrderItem, as: 'Items' }]
    });

    for (const r of retails) {
        if (r.Items) {
            for (const i of r.Items) {
                if (i.product_id) demandMap[i.product_id] = (demandMap[i.product_id] || 0) + parseFloat(i.quantity || 0);
            }
        }
    }

    for (const [productId, qty] of Object.entries(demandMap)) {
        if (qty > 0) {
            const existing = await BatchProductDemand.findOne({ where: { batch_id: batchId, product_id: productId } });
            if (existing) {
                await existing.update({ quantity_grams: qty });
            } else {
                await BatchProductDemand.create({ batch_id: batchId, product_id: productId, quantity_grams: qty });
            }
        }
    }
};

// GET /api/worker-tasks/batches/:batchId/demand
// Aggregates or fetches batch demand
export const getBatchDemand = async (req, res) => {
    try {
        const { batchId } = req.params;

        await syncBatchDemand(batchId);

        let demands = await BatchProductDemand.findAll({
            where: { batch_id: batchId },
            include: [{ model: Product, attributes: ['id', 'name'] }]
        });

        const aggregated = {};
        for (const d of demands) {
            if (!aggregated[d.product_id]) {
                aggregated[d.product_id] = {
                    productId: d.product_id,
                    productName: d.Product ? d.Product.name : 'Unknown',
                    quantity: 0
                };
            }
            aggregated[d.product_id].quantity = Math.max(aggregated[d.product_id].quantity, parseFloat(d.quantity_grams));
        }

        res.status(200).json({ success: true, demand: Object.values(aggregated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Safe alarm polling endpoint with no side-effects
export const checkAlarms = async (req, res) => {
    try {
        const { batchId } = req.query;
        const workerId = req.user.id;
        
        if (!batchId) return res.status(400).json({ success: false, message: "batchId required" });

        const alarmTasks = await BatchProductTask.findAll({
            where: { batch_id: batchId, status: 'ALARM' },
            include: [
                { model: Product },
                { 
                    model: TaskWorkerAssignment, 
                    as: 'worker_assignments', 
                    where: { worker_id: workerId }
                }
            ]
        });

        if (alarmTasks.length > 0) {
            return res.status(200).json({ success: true, task: alarmTasks[0] });
        }

        return res.status(200).json({ success: true, task: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

class Mutex {
    constructor() { this.queue = []; this.locked = false; }
    async lock() {
        return new Promise(resolve => {
            if (this.locked) { this.queue.push(resolve); } 
            else { this.locked = true; resolve(); }
        });
    }
    unlock() {
        if (this.queue.length > 0) { const resolve = this.queue.shift(); resolve(); } 
        else { this.locked = false; }
    }
}
const assignMutex = new Mutex();

// Priority logic for assigning the next task to a worker
export const assignNextTask = async (req, res) => {
    await assignMutex.lock();
    try {
        const workerId = req.user.id;
        const { batchId } = req.query;

        if (!batchId) return res.status(400).json({ success: false, message: "batchId required" });

        await syncBatchDemand(batchId);

        // Get all demands for this batch to know the products and quantities
        const demands = await BatchProductDemand.findAll({
            where: { batch_id: batchId },
            include: [{ model: Product }]
        });

        if (!demands.length) {
            return res.status(200).json({ success: true, task: null, message: "No demand for this batch" });
        }

        // Get all tasks for this batch today
        const tasks = await BatchProductTask.findAll({
            where: { batch_id: batchId },
            include: [
                { model: TaskWorkerAssignment, as: 'worker_assignments', where: { left_at: null }, required: false },
                { model: Product }
            ]
        });

        const getProcessedQuantity = (productId, stage) => {
            return tasks
                .filter(t => t.product_id === productId && t.stage === stage)
                .reduce((sum, t) => sum + parseFloat(t.quantity_grams || 0), 0);
        };

        const returnTask = async (taskToReturn, action) => {
            if (taskToReturn && ['WEIGHING', 'CUTTING'].includes(taskToReturn.stage)) {
                const existing = await TaskWorkerAssignment.findOne({ where: { task_id: taskToReturn.id, worker_id: workerId, left_at: null } });
                if (!existing) {
                    await TaskWorkerAssignment.create({ task_id: taskToReturn.id, worker_id: workerId, joined_at: new Date() });
                }
            }
            return res.status(200).json({ success: true, task: taskToReturn, action });
        };

        // Priority -1: Unacknowledged ALARMs?
        const alarmTasks = tasks.filter(t => t.status === 'ALARM');
        if (alarmTasks.length > 0) {
            return await returnTask(alarmTasks[0], 'NEW_TASK');
        }

        // Priority 0: Is the worker already assigned to an active HANDS-ON task, or an unstarted task?
        const myCurrentTask = tasks.find(t => {
            if (!t.worker_assignments.some(a => a.worker_id === workerId)) return false;
            
            // If it's a background task (SOAKING, DRYING), only return it if it's NOT_STARTED
            if (['SOAKING', 'DRYING'].includes(t.stage)) {
                return t.status === 'NOT_STARTED';
            }
            
            // If it's a hands-on task (WEIGHING, CUTTING), return it if it's active
            return ['NOT_STARTED', 'RUNNING', 'PAUSED'].includes(t.status);
        });
        if (myCurrentTask) {
            return await returnTask(myCurrentTask, 'CONTINUE_TASK');
        }

        // Priority 1: Advance existing products (NOT_STARTED for DRYING, CUTTING, SOAKING)
        // Prefer stages closer to completion: DRYING > CUTTING > SOAKING
        const stagePriority = { DRYING: 3, CUTTING: 2, SOAKING: 1, WEIGHING: 0 };
        const notStartedPipelineTasks = tasks.filter(t => 
            t.status === 'NOT_STARTED' && ['SOAKING', 'CUTTING', 'DRYING'].includes(t.stage) &&
            t.worker_assignments.length === 0
        ).sort((a, b) => stagePriority[b.stage] - stagePriority[a.stage]);

        if (notStartedPipelineTasks.length > 0) {
            return await returnTask(notStartedPipelineTasks[0], 'NEW_TASK');
        }

        // Priority 2: Join active work (Only CUTTING can be joined by multiple workers. WEIGHING is strictly for one worker)
        const activeHandsOnTasks = tasks.filter(t => {
            if (!['WEIGHING', 'CUTTING'].includes(t.stage)) return false;
            if (!['RUNNING', 'PAUSED', 'NOT_STARTED'].includes(t.status)) return false;
            
            // If it's WEIGHING, only allow if NO worker is currently assigned
            if (t.stage === 'WEIGHING' && t.worker_assignments.length > 0) {
                return false;
            }
            return true;
        });

        if (activeHandsOnTasks.length > 0) {
            // Check if worker is already in this task to avoid duplicate join
            const notJoinedTasks = activeHandsOnTasks.filter(t =>
                !t.worker_assignments.some(a => a.worker_id === workerId)
            );

            if (notJoinedTasks.length > 0) {
                return await returnTask(notJoinedTasks[0], 'JOIN_TASK');
            }
        }

        // Priority 3: Start new WEIGHING task (Unweighed product available?)
        let unweighedProducts = demands.filter(d => {
            const processedQty = getProcessedQuantity(d.product_id, 'WEIGHING');
            return processedQty < parseFloat(d.quantity_grams);
        });

        if (unweighedProducts.length > 0) {
            // Sort by total product time descending
            unweighedProducts.sort((a, b) => {
                const timeA = calculateTotalProductTime(a.Product, a.quantity_grams);
                const timeB = calculateTotalProductTime(b.Product, b.quantity_grams);
                return timeB - timeA; // Descending
            });

            const topProduct = unweighedProducts[0];
            const processedQty = getProcessedQuantity(topProduct.product_id, 'WEIGHING');
            const remainingQty = parseFloat(topProduct.quantity_grams) - processedQty;
            const duration = calculateWeighingDuration(topProduct.Product);

            // Create WEIGHING task
            let newTask = await BatchProductTask.create({
                batch_id: batchId,
                product_id: topProduct.product_id,
                stage: 'WEIGHING',
                quantity_grams: remainingQty,
                status: 'NOT_STARTED',
                duration_seconds: duration,
                remaining_seconds: duration
            });

            // Reload to get the Product association
            newTask = await BatchProductTask.findByPk(newTask.id, {
                include: [{ model: Product }]
            });

            return await returnTask(newTask, 'NEW_TASK');
        }

        // Idle
        return res.status(200).json({ success: true, task: null, action: 'IDLE' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        assignMutex.unlock();
    }
};

// Start a stage
export const startTaskStage = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;

        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (task.status === 'NOT_STARTED') {
            task.status = 'RUNNING';
            task.started_at = new Date();
            await task.save();

            // Assign worker to this task if not already (for all stages so we know who initiated background tasks)
            const existing = await TaskWorkerAssignment.findOne({ where: { task_id: taskId, worker_id: workerId, left_at: null } });
            if (!existing) {
                await TaskWorkerAssignment.create({ task_id: taskId, worker_id: workerId, joined_at: new Date() });
            }
        }

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const handleStageCompletion = async (task) => {
    task.status = 'DONE';
    task.completed_at = new Date();
    task.remaining_seconds = 0;
    await task.save();

    // Free all workers on this task
    await TaskWorkerAssignment.update(
        { left_at: new Date() },
        { where: { task_id: task.id, left_at: null } }
    );

    // Create the NEXT stage task in NOT_STARTED state
    const stageOrder = ['WEIGHING', 'SOAKING', 'CUTTING', 'DRYING'];
    const currentIdx = stageOrder.indexOf(task.stage);
    
    let nextTask = null;
    if (currentIdx >= 0 && currentIdx < stageOrder.length - 1) {
        let nextStage = stageOrder[currentIdx + 1];
        const product = task.Product || await Product.findByPk(task.product_id);
        
        let duration = 0;
        while(nextStage) {
            if (nextStage === 'SOAKING') duration = calculateSoakingDuration(product);
            else if (nextStage === 'CUTTING') duration = calculateCuttingDuration(product, task.quantity_grams);
            else if (nextStage === 'DRYING') duration = calculateDryingDuration(product);

            if (duration === 0 && ['SOAKING', 'DRYING'].includes(nextStage)) {
                // skip zero-duration waiting stages
                const skipIdx = stageOrder.indexOf(nextStage);
                if (skipIdx >= 0 && skipIdx < stageOrder.length - 1) {
                    nextStage = stageOrder[skipIdx + 1];
                } else {
                    nextStage = null;
                }
            } else {
                break;
            }
        }

        if (nextStage) {
            nextTask = await BatchProductTask.create({
                batch_id: task.batch_id,
                product_id: task.product_id,
                stage: nextStage,
                quantity_grams: task.quantity_grams,
                status: 'NOT_STARTED',
                duration_seconds: duration,
                remaining_seconds: duration
            });
            // Reload to attach product
            nextTask = await BatchProductTask.findByPk(nextTask.id, { include: [{ model: Product }] });
        }
    }
    return { task, nextTask };
};

// Pause a stage (interrupt)
export const pauseTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        // In real app, we calculate elapsed time from started_at/resumed_at and update remaining_seconds accurately
        const task = await BatchProductTask.findByPk(taskId);
        if (!task || task.status !== 'RUNNING') return res.status(400).json({ success: false, message: "Invalid state for pause" });

        const now = new Date();
        const activeWorkers = await TaskWorkerAssignment.count({ where: { task_id: taskId, left_at: null } });

        // Elapsed real seconds since last start
        const elapsedRealSeconds = Math.floor((now.getTime() - new Date(task.started_at).getTime()) / 1000);

        // Effective elapsed work units
        const effectiveElapsed = elapsedRealSeconds * activeWorkers;

        // Decrement remaining seconds based on what was done
        let newRemaining = task.remaining_seconds - Math.floor(effectiveElapsed / activeWorkers);
        if (newRemaining < 0) newRemaining = 0;

        task.remaining_seconds = newRemaining;
        task.status = 'PAUSED';
        task.paused_at = now;
        await task.save();

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Resume a stage
export const resumeTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await BatchProductTask.findByPk(taskId);
        if (!task || task.status !== 'PAUSED') return res.status(400).json({ success: false, message: "Task not paused" });

        task.status = 'RUNNING';
        task.started_at = new Date(); // Reset start time to now for remaining calculation
        task.paused_at = null;
        await task.save();

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Complete a running stage
export const completeTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        if (!task) return res.status(404).json({ success: false });

        const result = await handleStageCompletion(task);
        res.status(200).json({ success: true, task: result.task, nextTask: result.nextTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Acknowledge Alarm
export const acknowledgeAlarm = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;
        
        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });
        
        // If already completed (e.g. double click or another worker), return success to clear frontend modal
        if (task.status === 'DONE') {
            return res.status(200).json({ success: true, task });
        }
        
        if (task.status !== 'ALARM') {
            return res.status(400).json({ success: false, message: "Task not in alarm" });
        }

        // Leave current task if any (e.g., Worker was cutting Product B, alarm for Product A pops)
        await leaveTaskHelper(workerId);

        // Complete the alarm task and get next task
        const result = await handleStageCompletion(task);
        
        // If there's a next task for this product, assign it to the worker who acknowledged the alarm
        if (result.nextTask && result.nextTask.status === 'NOT_STARTED') {
            await TaskWorkerAssignment.create({ 
                task_id: result.nextTask.id, 
                worker_id: workerId, 
                joined_at: new Date() 
            });
            result.nextTask.status = 'RUNNING';
            result.nextTask.started_at = new Date();
            await result.nextTask.save();
        }

        res.status(200).json({ success: true, task: result.task, nextTask: result.nextTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Join a joint task
export const joinTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;

        const task = await BatchProductTask.findByPk(taskId);
        if (!task) return res.status(404).json({ success: false });

        const activeAssignments = await TaskWorkerAssignment.findAll({ where: { task_id: taskId, left_at: null } });
        const oldWorkerCount = activeAssignments.length;

        // Check if already joined
        if (activeAssignments.some(a => a.worker_id === workerId)) {
            return res.status(400).json({ success: false, message: "Already joined" });
        }

        // Join
        await TaskWorkerAssignment.create({ task_id: taskId, worker_id: workerId, joined_at: new Date() });
        const newWorkerCount = oldWorkerCount + 1;

        // Recalculate remaining time
        if (task.status === 'RUNNING') {
            // First update remaining_seconds based on elapsed time with oldWorkerCount
            const now = new Date();
            const elapsedRealSeconds = Math.floor((now.getTime() - new Date(task.started_at).getTime()) / 1000);
            const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;
            let currentRemaining = task.remaining_seconds - (oldWorkerCount > 0 ? Math.floor(effectiveElapsed / oldWorkerCount) : 0);
            if (currentRemaining < 0) currentRemaining = 0;

            task.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);
            task.started_at = now; // reset start time for the new speed
            await task.save();
        }

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Trigger alarm (mocking timer hit zero)
export const triggerAlarm = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await BatchProductTask.findByPk(taskId);
        if (task && task.status === 'RUNNING') {
            task.status = 'ALARM';
            task.alarm_fired_at = new Date();
            task.remaining_seconds = 0;
            await task.save();
        }
        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sync current task state
export const syncTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
