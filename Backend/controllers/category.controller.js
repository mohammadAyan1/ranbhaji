import { pool } from "../confiq/db.js";

export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const [result] = await pool.query(
            "INSERT INTO categories (name) VALUES (?)",
            [name]
        );

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: { id: result.insertId, name }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const [result] = await pool.query(
            "UPDATE categories SET name = ? WHERE id = ? AND is_deleted = false",
            [name, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Category not found or already deleted" });
        }

        res.status(200).json({ success: true, message: "Category updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "UPDATE categories SET is_deleted = true WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllCategories = async (req, res) => {
    try {
        const [categories] = await pool.query(
            "SELECT id, name, created_at, updated_at FROM categories WHERE is_deleted = false ORDER BY created_at DESC"
        );

        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const [categories] = await pool.query(
            "SELECT id, name, created_at, updated_at FROM categories WHERE id = ? AND is_deleted = false",
            [id]
        );

        if (categories.length === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.status(200).json({ success: true, data: categories[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
