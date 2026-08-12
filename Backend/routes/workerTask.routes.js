import express from 'express';
import { 
    getTodayBatches, getBatchDemand, assignNextTask, startTaskStage, 
    pauseTask, resumeTask, completeTask, acknowledgeAlarm, joinTask, triggerAlarm, checkAlarms, syncTask
} from '../controllers/workerTask.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Middleware to ensure user is logged in
router.use(requireAuth);

router.get('/batches', getTodayBatches);
router.get('/batches/:batchId/demand', getBatchDemand);

router.get('/assign', assignNextTask); // worker gets next assignment
router.get('/alarms', checkAlarms); // polling alarms safely

// Task actions
router.post('/tasks/:taskId/start', startTaskStage);
router.post('/tasks/:taskId/pause', pauseTask);
router.post('/tasks/:taskId/resume', resumeTask);
router.post('/tasks/:taskId/complete', completeTask);
router.post('/tasks/:taskId/acknowledge', acknowledgeAlarm);
router.post('/tasks/:taskId/join', joinTask);
router.get('/tasks/:taskId/sync', syncTask);

// For testing/mocking the timer ending
router.post('/tasks/:taskId/trigger-alarm', triggerAlarm);

export default router;
