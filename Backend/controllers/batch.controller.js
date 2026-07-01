import { Batch } from "../models/index.js";

// POST /api/admin/batches
export const createBatch = async (req, res) => {
    try {
        const { name, status } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Batch name is required" });

        const batch = await Batch.create({ name, status: status || 'active' });
        res.status(201).json({ success: true, message: "Batch created successfully", batch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/batches
export const getBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            where: { is_deleted: false },
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/admin/batches/:id
export const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        
        const batch = await Batch.findByPk(id);
        if (!batch || batch.is_deleted) return res.status(404).json({ success: false, message: "Batch not found" });

        await batch.update({ name, status });
        res.status(200).json({ success: true, message: "Batch updated successfully", batch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/admin/batches/:id (Soft Delete)
export const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const batch = await Batch.findByPk(id);
        
        if (!batch || batch.is_deleted) return res.status(404).json({ success: false, message: "Batch not found" });

        await batch.update({ is_deleted: true });
        res.status(200).json({ success: true, message: "Batch deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
