import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { createBatch, getBatches, updateBatch, deleteBatch, getActiveBatches, getBatchDemands } from '../controllers/batch.controller.js';

const router = express.Router();

// User route
router.get('/user/batches', requireAuth, getActiveBatches);

// Admin operations
router.post('/admin/batches', requireAuth, requireRole(['admin']), createBatch);
router.get('/admin/batches', requireAuth, requireRole(['admin']), getBatches);
router.put('/admin/batches/:id', requireAuth, requireRole(['admin']), updateBatch);
router.delete('/admin/batches/:id', requireAuth, requireRole(['admin']), deleteBatch);
router.get('/admin/batches/:id/demands', requireAuth, requireRole(['admin']), getBatchDemands);

export default router;
