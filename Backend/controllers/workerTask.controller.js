import { Op } from 'sequelize';
import {
    Batch, BatchProductDemand, BatchProductTask, TaskWorkerAssignment,
    Product, User, DeliverySchedule, DeliveryItem, RetailOrder, RetailOrderItem,
    PurchaseLog
} from '../models/index.js';
import {
    calculateTotalProductTime, calculateWeighingDuration, calculateSoakingDuration,
    calculateCuttingDuration, calculateDryingDuration, recalculateDryingDuration, recalculateRemainingTime, calculateElapsedRealSeconds
} from '../utils/taskMath.js';
import { computeBatchDemandHelper } from './batch.controller.js';

// Get available batches for today
export const getTodayBatches = async (req, res) => {
    try {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 330); // IST Offset
        const today = now.toISOString().split('T')[0];
        const batches = await Batch.findAll({
            where: { status: 'active', is_deleted: false }
        });
        res.status(200).json({ success: true, batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Handle when a worker leaves all hands-on tasks
const leaveTaskHelper = async (workerId) => {
    // Find ALL active assignments for the worker
    const assignments = await TaskWorkerAssignment.findAll({
        where: { worker_id: workerId, left_at: null },
        include: [{ model: BatchProductTask, as: 'task' }]
    });

    for (const assignment of assignments) {
        if (!assignment || !assignment.task) continue;
        const task = assignment.task;

        // Only hands-on tasks should be "left"
        const isBackground = task.stage === 'SOAKING' || (task.stage === 'DRYING' && (!task.drying_mode || task.drying_mode === 'machine'));
        
        if (isBackground) {
            continue; // Keep doing background tasks
        }

        if (['RUNNING', 'PAUSED'].includes(task.status)) {
            const activeAssignments = await TaskWorkerAssignment.findAll({ where: { task_id: task.id, left_at: null } });
            const oldWorkerCount = activeAssignments.length;
            const newWorkerCount = oldWorkerCount - 1;

            assignment.left_at = new Date();
            await assignment.save();

            // Recalculate time if it was running or not started and there's a change in worker count
            if (['RUNNING', 'PAUSED', 'NOT_STARTED'].includes(task.status)) {
                let currentRemaining = task.remaining_seconds;
                if (task.status === 'RUNNING' && oldWorkerCount > 0) {
                    const elapsedRealSeconds = calculateElapsedRealSeconds(task.started_at);
                    const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;
                    currentRemaining = task.remaining_seconds - Math.floor(effectiveElapsed / oldWorkerCount);
                    if (currentRemaining < 0) currentRemaining = 0;
                    task.started_at = new Date(); // reset start time for the new speed
                }
                task.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);
                await task.save();
            }
        } else {
            // Just leave if it's NOT_STARTED
            assignment.left_at = new Date();
            await assignment.save();
        }
    }
};

// Helper: Check for conflicting hands-on tasks for a worker
const checkForConflictingHandsOnTasks = async (workerId, excludeTaskId = null) => {
    const whereClause = { worker_id: workerId, left_at: null };
    if (excludeTaskId) {
        whereClause.task_id = { [Op.ne]: excludeTaskId };
    }
    
    const activeAssignments = await TaskWorkerAssignment.findAll({
        where: whereClause,
        include: [{ model: BatchProductTask, as: 'task', include: [{ model: Product }] }]
    });

    const conflictingTasks = activeAssignments.filter(a => {
        const t = a.task;
        if (!t) return false;
        const isBackground = t.stage === 'SOAKING' || (t.stage === 'DRYING' && (!t.drying_mode || t.drying_mode === 'machine'));
        return !isBackground && ['RUNNING', 'PAUSED'].includes(t.status);
    });

    return conflictingTasks;
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
const syncMutex = new Mutex();

const syncBatchDemand = async (batchId) => {
    await syncMutex.lock();
    try {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 330); // IST Offset
        const today = now.toISOString().split('T')[0];

        // Compute demandMap using the exact same logic as Admin Dashboard
        const demandMapObj = await computeBatchDemandHelper(batchId, today);
        const demandMap = {};
        Object.keys(demandMapObj).forEach(k => {
            demandMap[k] = demandMapObj[k].total_quantity;
        });

        // Clear old demands for this batch to remove products that no longer have demand today
        await BatchProductDemand.destroy({ where: { batch_id: batchId } });

        // Fetch Purchase Logs for today to only show products actually purchased
        const startOfToday = new Date();
        startOfToday.setMinutes(startOfToday.getMinutes() + 330);
        startOfToday.setUTCHours(0, 0, 0, 0);
        startOfToday.setMinutes(startOfToday.getMinutes() - 330);

        const endOfToday = new Date();
        endOfToday.setMinutes(endOfToday.getMinutes() + 330);
        endOfToday.setUTCHours(23, 59, 59, 999);
        endOfToday.setMinutes(endOfToday.getMinutes() - 330);

        const purchases = await PurchaseLog.findAll({
            where: { purchase_date: { [Op.between]: [startOfToday, endOfToday] } },
            attributes: ['product_id']
        });
        const purchasedProductIds = new Set(purchases.map(p => parseInt(p.product_id)));

        // Fetch product categories to always allow water
        const products = await Product.findAll({
            where: { id: Object.keys(demandMap) },
            attributes: ['id', 'category']
        });
        const productCategories = {};
        products.forEach(p => productCategories[p.id] = p.category);

        for (const [productId, qty] of Object.entries(demandMap)) {
            const pId = parseInt(productId);
            const isWater = productCategories[pId] === 'water';

            if (qty > 0 && (isWater || purchasedProductIds.has(pId))) {
                await BatchProductDemand.create({ batch_id: batchId, product_id: pId, quantity_grams: qty });
            }
        }
    } finally {
        syncMutex.unlock();
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

        // Filter out 'Alkaline' products from worker dashboard
        demands = demands.filter(d => d.Product && !d.Product.name.toLowerCase().includes('alkaline'));

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

        const startOfToday = new Date();
        startOfToday.setMinutes(startOfToday.getMinutes() + 330);
        startOfToday.setUTCHours(0, 0, 0, 0);
        startOfToday.setMinutes(startOfToday.getMinutes() - 330);

        const alarmTasks = await BatchProductTask.findAll({
            where: {
                batch_id: batchId,
                status: 'ALARM',
                created_at: { [Op.gte]: startOfToday }
            },
            include: [
                { model: Product },
                {
                    model: TaskWorkerAssignment,
                    as: 'worker_assignments',
                    where: { worker_id: workerId, left_at: null }
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

// Get all active tasks for the current worker
export const getMyActiveTasks = async (req, res) => {
    try {
        const workerId = req.user.id;

        const tasks = await BatchProductTask.findAll({
            where: { status: { [Op.in]: ['RUNNING', 'PAUSED', 'ALARM'] } },
            include: [
                { model: Product },
                {
                    model: TaskWorkerAssignment,
                    as: 'worker_assignments',
                    where: { worker_id: workerId, left_at: null },
                    required: true
                }
            ]
        });

        res.status(200).json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

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
        let demands = await BatchProductDemand.findAll({
            where: { batch_id: batchId },
            include: [{ model: Product }]
        });

        // Filter out 'Alkaline' products from worker dashboard assignments
        demands = demands.filter(d => d.Product && !d.Product.name.toLowerCase().includes('alkaline'));

        if (!demands.length) {
            return res.status(200).json({ success: true, task: null, message: "No demand for this batch" });
        }

        // Get all tasks for this batch today
        const startOfTodayForTasks = new Date();
        startOfTodayForTasks.setMinutes(startOfTodayForTasks.getMinutes() + 330);
        startOfTodayForTasks.setUTCHours(0, 0, 0, 0);
        startOfTodayForTasks.setMinutes(startOfTodayForTasks.getMinutes() - 330);

        const tasks = await BatchProductTask.findAll({
            where: {
                batch_id: batchId,
                created_at: { [Op.gte]: startOfTodayForTasks }
            },
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
            const isManualDrying = taskToReturn && taskToReturn.stage === 'DRYING' && ['piece', 'gram'].includes(taskToReturn.drying_mode);
            if (taskToReturn && (['WEIGHING', 'CUTTING', 'BUCKET_ARRANGE'].includes(taskToReturn.stage) || isManualDrying)) {
                const existing = await TaskWorkerAssignment.findOne({ where: { task_id: taskToReturn.id, worker_id: workerId, left_at: null } });
                if (!existing) {
                    const activeAssignments = await TaskWorkerAssignment.findAll({ where: { task_id: taskToReturn.id, left_at: null } });
                    const oldWorkerCount = activeAssignments.length;
                    const newWorkerCount = oldWorkerCount + 1;

                    await TaskWorkerAssignment.create({ task_id: taskToReturn.id, worker_id: workerId, joined_at: new Date() });

                    // Recalculate time if it was running or not started and there's a change in worker count
                    if (['RUNNING', 'PAUSED', 'NOT_STARTED'].includes(taskToReturn.status)) {
                        let currentRemaining = taskToReturn.remaining_seconds;
                        if (taskToReturn.status === 'RUNNING' && oldWorkerCount > 0) {
                            const now = new Date();
                            const elapsedRealSeconds = Math.floor((now.getTime() - new Date(taskToReturn.started_at).getTime()) / 1000);
                            const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;
                            currentRemaining = taskToReturn.remaining_seconds - Math.floor(effectiveElapsed / oldWorkerCount);
                            if (currentRemaining < 0) currentRemaining = 0;
                            taskToReturn.started_at = new Date(); // reset start time for the new speed
                        }
                        taskToReturn.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);
                        await taskToReturn.save();
                    }
                }
            }
            return res.status(200).json({ success: true, task: taskToReturn, action });
        };

        // Check if all batch processing is complete
        // 1. Have all demands been weighed (i.e. entered the pipeline)?
        const unweighedProductsForCheck = demands.filter(d => {
            const processedQty = getProcessedQuantity(d.product_id, 'WEIGHING');
            return processedQty < parseFloat(d.quantity_grams);
        });

        // 2. Are there any active tasks still in the pipeline?
        const activePipelineTasks = tasks.filter(t =>
            ['WEIGHING', 'SOAKING', 'CUTTING', 'DRYING'].includes(t.stage) &&
            ['NOT_STARTED', 'RUNNING', 'PAUSED'].includes(t.status)
        );

        const isBatchProcessingComplete = demands.length > 0 &&
            unweighedProductsForCheck.length === 0 &&
            activePipelineTasks.length === 0;

        if (isBatchProcessingComplete) {
            // Check if BUCKET_ARRANGE tasks already exist
            const bucketArrangeTasks = tasks.filter(t => t.stage === 'BUCKET_ARRANGE');
            if (bucketArrangeTasks.length === 0) {
                // Get all retail orders for this batch to count users per product
                const retailOrders = await RetailOrder.findAll({
                    where: { batch_id: batchId },
                    include: [{ model: RetailOrderItem, as: 'Items' }]
                });

                // Generate BUCKET_ARRANGE task for each demanded product
                for (const d of demands) {
                    // Count how many users ordered this product
                    let userCount = 0;
                    for (const ro of retailOrders) {
                        const hasProduct = ro.Items.some(item => item.product_id === d.product_id);
                        if (hasProduct) userCount++;
                    }
                    if (userCount === 0) userCount = 1; // Fallback

                    const baseTime = d.Product ? (d.Product.weighing_time_seconds || 30) : 30;
                    const totalDuration = baseTime * userCount;

                    const newTask = await BatchProductTask.create({
                        batch_id: batchId,
                        product_id: d.product_id,
                        stage: 'BUCKET_ARRANGE',
                        quantity_grams: d.quantity_grams,
                        status: 'NOT_STARTED',
                        duration_seconds: totalDuration,
                        remaining_seconds: totalDuration
                    });
                    const loadedTask = await BatchProductTask.findByPk(newTask.id, { 
                        include: [
                            { model: Product },
                            { model: TaskWorkerAssignment, as: 'worker_assignments', required: false }
                        ] 
                    });
                    tasks.push(loadedTask);
                }
            }
        }

        // Priority -1: My Unacknowledged ALARMs?
        const myAlarmTasks = tasks.filter(t => t.status === 'ALARM' && t.worker_assignments.some(a => a.worker_id === workerId));
        if (myAlarmTasks.length > 0) {
            return await returnTask(myAlarmTasks[0], 'CONTINUE_TASK');
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
        // If the entire batch is complete, BUCKET_ARRANGE is also allowed
        const stagePriority = { BUCKET_ARRANGE: 4, DRYING: 3, CUTTING: 2, SOAKING: 1, WEIGHING: 0 };
        const allowedStages = ['SOAKING', 'CUTTING', 'DRYING'];
        if (isBatchProcessingComplete) {
            allowedStages.push('BUCKET_ARRANGE');
        }

        const notStartedPipelineTasks = tasks.filter(t =>
            t.status === 'NOT_STARTED' && allowedStages.includes(t.stage) &&
            t.worker_assignments.length === 0
        ).sort((a, b) => stagePriority[b.stage] - stagePriority[a.stage]);

        if (notStartedPipelineTasks.length > 0) {
            return await returnTask(notStartedPipelineTasks[0], 'NEW_TASK');
        }

        // Priority 2: Start new WEIGHING task (Unweighed product available?)
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

        // Priority 3: Join active work (CUTTING and Manual DRYING only. WEIGHING strictly allows only ONE worker)
        const activeHandsOnTasks = tasks.filter(t => {
            const isManualDrying = t.stage === 'DRYING' && ['piece', 'gram'].includes(t.drying_mode);
            if (!['WEIGHING', 'CUTTING'].includes(t.stage) && !isManualDrying) return false;

            if (!['RUNNING', 'PAUSED', 'NOT_STARTED'].includes(t.status)) return false;

            // Strict rule: Weighing cannot be helped by a second worker
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

        // Priority 4: Resume a PAUSED background task (SOAKING/DRYING) assigned to this worker
        // This happens when all other work is done but some background tasks are PAUSED,
        // blocking BUCKET_ARRANGE. We return them so the worker can resume normally via timer.
        const myPausedBackgroundTasks = tasks.filter(t =>
            t.status === 'PAUSED' &&
            ['SOAKING', 'DRYING'].includes(t.stage) &&
            t.worker_assignments.some(a => a.worker_id === workerId)
        ).sort((a, b) => a.remaining_seconds - b.remaining_seconds); // shortest first

        if (myPausedBackgroundTasks.length > 0) {
            return await returnTask(myPausedBackgroundTasks[0], 'RESUME_TASK');
        }

        // Idle - truly nothing left to do
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

        const isBackground = task.stage === 'SOAKING' || (task.stage === 'DRYING' && (!req.body.drying_mode || req.body.drying_mode === 'machine'));
        const isHandsOn = !isBackground;

        if (isHandsOn) {
            const conflictingTasks = await checkForConflictingHandsOnTasks(workerId, taskId);
            
            if (conflictingTasks.length > 0) {
                if (!req.body.forceLeaveOther) {
                    const ct = conflictingTasks[0].task;
                    return res.status(200).json({
                        success: false,
                        conflict: true,
                        conflictMessage: `You are already working on ${ct.Product.name} - ${ct.stage}. Do you want to leave that task to start this one?`
                    });
                } else {
                    await leaveTaskHelper(workerId);
                }
            }
        }

        if (task.status === 'NOT_STARTED') {
            task.status = 'RUNNING';
            task.started_at = new Date();
            if (task.stage === 'DRYING' && req.body.drying_mode) {
                task.drying_mode = req.body.drying_mode;
                if (['piece', 'gram'].includes(req.body.drying_mode)) {
                    const newDuration = recalculateDryingDuration(task.Product, task.quantity_grams, req.body.drying_mode);
                    task.duration_seconds = newDuration;
                    task.remaining_seconds = newDuration;
                }
            }
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
        while (nextStage) {
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

// Pause a stage (interrupt/leave)
export const pauseTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;

        const task = await BatchProductTask.findByPk(taskId);
        if (!task || task.status !== 'RUNNING') return res.status(400).json({ success: false, message: "Invalid state for pause" });

        const assignment = await TaskWorkerAssignment.findOne({
            where: { task_id: taskId, worker_id: workerId, left_at: null }
        });

        if (!assignment) {
            return res.status(400).json({ success: false, message: "Worker not assigned to this task" });
        }

        const activeAssignments = await TaskWorkerAssignment.findAll({ where: { task_id: taskId, left_at: null } });
        const oldWorkerCount = activeAssignments.length;
        const newWorkerCount = oldWorkerCount - 1;

        assignment.left_at = new Date();
        await assignment.save();

        const elapsedRealSeconds = calculateElapsedRealSeconds(task.started_at);
        const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;

        let currentRemaining = task.remaining_seconds - (oldWorkerCount > 0 ? Math.floor(effectiveElapsed / oldWorkerCount) : 0);
        if (currentRemaining < 0) currentRemaining = 0;

        task.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);

        if (newWorkerCount === 0) {
            task.status = 'PAUSED';
            task.paused_at = new Date();
        } else {
            task.started_at = new Date(); // reset start time for the new speed
        }

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
        const workerId = req.user.id;

        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        if (!task) return res.status(404).json({ success: false });

        const result = await handleStageCompletion(task);

        // If there's a next task for this product, assign it to the worker who completed this stage
        if (result.nextTask && result.nextTask.status === 'NOT_STARTED') {
            await TaskWorkerAssignment.create({
                task_id: result.nextTask.id,
                worker_id: workerId,
                joined_at: new Date()
            });
        }

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

        if (task.status !== 'ALARM' && task.status !== 'RUNNING') {
            return res.status(400).json({ success: false, message: "Task not in alarm or running" });
        }

        // Complete the alarm task and get next task
        const result = await handleStageCompletion(task);

        // Check if the worker is currently busy with ANOTHER hands-on task
        const conflictingTasks = await checkForConflictingHandsOnTasks(workerId, taskId);
        const isBusy = conflictingTasks.length > 0;

        if (!isBusy) {
            // Option B: Auto-Switch. Leave any other tasks (if any)
            await leaveTaskHelper(workerId);

            // Automatically assign the worker to the newly created next task
            if (result.nextTask && result.nextTask.status === 'NOT_STARTED') {
                await TaskWorkerAssignment.create({
                    task_id: result.nextTask.id,
                    worker_id: workerId,
                    joined_at: new Date()
                });
            }
            res.status(200).json({ success: true, task: result.task, nextTask: result.nextTask });
        } else {
            // Worker is busy with another hands-on task!
            // Do NOT leave their current task. Do NOT assign them to the new task.
            // Just return success without a nextTask, so the frontend stays on the dashboard/keeps their current task running.
            res.status(200).json({ success: true, task: result.task, nextTask: null });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Join a joint task
export const joinTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;


        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        if (!task) return res.status(404).json({ success: false });

        const isBackground = task.stage === 'SOAKING' || (task.stage === 'DRYING' && (!task.drying_mode || task.drying_mode === 'machine'));
        const isHandsOn = !isBackground;

        if (isHandsOn) {
            const conflictingTasks = await checkForConflictingHandsOnTasks(workerId, taskId);
            if (conflictingTasks.length > 0) {
                if (!req.body.forceLeaveOther) {
                    const ct = conflictingTasks[0].task;
                    return res.status(200).json({
                        success: false,
                        conflict: true,
                        conflictMessage: `You are already working on ${ct.Product.name} - ${ct.stage}. Do you want to leave that task to join this one?`
                    });
                } else {
                    await leaveTaskHelper(workerId);
                }
            }
        }

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
        if (['RUNNING', 'PAUSED', 'NOT_STARTED'].includes(task.status)) {
            let currentRemaining = task.remaining_seconds;
            if (task.status === 'RUNNING') {
                const elapsedRealSeconds = calculateElapsedRealSeconds(task.started_at);
                const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;
                currentRemaining = task.remaining_seconds - (oldWorkerCount > 0 ? Math.floor(effectiveElapsed / oldWorkerCount) : 0);
                if (currentRemaining < 0) currentRemaining = 0;
                task.started_at = new Date(); // reset start time for the new speed
            }
            task.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);
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

// Get buckets for a BUCKET_ARRANGE task
export const getTaskBuckets = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await BatchProductTask.findByPk(taskId, {
            include: [{ model: Batch }]
        });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        // Use today's date to match syncBatchDemand logic
        const date = new Date().toISOString().split('T')[0];

        const demandMap = await computeBatchDemandHelper(task.batch_id, date);
        const productDemand = demandMap[task.product_id];

        let buckets = [];
        if (productDemand && productDemand.usersMap) {
            buckets = Object.values(productDemand.usersMap)
                .filter(b => b.quantity > 0)
                .sort((a, b) => a.sortId - b.sortId);
        }

        res.status(200).json({ success: true, buckets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get stuck tasks (PAUSED or NOT_STARTED) assigned to the current worker
// These tasks are blocking the pipeline (e.g. preventing BUCKET_ARRANGE from starting)
export const getStuckTasks = async (req, res) => {
    try {
        const workerId = req.user.id;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const stuckTasks = await BatchProductTask.findAll({
            where: {
                status: { [Op.in]: ['PAUSED', 'NOT_STARTED'] },
                stage: { [Op.in]: ['WEIGHING', 'SOAKING', 'CUTTING', 'DRYING'] } // pipeline stages only
            },
            include: [
                { model: Product },
                {
                    model: TaskWorkerAssignment,
                    as: 'worker_assignments',
                    where: { worker_id: workerId }, // removed left_at: null so it catches past assignments too
                    required: true
                }
            ]
        });

        res.status(200).json({ success: true, tasks: stuckTasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Force complete a stuck task (PAUSED or NOT_STARTED) from dashboard
// This is the app equivalent of running the manual SQL UPDATE
export const forceCompleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;

        const task = await BatchProductTask.findByPk(taskId, { include: [{ model: Product }] });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        // Safety: only allow PAUSED or NOT_STARTED tasks
        if (!['PAUSED', 'NOT_STARTED'].includes(task.status)) {
            return res.status(400).json({
                success: false,
                message: `Task is in '${task.status}' status. Only PAUSED or NOT_STARTED tasks can be force-completed.`
            });
        }

        // Safety: worker must be assigned to this task
        const assignment = await TaskWorkerAssignment.findOne({
            where: { task_id: taskId, worker_id: workerId, left_at: null }
        });
        if (!assignment) {
            return res.status(403).json({ success: false, message: "You are not assigned to this task." });
        }

        // Complete it and create next stage task (same logic as completeTask/acknowledgeAlarm)
        const result = await handleStageCompletion(task);

        // Auto-assign worker to next task if one was created
        if (result.nextTask && result.nextTask.status === 'NOT_STARTED') {
            await TaskWorkerAssignment.create({
                task_id: result.nextTask.id,
                worker_id: workerId,
                joined_at: new Date()
            });
        }

        res.status(200).json({
            success: true,
            task: result.task,
            nextTask: result.nextTask,
            message: `Task force-completed. ${result.nextTask ? `Next stage: ${result.nextTask.stage}` : 'No further stages.'}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get the task history of the current worker for today
export const getMyTaskHistory = async (req, res) => {
    try {
        const workerId = req.user.id;
        const startOfToday = new Date();
        startOfToday.setMinutes(startOfToday.getMinutes() + 330);
        startOfToday.setUTCHours(0, 0, 0, 0);
        startOfToday.setMinutes(startOfToday.getMinutes() - 330);

        const assignments = await TaskWorkerAssignment.findAll({
            where: {
                worker_id: workerId,
                joined_at: { [Op.gte]: startOfToday }
            },
            include: [{
                model: BatchProductTask,
                as: 'task',
                include: [{ model: Product }]
            }],
            order: [['joined_at', 'ASC']]
        });

        // Group by product
        const productMap = {};
        assignments.forEach(a => {
            const t = a.task;
            if (!t || !t.Product) return;
            const pid = t.product_id;
            if (!productMap[pid]) {
                productMap[pid] = {
                    product_id: pid,
                    productName: t.Product.name,
                    stages: {}
                };
            }

            // Map stage and status. 
            // RUNNING/ALARM/PAUSED -> active (orange)
            // DONE -> completed (green)
            let stageStatus = 'active';
            if (t.status === 'DONE') stageStatus = 'completed';

            // If it's already completed in the map, don't downgrade it back to active if they joined a later sub-task for same stage
            if (productMap[pid].stages[t.stage] !== 'completed') {
                productMap[pid].stages[t.stage] = stageStatus;
            }
        });

        const history = Object.values(productMap);
        res.status(200).json({ success: true, history });
    } catch (error) {
        console.error("getMyTaskHistory Error:", error);
        res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
};

