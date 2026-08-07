import express from 'express';
import { applyForFranchise, getAllFranchises, updateFranchiseStatus, updateFranchise } from '../controllers/franchise.controller.js';

const router = express.Router();

// Public route
router.post('/apply', applyForFranchise);

// Admin routes (assuming these are protected by middleware in index.js or should be protected)
router.get('/', getAllFranchises);
router.patch('/:id/status', updateFranchiseStatus);
router.put('/:id', updateFranchise);

export default router;
