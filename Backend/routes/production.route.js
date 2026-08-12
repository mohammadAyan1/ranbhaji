import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import {
    createBatch,
    markAttendance,
    createSplit,
    leaveSplit,
    joinSplit,
    getDashboard,
    getMyStatus,
    advanceSplitStage,
    startWork,
    acknowledgeAlarm,
    startProcess
} from '../controllers/production.controller.js';

const router = express.Router();

router.post('/batches', requireAuth, requireRole(['admin']), createBatch);
router.post('/attendance', requireAuth, markAttendance);
router.post('/start-work', requireAuth, startWork);
router.post('/splits', requireAuth, createSplit);
router.post('/splits/:id/leave', requireAuth, leaveSplit);
router.post('/splits/:id/join', requireAuth, joinSplit);
router.post('/splits/:id/advance', requireAuth, advanceSplitStage);
router.post('/splits/:id/start-process', requireAuth, startProcess);
router.post('/splits/:id/acknowledge-alarm', requireAuth, acknowledgeAlarm);
router.get('/dashboard', requireAuth, requireRole(['admin']), getDashboard);
router.get('/my-status', requireAuth, getMyStatus);

export default router;
