import express from 'express';
import { createSubCategory, getSubCategories, getSubCategoryById, updateSubCategory, deleteSubCategory } from '../controllers/subCategory.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', requireAuth, requireRole(["admin"]), createSubCategory);
router.get('/', requireAuth, getSubCategories);
router.get('/:id', requireAuth, getSubCategoryById);
router.put('/:id', requireAuth, requireRole(["admin"]), updateSubCategory);
router.delete('/:id', requireAuth, requireRole(["admin"]), deleteSubCategory);

export default router;
