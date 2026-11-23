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
import { computeBatchDemandHelper, invalidateBatchDemandCache } from './batch.controller.js';

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

// Helper: Check if stage allows multiple workers (Joint / Helper)
// Rule: ONLY CUTTING and manual DRYING (piece or gram) allow multiple workers!
// WEIGHING, SOAKING, machine DRYING, and BUCKET_ARRANGE strictly allow only ONE worker!
export const isJointAllowed = (task) => {
    if (!task) return false;
    if (task.stage === 'CUTTING') return true;
    if (task.stage === 'DRYING' && ['piece', 'gram'].includes(task.drying_mode)) return true;
    return false;
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
const batchDemandSyncTimestamps = new Map();
const BATCH_SYNC_TTL = 90 * 1000; // 90 seconds TTL to eliminate repetitive recalculations on every assign call

export const invalidateBatchDemandSync = (batchId = null) => {
    if (batchId) {
        batchDemandSyncTimestamps.delete(parseInt(batchId));
    } else {
        batchDemandSyncTimestamps.clear();
    }
};

export const syncBatchDemand = async (batchId, options = {}) => {
    const numBatchId = parseInt(batchId);
    // Fast path: if not forced and synced within last 90s, skip entirely
    if (!options.force && batchDemandSyncTimestamps.has(numBatchId)) {
        const lastSync = batchDemandSyncTimestamps.get(numBatchId);
        if (Date.now() - lastSync < BATCH_SYNC_TTL) {
            return;
        }
    }

    await syncMutex.lock();
    try {
        // Double-check after acquiring lock
        if (!options.force && batchDemandSyncTimestamps.has(numBatchId)) {
            const lastSync = batchDemandSyncTimestamps.get(numBatchId);
            if (Date.now() - lastSync < BATCH_SYNC_TTL) {
                return;
            }
        }

        const now = new Date();
        now.setMinutes(now.getMinutes() + 330); // IST Offset
        const today = now.toISOString().split('T')[0];

        // Compute demandMap using the exact same logic as Admin Dashboard (with cache support)
        const demandMapObj = await computeBatchDemandHelper(batchId, today, { bypassCache: options.force || false });
        const demandMap = {};
        Object.keys(demandMapObj).forEach(k => {
            demandMap[k] = demandMapObj[k].total_quantity;
        });

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
        const productIds = Object.keys(demandMap);
        const products = productIds.length > 0 ? await Product.findAll({
            where: { id: productIds },
            attributes: ['id', 'category', 'weighing_time_seconds']
        }) : [];
        const productCategories = {};
        products.forEach(p => productCategories[p.id] = p.category);

        const demandsToCreate = [];
        for (const [productId, qty] of Object.entries(demandMap)) {
            const pId = parseInt(productId);
            const isWater = productCategories[pId] === 'water';

            if (qty > 0 && (isWater || purchasedProductIds.has(pId))) {
                demandsToCreate.push({
                    batch_id: batchId,
                    product_id: pId,
                    quantity_grams: qty
                });
            }
        }

        // Fast atomic bulk replace in 1 DB operation instead of 25 sequential creates
        await BatchProductDemand.destroy({ where: { batch_id: batchId } });
        if (demandsToCreate.length > 0) {
            await BatchProductDemand.bulkCreate(demandsToCreate);

            // PRE-CREATE WEIGHING TASKS for all demanded non-water products!
            // When admin submits purchase log, WEIGHING tasks become INSTANTLY ready for workers without delay
            try {
                const existingTasks = await BatchProductTask.findAll({
                    where: {
                        batch_id: batchId,
                        stage: 'WEIGHING',
                        created_at: { [Op.gte]: startOfToday }
                    },
                    attributes: ['product_id']
                });
                const existingTaskProductIds = new Set(existingTasks.map(t => t.product_id));

                const weighingTasksToCreate = [];
                for (const d of demandsToCreate) {
                    if (productCategories[d.product_id] === 'water') continue;
                    if (!existingTaskProductIds.has(d.product_id)) {
                        const prodObj = products.find(p => p.id === d.product_id);
                        const duration = calculateWeighingDuration(prodObj);
                        weighingTasksToCreate.push({
                            batch_id: batchId,
                            product_id: d.product_id,
                            stage: 'WEIGHING',
                            quantity_grams: d.quantity_grams,
                            status: 'NOT_STARTED',
                            duration_seconds: duration,
                            remaining_seconds: duration
                        });
                    }
                }

                if (weighingTasksToCreate.length > 0) {
                    await BatchProductTask.bulkCreate(weighingTasksToCreate);
                }
            } catch (taskErr) {
                console.error("Pre-create WEIGHING tasks error in syncBatchDemand:", taskErr);
            }
        }

        batchDemandSyncTimestamps.set(numBatchId, Date.now());
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
            include: [{ model: Product, attributes: ['id', 'name', 'hindi_name'] }]
        });

        // Filter out 'Alkaline' products from worker dashboard
        demands = demands.filter(d => d.Product && !d.Product.name.toLowerCase().includes('alkaline'));

        const aggregated = {};
        for (const d of demands) {
            if (!aggregated[d.product_id]) {
                aggregated[d.product_id] = {
                    productId: d.product_id,
                    productName: d.Product ? d.Product.name : 'Unknown',
                    productHindiName: d.Product ? d.Product.hindi_name : '',
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

        // Also check if any joint task has a pending completion request for this worker to review
        const pendingPromptTask = await BatchProductTask.findOne({
            where: {
                batch_id: batchId,
                status: { [Op.in]: ['RUNNING', 'PAUSED'] },
                completion_requested_by: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: workerId }] },
                created_at: { [Op.gte]: startOfToday }
            },
            include: [
                { model: Product },
                { model: User, as: 'completion_requester', attributes: ['id', 'name'] },
                {
                    model: TaskWorkerAssignment,
                    as: 'worker_assignments',
                    where: { worker_id: workerId, left_at: null }
                }
            ]
        });

        let completionPrompt = null;
        if (pendingPromptTask) {
            completionPrompt = {
                taskId: pendingPromptTask.id,
                stage: pendingPromptTask.stage,
                productName: pendingPromptTask.Product?.name,
                requestedByWorkerId: pendingPromptTask.completion_requested_by,
                requestedByWorkerName: pendingPromptTask.completion_requester?.name || 'Partner Worker',
                message: `${pendingPromptTask.completion_requester?.name || 'Partner Worker'} ne kam ko complete kar diya hai. Kya ye kam poora ho gaya hai?`
            };
        }

        return res.status(200).json({ success: true, task: null, completion_prompt: completionPrompt });
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

        // Filter out 'Alkaline' and Water products from worker dashboard assignments
        demands = demands.filter(d => {
            if (!d.Product) return false;
            const cat = (d.Product.category || '').toLowerCase();
            const name = (d.Product.name || '').toLowerCase();
            return cat !== 'water' && !name.includes('water') && !name.includes('alkaline');
        });

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
            // NEVER assign or return an already completed task
            if (!taskToReturn || taskToReturn.status === 'DONE') {
                return res.status(200).json({ success: true, task: null, action: 'IDLE' });
            }

            const allowsMultiple = isJointAllowed(taskToReturn);
            const isManualDrying = taskToReturn.stage === 'DRYING' && ['piece', 'gram'].includes(taskToReturn.drying_mode);
            const isHandsOn = ['WEIGHING', 'CUTTING', 'BUCKET_ARRANGE'].includes(taskToReturn.stage) || isManualDrying;

            // STRICT SINGLE-WORKER ENFORCEMENT:
            // If this task does NOT allow multiple workers (WEIGHING, SOAKING, machine DRYING, BUCKET_ARRANGE):
            // Check if ANY OTHER worker is already assigned to this task:
            if (!allowsMultiple) {
                const otherAssignments = await TaskWorkerAssignment.findAll({
                    where: { task_id: taskToReturn.id, worker_id: { [Op.ne]: workerId } }
                });

                if (otherAssignments.length > 0) {
                    const otherActive = otherAssignments.filter(a => a.left_at === null);
                    if (otherActive.length > 0) {
                        // If task is RUNNING or PAUSED with another worker, NEVER assign this worker!
                        if (['RUNNING', 'PAUSED'].includes(taskToReturn.status)) {
                            console.warn(`[SINGLE WORKER GUARD] Task ${taskToReturn.id} (${taskToReturn.stage}) is already active with worker ${otherActive[0].worker_id}. Cannot assign worker ${workerId}.`);
                            return res.status(200).json({ success: true, task: null, action: 'IDLE' });
                        }
                        // If task is NOT_STARTED and we are reassigning it, close other worker's assignment so only 1 worker has it
                        await TaskWorkerAssignment.update(
                            { left_at: new Date() },
                            { where: { task_id: taskToReturn.id, left_at: null, worker_id: { [Op.ne]: workerId } } }
                        );
                    } else if (taskToReturn.status === 'DONE' || taskToReturn.started_at !== null) {
                        // If another worker has already started or completed this single-worker task, NEVER reassign!
                        console.warn(`[SINGLE WORKER GUARD] Task ${taskToReturn.id} (${taskToReturn.stage}) was already worked on by another worker. Cannot assign worker ${workerId}.`);
                        return res.status(200).json({ success: true, task: null, action: 'IDLE' });
                    }
                }
            }

            if (isHandsOn) {
                const existing = await TaskWorkerAssignment.findOne({ where: { task_id: taskToReturn.id, worker_id: workerId, left_at: null } });
                if (!existing) {
                    const activeAssignments = await TaskWorkerAssignment.findAll({ where: { task_id: taskToReturn.id, left_at: null } });

                    // Final safety guard: if single worker, oldWorkerCount must be 0!
                    if (!allowsMultiple && activeAssignments.length > 0) {
                        console.warn(`[SINGLE WORKER GUARD] Task ${taskToReturn.id} (${taskToReturn.stage}) already has active worker.`);
                        return res.status(200).json({ success: true, task: null, action: 'IDLE' });
                    }

                    const oldWorkerCount = activeAssignments.length;
                    const newWorkerCount = oldWorkerCount + 1;

                    await TaskWorkerAssignment.create({ task_id: taskToReturn.id, worker_id: workerId, joined_at: new Date() });

                    // Recalculate time ONLY if allowsMultiple (e.g. CUTTING, manual DRYING)
                    if (allowsMultiple && ['RUNNING', 'PAUSED'].includes(taskToReturn.status) && oldWorkerCount > 0) {
                        const now = new Date();
                        const elapsedRealSeconds = Math.floor((now.getTime() - new Date(taskToReturn.started_at).getTime()) / 1000);
                        const effectiveElapsed = elapsedRealSeconds * oldWorkerCount;
                        let currentRemaining = taskToReturn.remaining_seconds - Math.floor(effectiveElapsed / oldWorkerCount);
                        if (currentRemaining < 0) currentRemaining = 0;
                        taskToReturn.started_at = new Date();
                        taskToReturn.remaining_seconds = recalculateRemainingTime(currentRemaining, oldWorkerCount, newWorkerCount);
                        await taskToReturn.save();
                    }
                }
            } else if (['SOAKING', 'DRYING'].includes(taskToReturn.stage)) {
                // Background stage (machine drying / soaking) -> Strictly single worker!
                if (taskToReturn.status === 'NOT_STARTED') {
                    const existing = await TaskWorkerAssignment.findOne({ where: { task_id: taskToReturn.id, worker_id: workerId, left_at: null } });
                    if (!existing) {
                        await TaskWorkerAssignment.create({ task_id: taskToReturn.id, worker_id: workerId, joined_at: new Date() });
                    }
                }
            }
            return res.status(200).json({ success: true, task: taskToReturn, action });
        };

        // Check for any missing DRYING tasks for products that completed CUTTING
        for (const d of demands) {
            const cutTasks = tasks.filter(t => t.product_id === d.product_id && t.stage === 'CUTTING' && t.status === 'DONE');
            const dryTasks = tasks.filter(t => t.product_id === d.product_id && t.stage === 'DRYING');
            if (cutTasks.length > 0 && dryTasks.length === 0) {
                const product = d.Product;
                const dryDuration = calculateDryingDuration(product, d.quantity_grams);
                if (dryDuration > 0) {
                    const newDryTask = await BatchProductTask.create({
                        batch_id: batchId,
                        product_id: d.product_id,
                        stage: 'DRYING',
                        quantity_grams: d.quantity_grams,
                        status: 'NOT_STARTED',
                        duration_seconds: dryDuration,
                        remaining_seconds: dryDuration
                    });
                    newDryTask.Product = product;
                    newDryTask.worker_assignments = [];
                    tasks.push(newDryTask);
                }
            }
        }

        // Check if all batch processing is complete
        // 1. Have all vegetable demands had their WEIGHING task created (i.e. entered the pipeline)?
        const unweighedProductsForCheck = demands.filter(d => {
            return !tasks.some(t => t.product_id === d.product_id && t.stage === 'WEIGHING');
        });

        // 2. Are there any active tasks still in the pipeline?
        const activePipelineTasks = tasks.filter(t =>
            ['WEIGHING', 'SOAKING', 'CUTTING', 'DRYING'].includes(t.stage) &&
            ['NOT_STARTED', 'RUNNING', 'PAUSED', 'ALARM'].includes(t.status)
        );

        // 3. Every demanded product must have completed its final required pre-bucket stage (DRYING, CUTTING, or WEIGHING)
        const productsWithIncompleteFinalStage = demands.filter(d => {
            const product = d.Product;
            const dryDuration = calculateDryingDuration(product, d.quantity_grams);
            const cutDuration = calculateCuttingDuration(product, d.quantity_grams);
            const targetFinalStage = dryDuration > 0 ? 'DRYING' : (cutDuration > 0 ? 'CUTTING' : 'WEIGHING');
            const hasCompletedFinalStage = tasks.some(t =>
                t.product_id === d.product_id &&
                t.stage === targetFinalStage &&
                t.status === 'DONE'
            );
            return !hasCompletedFinalStage;
        });

        const isBatchProcessingComplete = demands.length > 0 &&
            unweighedProductsForCheck.length === 0 &&
            activePipelineTasks.length === 0 &&
            productsWithIncompleteFinalStage.length === 0;

        if (isBatchProcessingComplete) {
            // Find which demanded products do NOT yet have a BUCKET_ARRANGE task today
            const existingBucketProductIds = new Set(
                tasks.filter(t => t.stage === 'BUCKET_ARRANGE').map(t => t.product_id)
            );
            const missingDemandsForBucket = demands.filter(d => !existingBucketProductIds.has(d.product_id));

            if (missingDemandsForBucket.length > 0) {
                // Fetch demand map to get exact user counts (both subscription & retail)
                const now = new Date();
                now.setMinutes(now.getMinutes() + 330);
                const dateStr = now.toISOString().split('T')[0];
                const demandMap = await computeBatchDemandHelper(batchId, dateStr);

                // Generate BUCKET_ARRANGE task for each missing demanded vegetable
                const tasksToCreate = [];
                for (const d of missingDemandsForBucket) {
                    const prodDemand = demandMap ? demandMap[d.product_id] : null;
                    let userCount = prodDemand && prodDemand.usersMap ? Object.keys(prodDemand.usersMap).length : 0;
                    if (userCount === 0) userCount = 1; // Fallback

                    const baseTime = d.Product ? (d.Product.weighing_time_seconds || 30) : 30;
                    const totalDuration = baseTime * userCount;

                    tasksToCreate.push({
                        batch_id: batchId,
                        product_id: d.product_id,
                        stage: 'BUCKET_ARRANGE',
                        quantity_grams: d.quantity_grams,
                        status: 'NOT_STARTED',
                        duration_seconds: totalDuration,
                        remaining_seconds: totalDuration
                    });
                }

                if (tasksToCreate.length > 0) {
                    const createdBucketTasks = await BatchProductTask.bulkCreate(tasksToCreate);
                    const loadedTasks = await BatchProductTask.findAll({
                        where: { id: createdBucketTasks.map(t => t.id) },
                        include: [
                            { model: Product },
                            { model: TaskWorkerAssignment, as: 'worker_assignments', required: false }
                        ]
                    });
                    tasks.push(...loadedTasks);
                }
            }
        }

        // Priority -1: Handle any batch tasks in ALARM status
        // Background tasks (SOAKING, machine DRYING) in ALARM status have completed their timers!
        // Auto-complete them so their next stage tasks (CUTTING, DRYING) enter the pipeline immediately.
        const batchAlarmTasks = tasks.filter(t => t.status === 'ALARM');
        if (batchAlarmTasks.length > 0) {
            for (const at of batchAlarmTasks) {
                console.log(`[ASSIGN AUTO-ADVANCE] Auto-advancing ALARM task ${at.id} (${at.stage} - ${at.Product?.name}) to next stage.`);
                await handleStageCompletion(at);
            }
            // Reload tasks so newly created next stages are reflected
            tasks = await BatchProductTask.findAll({
                where: {
                    batch_id: batchId,
                    created_at: { [Op.gte]: startOfTodayForTasks }
                },
                include: [
                    { model: TaskWorkerAssignment, as: 'worker_assignments', where: { left_at: null }, required: false },
                    { model: Product }
                ]
            });
        }

        // Priority 0: Is the worker already assigned to an active HANDS-ON task, or an unstarted task?
        const myCurrentTask = tasks.find(t => {
            if (!t.worker_assignments.some(a => a.worker_id === workerId)) return false;

            // If it's a background task (SOAKING, DRYING), only return it if it's NOT_STARTED
            if (['SOAKING', 'DRYING'].includes(t.stage) && (!t.drying_mode || t.drying_mode === 'machine')) {
                return t.status === 'NOT_STARTED';
            }

            // If it's a hands-on task (WEIGHING, CUTTING, manual DRYING, BUCKET_ARRANGE), return it if it's active
            return ['NOT_STARTED', 'RUNNING', 'PAUSED'].includes(t.status);
        });
        if (myCurrentTask) {
            const hasPendingPipeline = tasks.some(t =>
                ['WEIGHING', 'SOAKING', 'CUTTING', 'DRYING'].includes(t.stage) &&
                t.status !== 'DONE'
            );
            if (myCurrentTask.stage === 'BUCKET_ARRANGE' && myCurrentTask.status === 'NOT_STARTED' && hasPendingPipeline) {
                await TaskWorkerAssignment.destroy({
                    where: { task_id: myCurrentTask.id, worker_id: workerId, left_at: null }
                });
            } else {
                return await returnTask(myCurrentTask, 'CONTINUE_TASK');
            }
        }

        // Priority 1: Pick up NOT_STARTED tasks (SOAKING, CUTTING, DRYING, WEIGHING, and BUCKET_ARRANGE if complete)
        const stagePriority = { BUCKET_ARRANGE: 4, DRYING: 3, CUTTING: 2, SOAKING: 1, WEIGHING: 0 };
        const allowedStages = ['SOAKING', 'CUTTING', 'DRYING', 'WEIGHING'];
        if (isBatchProcessingComplete) {
            allowedStages.push('BUCKET_ARRANGE');
        }

        const candidateTasks = tasks.filter(t =>
            t.status === 'NOT_STARTED' && allowedStages.includes(t.stage)
        );

        // 1A. First preference: completely unassigned tasks (no active worker)
        const unassignedTasks = candidateTasks.filter(t => t.worker_assignments.length === 0)
            .sort((a, b) => stagePriority[b.stage] - stagePriority[a.stage]);

        if (unassignedTasks.length > 0) {
            return await returnTask(unassignedTasks[0], 'NEW_TASK');
        }

        // 1B. Second preference: tasks assigned to another worker who HAS NOT started them
        // Strict safety rule:
        // Only reassign if the task is NOT_STARTED and the assigned worker has abandoned it for > 45 seconds!
        // NEVER reassign if assigned < 45 seconds ago (the worker is actively reading the screen / pressing Start).
        // NEVER allow 2 workers on single-worker tasks (WEIGHING, SOAKING, machine DRYING, BUCKET_ARRANGE).
        const nowMs = Date.now();
        const unstartedByOtherWorkers = candidateTasks.filter(t => {
            if (t.worker_assignments.length === 0) return false;
            const otherAssignment = t.worker_assignments.find(a => a.worker_id !== workerId);
            if (!otherAssignment) return false;

            const joinedAtMs = otherAssignment.joined_at ? new Date(otherAssignment.joined_at).getTime() : 0;
            const idleSeconds = (nowMs - joinedAtMs) / 1000;

            // Must be idle for at least 45 seconds without starting
            return idleSeconds > 45;
        }).sort((a, b) => stagePriority[b.stage] - stagePriority[a.stage]);

        if (unstartedByOtherWorkers.length > 0) {
            const taskToSteal = unstartedByOtherWorkers[0];
            console.log(`[TASK REASSIGN] Task ${taskToSteal.id} (${taskToSteal.stage}) was abandoned for >45s. Reassigning solely to worker ${workerId}`);
            // Free previous worker's assignment so ONLY the new worker gets it
            await TaskWorkerAssignment.update(
                { left_at: new Date() },
                { where: { task_id: taskToSteal.id, left_at: null } }
            );
            return await returnTask(taskToSteal, 'NEW_TASK');
        }

        // Priority 2: Start new WEIGHING task (Unweighed product available?)
        // In the kitchen pipeline, each vegetable is weighed ONCE in one shot for the batch demand.
        // If a WEIGHING task already exists for a product today, it has already been weighed!
        let unweighedProducts = demands.filter(d => {
            const alreadyHasWeighing = tasks.some(t => t.product_id === d.product_id && t.stage === 'WEIGHING');
            return !alreadyHasWeighing;
        });

        if (unweighedProducts.length > 0) {
            // Sort by total product time descending
            unweighedProducts.sort((a, b) => {
                const timeA = calculateTotalProductTime(a.Product, a.quantity_grams);
                const timeB = calculateTotalProductTime(b.Product, b.quantity_grams);
                return timeB - timeA; // Descending
            });

            const topProduct = unweighedProducts[0];
            const remainingQty = parseFloat(topProduct.quantity_grams);
            const duration = calculateWeighingDuration(topProduct.Product);

            // Check if WEIGHING task already exists in memory
            let newTask = tasks.find(t => t.product_id === topProduct.product_id && t.stage === 'WEIGHING');

            if (!newTask) {
                // Create WEIGHING task
                newTask = await BatchProductTask.create({
                    batch_id: batchId,
                    product_id: topProduct.product_id,
                    stage: 'WEIGHING',
                    quantity_grams: remainingQty,
                    status: 'NOT_STARTED',
                    duration_seconds: duration,
                    remaining_seconds: duration
                });
                newTask.Product = topProduct.Product;
                newTask.worker_assignments = [];
            }

            // Safety: never return an already DONE task
            if (newTask && newTask.status !== 'DONE') {
                return await returnTask(newTask, 'NEW_TASK');
            }
        }

        // Priority 3: Join active work (ONLY CUTTING and manual DRYING: piece/gram. NEVER WEIGHING, SOAKING, or machine DRYING!)
        const activeHandsOnTasks = tasks.filter(t => {
            if (!isJointAllowed(t)) return false;
            if (!['RUNNING', 'PAUSED'].includes(t.status)) return false;
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

        if (task.status === 'DONE') {
            return res.status(400).json({ success: false, message: "Task is already completed" });
        }

        const allowsMultiple = isJointAllowed(task);
        if (!allowsMultiple) {
            const activeOtherAssignments = await TaskWorkerAssignment.findAll({
                where: { task_id: taskId, worker_id: { [Op.ne]: workerId }, left_at: null }
            });
            if (activeOtherAssignments.length > 0 && ['RUNNING', 'PAUSED'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: `This ${task.stage} task is already active with another worker. Only 1 worker is allowed.`
                });
            }
        }

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
            // Also close any unstarted assignment by another worker
            await TaskWorkerAssignment.update(
                { left_at: new Date() },
                { where: { task_id: taskId, left_at: null, worker_id: { [Op.ne]: workerId } } }
            );

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

export const handleStageCompletion = async (task) => {
    // If task is already DONE, do not process again or create duplicate next tasks
    if (task.status === 'DONE') {
        return { task, nextTask: null };
    }

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
            else if (nextStage === 'DRYING') duration = calculateDryingDuration(product, task.quantity_grams);

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
            // Guard: Check if next stage task ALREADY exists for this batch and product today
            const startOfToday = new Date();
            startOfToday.setMinutes(startOfToday.getMinutes() + 330);
            startOfToday.setUTCHours(0, 0, 0, 0);
            startOfToday.setMinutes(startOfToday.getMinutes() - 330);

            const existingNextTask = await BatchProductTask.findOne({
                where: {
                    batch_id: task.batch_id,
                    product_id: task.product_id,
                    stage: nextStage,
                    created_at: { [Op.gte]: startOfToday }
                },
                include: [{ model: Product }]
            });

            if (existingNextTask) {
                console.log(`[STAGE TRANSITION] Next stage ${nextStage} for product ${task.product_id} already exists (task ${existingNextTask.id}), reusing.`);
                nextTask = existingNextTask;
            } else {
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

        const task = await BatchProductTask.findByPk(taskId, {
            include: [{ model: Product }]
        });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        // If already completed (e.g. double click), return immediately
        if (task.status === 'DONE') {
            return res.status(200).json({ success: true, status: 'DONE', task, message: "Task is already completed." });
        }

        // Check if this task is a joint task with multiple active workers
        const allowsJoint = isJointAllowed(task);
        const activeAssignments = await TaskWorkerAssignment.findAll({
            where: { task_id: taskId, left_at: null },
            include: [{ model: User, as: 'worker', attributes: ['id', 'name'] }]
        });

        // If joint task AND there are multiple active workers working together:
        if (allowsJoint && activeAssignments.length > 1) {
            // Did another worker already request completion?
            if (task.completion_requested_by && task.completion_requested_by !== workerId) {
                // Both workers have now confirmed completion! Complete the task!
                task.completion_requested_by = null;
                task.completion_requested_at = null;
                task.completion_rejected_by = null;
                task.completion_rejected_at = null;
                await task.save();

                const result = await handleStageCompletion(task);
                return res.status(200).json({
                    success: true,
                    status: 'DONE',
                    mutual_confirmed: true,
                    message: "Task completed successfully with mutual agreement from both workers.",
                    task: result.task,
                    nextTask: result.nextTask
                });
            }

            // Otherwise, this worker is requesting completion. Set pending request for the other worker(s) to confirm:
            task.completion_requested_by = workerId;
            task.completion_requested_at = new Date();
            task.completion_rejected_by = null;
            task.completion_rejected_at = null;
            await task.save();

            const otherWorkers = activeAssignments
                .filter(a => a.worker_id !== workerId)
                .map(a => ({ id: a.worker_id, name: a.worker?.name || 'Partner Worker' }));

            return res.status(200).json({
                success: true,
                requires_confirmation: true,
                pending_confirmation: true,
                status: task.status,
                task,
                message: "Work marked complete. Waiting for partner worker to confirm.",
                requested_by: { id: workerId, name: req.user.name },
                waiting_for: otherWorkers
            });
        }

        // For single-worker tasks or single active worker: complete immediately
        task.completion_requested_by = null;
        task.completion_requested_at = null;
        task.completion_rejected_by = null;
        task.completion_rejected_at = null;
        await task.save();

        const result = await handleStageCompletion(task);

        // If there's a next task for this product, assign it to the worker who completed this stage
        if (result.nextTask && result.nextTask.status === 'NOT_STARTED') {
            await TaskWorkerAssignment.create({
                task_id: result.nextTask.id,
                worker_id: workerId,
                joined_at: new Date()
            });
        }

        res.status(200).json({ success: true, status: 'DONE', task: result.task, nextTask: result.nextTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Worker responds to completion request (HA / YES or NA / NO)
export const respondTaskCompletion = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;
        const { agree, confirm, action, response, cancel } = req.body;

        const task = await BatchProductTask.findByPk(taskId, {
            include: [
                { model: Product },
                { model: User, as: 'completion_requester', attributes: ['id', 'name'] }
            ]
        });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        if (task.status === 'DONE') {
            return res.status(200).json({ success: true, status: 'DONE', message: "Task is already completed." });
        }

        if (!task.completion_requested_by) {
            return res.status(400).json({
                success: false,
                message: "No pending completion request on this task."
            });
        }

        // Requester can cancel their own completion request
        if (task.completion_requested_by === workerId) {
            if (cancel === true || agree === false || confirm === false || action === 'cancel' || response === 'no') {
                task.completion_requested_by = null;
                task.completion_requested_at = null;
                await task.save();
                return res.status(200).json({
                    success: true,
                    status: task.status,
                    message: "Completion request cancelled by initiator."
                });
            }
            return res.status(400).json({
                success: false,
                message: "You cannot confirm your own completion request. Your partner worker must confirm it."
            });
        }

        // The partner worker responding: YES or NO
        const isApproved = agree === true || confirm === true || action === 'confirm' || action === 'agree' || response === 'yes' || response === true;

        if (isApproved) {
            // WORKER AGREED (HA): Complete the task!
            task.completion_requested_by = null;
            task.completion_requested_at = null;
            task.completion_rejected_by = null;
            task.completion_rejected_at = null;
            await task.save();

            const result = await handleStageCompletion(task);

            return res.status(200).json({
                success: true,
                confirmed: true,
                status: 'DONE',
                message: "Both workers agreed. Task completed successfully.",
                task: result.task,
                nextTask: result.nextTask
            });
        } else {
            // WORKER REJECTED (NA): Work is NOT complete yet!
            const rejectingUser = await User.findByPk(workerId, { attributes: ['id', 'name'] });
            task.completion_rejected_by = workerId;
            task.completion_rejected_at = new Date();
            task.completion_requested_by = null;
            task.completion_requested_at = null;
            await task.save();

            return res.status(200).json({
                success: true,
                confirmed: false,
                status: task.status,
                message: `${rejectingUser?.name || 'Partner worker'} reported work is still pending. Continuing task.`,
                task
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Check completion status & modal prompt for a task
export const getTaskCompletionStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const workerId = req.user.id;

        const task = await BatchProductTask.findByPk(taskId, {
            include: [
                { model: Product },
                { model: User, as: 'completion_requester', attributes: ['id', 'name'] },
                { model: User, as: 'completion_rejecter', attributes: ['id', 'name'] },
                {
                    model: TaskWorkerAssignment,
                    as: 'worker_assignments',
                    where: { left_at: null },
                    required: false,
                    include: [{ model: User, as: 'worker', attributes: ['id', 'name'] }]
                }
            ]
        });
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const activeWorkers = (task.worker_assignments || []).map(a => ({
            id: a.worker_id,
            name: a.worker?.name || 'Worker'
        }));

        const isRequester = task.completion_requested_by === workerId;
        const requesterName = task.completion_requester?.name || 'Partner Worker';
        const hasPendingCompletion = !!task.completion_requested_by;

        let promptModal = false;
        let modalMessage = null;

        if (hasPendingCompletion && !isRequester) {
            promptModal = true;
            modalMessage = `${requesterName} ne kam ko complete kar diya hai. Kya ye kam poora ho gaya hai?`;
        }

        res.status(200).json({
            success: true,
            task_id: task.id,
            stage: task.stage,
            status: task.status,
            active_workers: activeWorkers,
            has_pending_completion: hasPendingCompletion,
            prompt_modal: promptModal,
            modal_message: modalMessage,
            completion_requested_by: task.completion_requested_by,
            completion_requester_name: requesterName,
            completion_requested_at: task.completion_requested_at,
            completion_rejected_by: task.completion_rejected_by,
            completion_rejecter_name: task.completion_rejecter?.name,
            completion_rejected_at: task.completion_rejected_at
        });
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

        // ALSO complete any OTHER concurrent tasks in ALARM status for this batch!
        // When 2 background tasks (e.g. soaking + drying) end simultaneously, turning off the alarm
        // must also complete the other expired background task so its next stage is generated!
        const otherAlarmTasks = await BatchProductTask.findAll({
            where: {
                batch_id: task.batch_id,
                status: 'ALARM',
                id: { [Op.ne]: task.id }
            },
            include: [{ model: Product }]
        });

        for (const other of otherAlarmTasks) {
            console.log(`[ALARM SYNC] Completing concurrent alarm task ${other.id} (${other.stage} - ${other.Product?.name})`);
            await handleStageCompletion(other);
        }

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
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        // STRICT ENFORCEMENT: Only CUTTING and manual DRYING (piece/25g) allow a helper/second worker!
        // WEIGHING, SOAKING, machine DRYING, BUCKET_ARRANGE strictly allow only ONE worker!
        if (!isJointAllowed(task)) {
            return res.status(400).json({
                success: false,
                message: `Cannot join ${task.stage}. Only CUTTING and manual DRYING (per piece/per 25g) allow multiple workers.`
            });
        }

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
        const workerId = req.user?.id;
        const task = await BatchProductTask.findByPk(taskId, {
            include: [
                { model: Product },
                { model: User, as: 'completion_requester', attributes: ['id', 'name'] },
                { model: User, as: 'completion_rejecter', attributes: ['id', 'name'] }
            ]
        });

        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const isRequester = task.completion_requested_by === workerId;
        const requesterName = task.completion_requester?.name || 'Partner Worker';
        const hasPendingCompletion = !!task.completion_requested_by;

        let promptModal = false;
        let modalMessage = null;
        if (hasPendingCompletion && !isRequester) {
            promptModal = true;
            modalMessage = `${requesterName} ne kam ko complete kar diya hai. Kya ye kam poora ho gaya hai?`;
        }

        res.status(200).json({
            success: true,
            task,
            pending_completion: hasPendingCompletion,
            prompt_modal: promptModal,
            modal_message: modalMessage,
            is_completion_requester: isRequester,
            completion_requested_by: task.completion_requested_by,
            completion_requester_name: requesterName,
            completion_requested_at: task.completion_requested_at,
            completion_rejected_by: task.completion_rejected_by,
            completion_rejecter_name: task.completion_rejecter?.name,
            completion_rejected_at: task.completion_rejected_at
        });
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

        // Use today's date in IST to match cache key exactly
        const now = new Date();
        now.setMinutes(now.getMinutes() + 330);
        const date = now.toISOString().split('T')[0];

        // Fetch from memory cache in < 1ms
        const demandMap = await computeBatchDemandHelper(task.batch_id, date);
        const productDemand = demandMap ? demandMap[task.product_id] : null;

        let buckets = [];
        if (productDemand && productDemand.usersMap) {
            buckets = Object.values(productDemand.usersMap)
                .filter(b => b.quantity > 0)
                .sort((a, b) => a.sortId - b.sortId);
        }

        // Total buckets in this batch for today (total active orders/customers in batch)
        let totalBuckets = demandMap?.totalBuckets || 0;
        if (!totalBuckets && demandMap) {
            let maxSortId = 0;
            const uniqueUsers = new Set();
            Object.values(demandMap).forEach(prod => {
                // Ignore water products (water has no kitchen buckets)
                if ((prod?.product?.category || '').toLowerCase() === 'water' || (prod?.product_name || '').toLowerCase().includes('alkaline')) {
                    return;
                }
                if (prod && prod.usersMap) {
                    Object.values(prod.usersMap).forEach(u => {
                        if (u.userName) uniqueUsers.add(u.userName);
                        if (u.sortId && u.sortId > maxSortId) maxSortId = u.sortId;
                    });
                }
            });
            totalBuckets = Math.max(uniqueUsers.size, maxSortId, buckets.length);
        }

        res.status(200).json({
            success: true,
            totalBuckets,
            total_buckets: totalBuckets,
            buckets
        });
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
                    where: { worker_id: workerId },
                    required: true
                }
            ]
        });

        // Filter:
        // 1. For NOT_STARTED: only show if the worker CURRENTLY has an active assignment (left_at === null).
        //    If it was reassigned to another worker, left_at is not null, so do not show to this worker!
        // 2. For PAUSED: only show if no other worker is currently running it.
        const validStuckTasks = [];
        for (const t of stuckTasks) {
            const myAssignment = (t.worker_assignments || []).find(a => a.worker_id === workerId);
            if (t.status === 'NOT_STARTED') {
                if (myAssignment && myAssignment.left_at === null) {
                    validStuckTasks.push(t);
                }
            } else if (t.status === 'PAUSED') {
                const otherActive = await TaskWorkerAssignment.findOne({
                    where: { task_id: t.id, worker_id: { [Op.ne]: workerId }, left_at: null }
                });
                if (!otherActive) {
                    validStuckTasks.push(t);
                }
            }
        }

        res.status(200).json({ success: true, tasks: validStuckTasks });
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
                    productHindiName: t.Product.hindi_name,
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

/**
 * GET /worker-tasks/tasks/live-tracker (or /live-tracker)
 * Returns all assigned products and tasks/stages for the logged-in worker for today,
 * eliminating the need for localStorage persistence in the frontend app.
 */
export const getWorkerLiveTracker = async (req, res) => {
    try {
        const workerId = req.user.id;
        const { batchId } = req.query;

        const startOfToday = new Date();
        startOfToday.setMinutes(startOfToday.getMinutes() + 330); // IST Offset
        startOfToday.setUTCHours(0, 0, 0, 0);
        startOfToday.setMinutes(startOfToday.getMinutes() - 330);

        // 1. Fetch assignments for this worker today (or where left_at is null)
        const assignments = await TaskWorkerAssignment.findAll({
            where: {
                worker_id: workerId,
                [Op.or]: [
                    { joined_at: { [Op.gte]: startOfToday } },
                    { left_at: null }
                ]
            },
            include: [{
                model: BatchProductTask,
                as: 'task',
                where: batchId ? { batch_id: batchId } : {},
                include: [{ model: Product }]
            }],
            order: [['joined_at', 'ASC']]
        });

        // 2. Also fetch active tasks directly assigned to this worker
        const activeTasks = await BatchProductTask.findAll({
            where: {
                status: { [Op.in]: ['RUNNING', 'PAUSED', 'ALARM'] },
                ...(batchId ? { batch_id: batchId } : {})
            },
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

        // 3. Deduplicate unique tasks
        const taskMap = new Map();
        assignments.forEach(a => {
            if (a.task) taskMap.set(a.task.id, a.task);
        });
        activeTasks.forEach(t => {
            taskMap.set(t.id, t);
        });

        // Helper to normalize stage name
        const normalizeStage = (stage) => {
            const s = String(stage || '').toUpperCase().trim();
            if (s.includes('SOAK')) return 'SOAKING';
            if (s.includes('DRY')) return 'DRYING';
            if (s.includes('WEIGH')) return 'WEIGHING';
            if (s.includes('CUT') || s.includes('CLEAN')) return 'CUTTING';
            if (s.includes('BASKET') || s.includes('BUCKET')) return 'basket_ARRANGE';
            return s;
        };

        // 4. Group by product
        const productMap = {};
        for (const task of taskMap.values()) {
            const prod = task.Product;
            if (!prod) continue;
            const pid = prod.id;

            if (!productMap[pid]) {
                const qtyVal = parseFloat(task.quantity_grams) || 0;
                productMap[pid] = {
                    productId: pid,
                    productName: prod.name,
                    productHindi: prod.hindi_name || '',
                    quantity: `${qtyVal}g`,
                    quantity_grams: qtyVal,
                    image: prod.image_url || prod.image || '',
                    batchId: task.batch_id,
                    workerAssignedStages: [],
                    completedStages: [],
                    activeTasks: [],
                    stages: []
                };
            }

            const normStage = normalizeStage(task.stage);
            if (normStage && !productMap[pid].workerAssignedStages.includes(normStage)) {
                productMap[pid].workerAssignedStages.push(normStage);
            }

            const st = (task.status || '').toUpperCase();
            if (st === 'DONE') {
                if (normStage && !productMap[pid].completedStages.includes(normStage)) {
                    productMap[pid].completedStages.push(normStage);
                }
            } else if (['RUNNING', 'PAUSED', 'ALARM'].includes(st)) {
                if (!productMap[pid].activeTasks.some(at => at.id === task.id)) {
                    productMap[pid].activeTasks.push({
                        id: task.id,
                        stage: task.stage,
                        status: task.status,
                        duration_seconds: task.duration_seconds,
                        remaining_seconds: task.remaining_seconds,
                        started_at: task.started_at,
                        paused_at: task.paused_at,
                        quantity_grams: task.quantity_grams
                    });
                }
            }

            productMap[pid].stages.push({
                taskId: task.id,
                stage: task.stage,
                normStage,
                status: st === 'DONE' ? 'COMPLETED' : st,
                duration_seconds: task.duration_seconds,
                remaining_seconds: task.remaining_seconds,
                started_at: task.started_at,
                paused_at: task.paused_at,
                completed_at: task.completed_at
            });
        }

        // 5. Calculate summary metrics for each product
        const products = Object.values(productMap).map(p => {
            const totalStages = p.workerAssignedStages.length;
            const completedCount = p.completedStages.length;
            const completionPercent = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;
            const hasRunning = p.activeTasks.some(t => ['RUNNING', 'ALARM'].includes((t.status || '').toUpperCase()));

            return {
                ...p,
                totalStages,
                completedCount,
                completionPercent,
                hasRunning,
                status: hasRunning ? 'LIVE' : (completedCount === totalStages && totalStages > 0 ? 'COMPLETED' : 'PENDING')
            };
        });

        res.status(200).json({
            success: true,
            products,
            count: products.length
        });
    } catch (error) {
        console.error("getWorkerLiveTracker Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

