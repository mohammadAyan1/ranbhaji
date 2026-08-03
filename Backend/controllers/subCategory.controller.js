import { SubCategory, Category } from "../models/index.js";

export const createSubCategory = async (req, res) => {
    try {
        const { name, category_id, description, status } = req.body;
        const subCategory = await SubCategory.create({ name, category_id, description, status });
        res.status(201).json({ success: true, message: "Sub Category created successfully", subCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubCategories = async (req, res) => {
    try {
        // Option to filter by category_id if needed
        const { category_id } = req.query;
        const where = category_id ? { category_id } : {};
        const subCategories = await SubCategory.findAll({ where });
        res.status(200).json({ success: true, subCategories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubCategoryById = async (req, res) => {
    try {
        const subCategory = await SubCategory.findByPk(req.params.id);
        if (!subCategory) return res.status(404).json({ success: false, message: "Sub Category not found" });
        res.status(200).json({ success: true, subCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSubCategory = async (req, res) => {
    try {
        const subCategory = await SubCategory.findByPk(req.params.id);
        if (!subCategory) return res.status(404).json({ success: false, message: "Sub Category not found" });

        const { name, category_id, description, status } = req.body;
        await subCategory.update({ name, category_id, description, status });
        res.status(200).json({ success: true, message: "Sub Category updated successfully", subCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteSubCategory = async (req, res) => {
    try {
        const subCategory = await SubCategory.findByPk(req.params.id);
        if (!subCategory) return res.status(404).json({ success: false, message: "Sub Category not found" });
        await subCategory.destroy();
        res.status(200).json({ success: true, message: "Sub Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
