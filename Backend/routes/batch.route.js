import express from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { createBatch, getBatches, updateBatch, deleteBatch } from '../controllers/batch.controller.js';

const router = express.Router();

// All batch operations are admin only
router.post('/admin/batches', requireAuth, requireRole(['admin']), createBatch);
router.get('/admin/batches', requireAuth, requireRole(['admin']), getBatches);
router.put('/admin/batches/:id', requireAuth, requireRole(['admin']), updateBatch);
router.delete('/admin/batches/:id', requireAuth, requireRole(['admin']), deleteBatch);

export default router;
