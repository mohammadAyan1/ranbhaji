import express from 'express';
import { createUnit, getUnits, updateUnit, deleteUnit } from '../controllers/unit.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getUnits);
router.post('/', requireAuth, requireRole(['admin']), createUnit);
router.put('/:id', requireAuth, requireRole(['admin']), updateUnit);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteUnit);

export default router;
