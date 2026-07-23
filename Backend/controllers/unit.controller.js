import { Unit } from "../models/index.js";

// POST /api/units (Admin)
export const createUnit = async (req, res) => {
    try {
        const { name, abbreviation } = req.body;
        if (!name || !abbreviation) {
            return res.status(400).json({ success: false, message: "name and abbreviation are required" });
        }

        const unit = await Unit.create({ name, abbreviation });
        res.status(201).json({ success: true, unit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/units
export const getUnits = async (req, res) => {
    try {
        const units = await Unit.findAll({ where: { status: 'active' } });
        res.status(200).json({ success: true, units });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/units/:id (Admin)
export const updateUnit = async (req, res) => {
    try {
        const { name, abbreviation, status } = req.body;
        const unit = await Unit.findByPk(req.params.id);
        if (!unit) {
            return res.status(404).json({ success: false, message: "Unit not found" });
        }

        await unit.update({ name, abbreviation, status });
        res.status(200).json({ success: true, unit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/units/:id (Admin)
export const deleteUnit = async (req, res) => {
    try {
        const unit = await Unit.findByPk(req.params.id);
        if (!unit) {
            return res.status(404).json({ success: false, message: "Unit not found" });
        }
        
        // Soft delete
        await unit.update({ status: 'inactive' });
        res.status(200).json({ success: true, message: "Unit deactivated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
