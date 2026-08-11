import { Op } from 'sequelize';
import { ProductionBatch, BatchSplit, SplitWorkerAssignment, WorkerAttendance, Product, User } from '../models/index.js';
import { calculateProductProcessingTime } from '../utils/timeCalculator.js';

const STAGES = ['pending', 'weighing_start', 'soaking', 'cleaning_cutting', 'drying', 'completed'];

const emitUpdate = (req) => {
    if (req.app.get('io')) {
        req.app.get('io').emit('production:update', { timestamp: new Date() });
    }
};

const getNextStage = (currentStage) => {
    const idx = STAGES.indexOf(currentStage);
    if (idx >= 0 && idx < STAGES.length - 1) return STAGES[idx + 1];
    return 'completed';
};

const advanceStage = async (split) => {
    const nextStage = getNextStage(split.stage);
    split.stage = nextStage;
    split.stage_started_at = new Date();
    split.stage_completed_at = null;
    
    // If next stage is soaking or drying, they are wait stages, so status is in_progress for the machine, but wait for workers
    // Wait, the alarm goes off when they are DONE soaking/drying. While soaking/drying, they are 'in_progress'. 
    // When they finish, they become 'waiting'.
    if (nextStage === 'soaking' || nextStage === 'drying') {
        split.status = 'in_progress';
    } else if (nextStage === 'completed') {
        split.status = 'completed';
    } else {
        split.status = 'waiting'; // Waiting for worker acknowledgement/assignment
    }
    
    await split.save();
    return split;
};

const freeWorkers = async (splitId) => {
    const assignments = await SplitWorkerAssignment.findAll({ where: { split_id: splitId, left_at: null } });
    for (const assignment of assignments) {
        assignment.left_at = new Date();
        await assignment.save();

        await WorkerAttendance.update(
            { current_status: 'idle' },
            { where: { worker_id: assignment.worker_id } }
        );
        // Automatically re-assign them to next available task
        await assignWorker(assignment.worker_id);
    }
};

const markStageComplete = async (split) => {
    split.stage_completed_at = new Date();
    split.status = 'completed';
    await split.save();
};

export const recalculateSplit = async (splitId) => {
    const split = await BatchSplit.findByPk(splitId);
    if (!split || split.stage !== 'cleaning_cutting') return split;

    const now = new Date();

    // Calculate work done since last calculation
    if (split.last_recalculated_at && split.remaining_work_minutes > 0) {
        const elapsedMinutes = (now.getTime() - new Date(split.last_recalculated_at).getTime()) / 60000;
        const workDone = elapsedMinutes * split.active_worker_count;
        split.remaining_work_minutes = Math.max(0, split.remaining_work_minutes - workDone);
    }

    // Update active workers
    const activeWorkersCount = await SplitWorkerAssignment.count({
        where: { split_id: splitId, left_at: null }
    });

    split.active_worker_count = activeWorkersCount;
    split.last_recalculated_at = now;

    await split.save();

    if (split.remaining_work_minutes <= 0) {
        await markStageComplete(split);
        await advanceStage(split);
        await freeWorkers(split.id);
    }

    return split;
};

export const assignWorker = async (workerId) => {
    const today = new Date().toISOString().split('T')[0];
    let attendance = await WorkerAttendance.findOne({
        where: { worker_id: workerId, date: today }
    });

    if (!attendance || attendance.current_status === 'inactive') {
        return { action: 'inactive' };
    }

    // 1. Check if already working
    const currentAssignment = await SplitWorkerAssignment.findOne({
        where: { worker_id: workerId, left_at: null },
        include: [{ model: BatchSplit, as: 'split' }]
    });

    if (currentAssignment) {
        return { action: 'working', split: currentAssignment.split };
    }

    // 2. Look for waiting manual tasks (e.g., waiting for cutting or packing after machine processes)
    const waitingSplit = await BatchSplit.findOne({
        where: {
            stage: { [Op.in]: ['cleaning_cutting'] },
            status: 'waiting'
        },
        order: [['stage_started_at', 'ASC']]
    });

    if (waitingSplit) {
        await SplitWorkerAssignment.create({ split_id: waitingSplit.id, worker_id: workerId, joined_at: new Date() });
        waitingSplit.status = 'in_progress';
        await waitingSplit.save();
        await WorkerAttendance.update({ current_status: 'working' }, { where: { worker_id: workerId, date: today } });
        return { action: 'working', split: waitingSplit };
    }

    // 3. Look for existing in_progress cleaning_cutting to help out
    const helpSplit = await BatchSplit.findOne({
        where: { stage: 'cleaning_cutting', status: 'in_progress' }
    });

    if (helpSplit) {
        await SplitWorkerAssignment.create({ split_id: helpSplit.id, worker_id: workerId, joined_at: new Date() });
        await WorkerAttendance.update({ current_status: 'working' }, { where: { worker_id: workerId, date: today } });
        await recalculateSplit(helpSplit.id);
        return { action: 'working', split: helpSplit };
    }

    // 4. Look for pending ProductionBatches to start a new split (Auto-create a 10kg split)
    const pendingBatch = await ProductionBatch.findOne({
        where: { pending_qty_kg: { [Op.gt]: 0 }, status: { [Op.ne]: 'completed' }, date: today },
        include: [{ model: Product, as: 'product' }],
        order: [['created_at', 'ASC']]
    });

    if (pendingBatch) {
        const qty_to_split = Math.min(10, parseFloat(pendingBatch.pending_qty_kg)); // Default 10kg
        
        const timeData = calculateProductProcessingTime(pendingBatch.product, qty_to_split, 1);
        const totalWorkMinutes = timeData.stages.cleaning_cutting.total_work_minutes || 0;

        const newSplit = await BatchSplit.create({
            batch_id: pendingBatch.id,
            qty_kg: qty_to_split,
            stage: 'weighing_start',
            status: 'in_progress',
            total_work_minutes: totalWorkMinutes,
            remaining_work_minutes: totalWorkMinutes,
            stage_started_at: new Date()
        });

        pendingBatch.pending_qty_kg = parseFloat(pendingBatch.pending_qty_kg) - qty_to_split;
        pendingBatch.status = 'in_progress';
        await pendingBatch.save();

        await SplitWorkerAssignment.create({
            split_id: newSplit.id,
            worker_id: workerId,
            joined_at: new Date()
        });

        await WorkerAttendance.update({ current_status: 'working' }, { where: { worker_id: workerId, date: today } });
        return { action: 'working', split: newSplit };
    }

    return { action: 'idle' }; // No work available
};

export const joinSplit = async (req, res) => {
    try {
        const { id } = req.params; // split_id
        const worker_id = req.user.id;

        const split = await BatchSplit.findByPk(id);
        if (!split) return res.status(404).json({ success: false, message: "Split not found" });

        // Check if already assigned
        const existing = await SplitWorkerAssignment.findOne({ where: { split_id: id, worker_id, left_at: null } });
        if (existing) return res.status(400).json({ success: false, message: "Already assigned to this split" });

        await recalculateSplit(id);

        await SplitWorkerAssignment.create({
            split_id: id,
            worker_id,
            joined_at: new Date()
        });

        await WorkerAttendance.update(
            { current_status: 'working' },
            { where: { worker_id, date: new Date().toISOString().split('T')[0] } }
        );

        await recalculateSplit(id);
        emitUpdate(req);

        res.status(200).json({ success: true, message: "Joined successfully", split });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: POST /api/production/batches
export const createBatch = async (req, res) => {
    try {
        const { product_id, total_qty_kg } = req.body;
        const date = new Date().toISOString().split('T')[0];

        const batch = await ProductionBatch.create({
            product_id,
            date,
            total_qty_kg,
            pending_qty_kg: total_qty_kg,
            status: 'pending'
        });

        emitUpdate(req);
        res.status(201).json({ success: true, batch });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: POST /api/production/attendance
// API: POST /api/production/attendance
export const markAttendance = async (req, res) => {
    try {
        const { worker_id } = req.body;
        const today = new Date().toISOString().split('T')[0];
        
        let attendance = await WorkerAttendance.findOne({
            where: { worker_id, date: today }
        });

        if (!attendance) {
            attendance = await WorkerAttendance.create({
                worker_id,
                date: today,
                checked_in_at: new Date(),
                current_status: 'inactive' // Start as inactive
            });
        }

        emitUpdate(req);
        res.status(200).json({ success: true, attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: POST /api/production/start-work
export const startWork = async (req, res) => {
    try {
        const worker_id = req.user.id;
        const today = new Date().toISOString().split('T')[0];
        
        let attendance = await WorkerAttendance.findOne({
            where: { worker_id, date: today }
        });

        if (!attendance) {
            return res.status(400).json({ success: false, message: "Mark attendance first" });
        }

        attendance.current_status = 'idle';
        await attendance.save();

        const assignment = await assignWorker(worker_id);

        emitUpdate(req);
        res.status(200).json({ success: true, assignment, message: "Work started" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: POST /api/production/splits/:id/acknowledge-alarm
export const acknowledgeAlarm = async (req, res) => {
    try {
        const { id } = req.params;
        const worker_id = req.user.id;

        const split = await BatchSplit.findByPk(id);
        if (!split) return res.status(404).json({ success: false, message: "Split not found" });

        // Acknowledging means advancing it from soaking/drying
        // We will call advanceStage
        const prevStage = split.stage;
        await advanceStage(split);

        // Now assign the worker who acknowledged it
        await SplitWorkerAssignment.create({
            split_id: split.id,
            worker_id: worker_id,
            joined_at: new Date()
        });

        await WorkerAttendance.update(
            { current_status: 'working' },
            { where: { worker_id, date: new Date().toISOString().split('T')[0] } }
        );

        await recalculateSplit(split.id);

        emitUpdate(req);
        res.status(200).json({ success: true, message: "Alarm acknowledged, task assigned", split });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: POST /api/production/splits
export const createSplit = async (req, res) => {
    try {
        const { batch_id, qty_kg } = req.body;
        const worker_id = req.body.worker_id || req.user?.id;

        const batch = await ProductionBatch.findByPk(batch_id, {
            include: [{ model: Product, as: 'product' }]
        });

        if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
        if (parseFloat(batch.pending_qty_kg) < parseFloat(qty_kg)) {
            return res.status(400).json({ success: false, message: "Requested qty exceeds pending batch qty" });
        }

        // Calculate time using the pure function
        const timeData = calculateProductProcessingTime(batch.product, qty_kg, 1);
        const totalWorkMinutes = timeData.stages.cleaning_cutting.total_work_minutes;

        const split = await BatchSplit.create({
            batch_id,
            qty_kg,
            stage: 'weighing_start', // Start at strict first stage
            status: 'in_progress',
            total_work_minutes: totalWorkMinutes,
            remaining_work_minutes: totalWorkMinutes,
            stage_started_at: new Date()
        });

        batch.pending_qty_kg = parseFloat(batch.pending_qty_kg) - parseFloat(qty_kg);
        batch.status = 'in_progress';
        await batch.save();

        // Assign the worker who initiated the split
        await SplitWorkerAssignment.create({
            split_id: split.id,
            worker_id: worker_id,
            joined_at: new Date()
        });

        // Update attendance to working
        await WorkerAttendance.update(
            { current_status: 'working' },
            { where: { worker_id: worker_id, date: new Date().toISOString().split('T')[0] } }
        );

        await recalculateSplit(split.id);

        emitUpdate(req);
        res.status(201).json({ success: true, split });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: POST /api/production/splits/:id/leave
export const leaveSplit = async (req, res) => {
    try {
        const { id } = req.params;
        const { worker_id } = req.body;

        const assignment = await SplitWorkerAssignment.findOne({
            where: { split_id: id, worker_id, left_at: null }
        });

        if (assignment) {
            assignment.left_at = new Date();
            await assignment.save();
        }

        await WorkerAttendance.update(
            { current_status: 'idle' },
            { where: { worker_id } }
        );

        await recalculateSplit(id);

        // Find next task for this worker
        const nextTask = await assignWorker(worker_id);

        emitUpdate(req);
        res.status(200).json({ success: true, status: 'idle', next_task: nextTask });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: GET /api/production/dashboard
export const getDashboard = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const batches = await ProductionBatch.findAll({
            where: { date: today },
            include: [
                { model: Product, as: 'product' },
                {
                    model: BatchSplit,
                    as: 'splits',
                    include: [{
                        model: SplitWorkerAssignment,
                        as: 'assignments',
                        where: { left_at: null },
                        required: false,
                        include: [{ model: User, as: 'worker', attributes: ['name'] }]
                    }]
                }
            ]
        });

        const dashboardData = batches.map(batch => {
            return {
                id: batch.id,
                product: batch.product.name,
                total_qty_kg: batch.total_qty_kg,
                pending_qty_kg: batch.pending_qty_kg,
                splits: batch.splits.map(split => {
                    let eta_minutes = null;
                    const timeData = calculateProductProcessingTime(batch.product, split.qty_kg, split.active_worker_count || 1);

                    if (split.stage === 'cleaning_cutting') {
                        if (split.active_worker_count > 0) {
                            eta_minutes = split.remaining_work_minutes / split.active_worker_count;
                        }
                    } else if (split.stage === 'soaking') {
                        eta_minutes = timeData.stages.soaking.time_min;
                    } else if (split.stage === 'drying') {
                        eta_minutes = timeData.stages.drying.time_min;
                    } else if (split.stage === 'wrapping') {
                        eta_minutes = timeData.stages.wrapping.time_min;
                    } else if (split.stage === 'packing') {
                        eta_minutes = timeData.stages.packing.time_min;
                    } else if (split.stage === 'weighing_start') {
                        eta_minutes = timeData.stages.weighing_start.time_min;
                    } else if (split.stage === 'weighing_end') {
                        eta_minutes = timeData.stages.weighing_end.time_min;
                    }
                    return {
                        id: split.id,
                        qty_kg: split.qty_kg,
                        stage: split.stage,
                        eta_minutes: eta_minutes !== null ? Number(Number(eta_minutes).toFixed(2)) : null,
                        workers: split.assignments.map(a => a.worker.name),
                        started_at: split.stage_started_at
                    };
                })
            };
        });

        res.status(200).json({ success: true, date: today, batches: dashboardData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyStatus = async (req, res) => {
    try {
        const workerId = req.user.id;

        const assignment = await SplitWorkerAssignment.findOne({
            where: { worker_id: workerId, left_at: null },
            include: [{
                model: BatchSplit,
                as: 'split',
                include: [{
                    model: ProductionBatch,
                    as: 'batch',
                    include: [{ model: Product, as: 'product' }]
                }]
            }]
        });

        if (assignment && assignment.split) {
            const split = assignment.split;
            let eta_minutes = null;
            const timeData = calculateProductProcessingTime(split.batch.product, split.qty_kg, split.active_worker_count || 1);
            if (split.stage === 'cleaning_cutting') {
                if (split.active_worker_count > 0) eta_minutes = split.remaining_work_minutes / split.active_worker_count;
            } else if (split.stage === 'soaking') eta_minutes = timeData.stages.soaking.time_min;
            else if (split.stage === 'drying') eta_minutes = timeData.stages.drying.time_min;
            else if (split.stage === 'wrapping') eta_minutes = timeData.stages.wrapping.time_min;
            else if (split.stage === 'packing') eta_minutes = timeData.stages.packing.time_min;
            else if (split.stage === 'weighing_start') eta_minutes = timeData.stages.weighing_start.time_min;
            else if (split.stage === 'weighing_end') eta_minutes = timeData.stages.weighing_end.time_min;
            
            const dataToReturn = split.toJSON();
            dataToReturn.eta_minutes = eta_minutes !== null ? Number(Number(eta_minutes).toFixed(2)) : null;

            return res.status(200).json({ success: true, status: 'assigned', data: dataToReturn });
        }

        const today = new Date().toISOString().split('T')[0];
        const attendance = await WorkerAttendance.findOne({
            where: { worker_id: workerId, date: today }
        });

        if (!attendance) {
            return res.status(200).json({ success: true, status: 'no_attendance' });
        }
        
        if (attendance.current_status === 'inactive') {
            return res.status(200).json({ success: true, status: 'inactive' });
        }

        return res.status(200).json({ success: true, status: 'idle' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const advanceSplitStage = async (req, res) => {
    try {
        const split = await BatchSplit.findByPk(req.params.id);
        if (!split) return res.status(404).json({ success: false, message: "Split not found" });

        if (req.body.qty_kg) {
            split.qty_kg = req.body.qty_kg;
            await split.save();
        }

        const prevStage = split.stage;
        await advanceStage(split);

        // Whenever a manual stage advances (like weighing_start completes -> soaking), free the worker!
        // Actually, ANY stage advance should free the current worker so they can get a new task.
        await freeWorkers(split.id);

        await recalculateSplit(split.id);

        emitUpdate(req);
        res.status(200).json({ success: true, message: "Stage advanced", split });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
