import express from 'express';
import { createZone, getZones, getZoneById, updateZone, deleteZone } from '../controllers/zone.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', requireAuth, requireRole(["admin"]), createZone);
router.get('/', requireAuth, getZones);
router.get('/:id', requireAuth, getZoneById);
router.put('/:id', requireAuth, requireRole(["admin"]), updateZone);
router.delete('/:id', requireAuth, requireRole(["admin"]), deleteZone);

export default router;
