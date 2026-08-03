import express from 'express';
import { getOrdersForBatch, assignBatchToOrders, getMissingItems } from '../controllers/todayWork.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/orders-for-batch', requireAuth, requireRole(["admin"]), getOrdersForBatch);
router.post('/assign-batch', requireAuth, requireRole(["admin"]), assignBatchToOrders);
router.get('/missing-items', requireAuth, requireRole(["admin"]), getMissingItems);

export default router;
