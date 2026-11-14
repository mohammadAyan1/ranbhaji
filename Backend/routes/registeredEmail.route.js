import express from 'express';
import {
    getRegisteredEmails,
    addRegisteredEmail,
    updateRegisteredEmail,
    deleteRegisteredEmail,
    testSendEmail,
    triggerDailyDemandEmails
} from '../controllers/registeredEmail.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.get('/', requireAuth, requireRole(['admin']), getRegisteredEmails);
router.post('/', requireAuth, requireRole(['admin']), addRegisteredEmail);
router.put('/:id', requireAuth, requireRole(['admin']), updateRegisteredEmail);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteRegisteredEmail);

// Test send & manual trigger
router.post('/test-send', requireAuth, requireRole(['admin']), testSendEmail);
router.post('/trigger-now', requireAuth, requireRole(['admin']), triggerDailyDemandEmails);

export default router;
