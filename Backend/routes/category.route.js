import express from 'express';
import { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', requireAuth, requireRole(["admin"]), createCategory);
router.get('/', requireAuth, getCategories);
router.get('/:id', requireAuth, getCategoryById);
router.put('/:id', requireAuth, requireRole(["admin"]), updateCategory);
router.delete('/:id', requireAuth, requireRole(["admin"]), deleteCategory);

export default router;
