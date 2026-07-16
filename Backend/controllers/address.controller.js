import { Address } from "../models/index.js";
import { sequelize } from "../confiq/db.js";

// POST /api/addresses
export const createAddress = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { address_line, city, pincode, landmark, is_default } = req.body;
        const user_id = req.user.id;

        if (!address_line || !city || !pincode) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "address_line, city, and pincode are required" });
        }

        // Check if user has any existing addresses
        const count = await Address.count({ where: { user_id } }, { transaction: t });
        const shouldBeDefault = count === 0 || is_default === true || is_default === 'true';

        if (shouldBeDefault) {
            // Unset other defaults
            await Address.update({ is_default: false }, { where: { user_id }, transaction: t });
        }

        const address = await Address.create({
            address_line,
            city,
            pincode,
            landmark: landmark || null,
            is_default: shouldBeDefault,
            user_id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, message: "Address created successfully", address });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/addresses
export const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.findAll({
            where: { user_id: req.user.id },
            order: [['is_default', 'DESC'], ['id', 'ASC']]
        });
        res.status(200).json({ success: true, addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/addresses/:id
export const updateAddress = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { address_line, city, pincode, landmark, is_default } = req.body;
        const user_id = req.user.id;

        const address = await Address.findOne({ where: { id: req.params.id, user_id } });
        if (!address) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const shouldBeDefault = is_default === true || is_default === 'true';

        if (shouldBeDefault && !address.is_default) {
            await Address.update({ is_default: false }, { where: { user_id }, transaction: t });
        }

        await address.update({
            address_line: address_line || address.address_line,
            city: city || address.city,
            pincode: pincode || address.pincode,
            landmark: landmark !== undefined ? landmark : address.landmark,
            is_default: shouldBeDefault || address.is_default
        }, { transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Address updated successfully", address });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/addresses/:id
export const deleteAddress = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const user_id = req.user.id;
        const address = await Address.findOne({ where: { id: req.params.id, user_id } });
        if (!address) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const wasDefault = address.is_default;
        await address.destroy({ transaction: t });

        if (wasDefault) {
            // Find another address to mark as default
            const nextAddress = await Address.findOne({ where: { user_id }, order: [['id', 'ASC']], transaction: t });
            if (nextAddress) {
                await nextAddress.update({ is_default: true }, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/addresses/:id/default
export const setDefaultAddress = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const user_id = req.user.id;
        const address = await Address.findOne({ where: { id: req.params.id, user_id } });
        if (!address) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        await Address.update({ is_default: false }, { where: { user_id }, transaction: t });
        await address.update({ is_default: true }, { transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Default address updated", address });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/addresses/:id/location
export const updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: "latitude and longitude are required" });
        }
        const address = await Address.findByPk(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        await address.update({ latitude, longitude });
        res.status(200).json({ success: true, message: "Location captured successfully", address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/addresses/admin/unassigned
export const getUnassignedAddresses = async (req, res) => {
    try {
        const addresses = await Address.findAll({
            where: { zone: null }
        });
        res.status(200).json({ success: true, addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/addresses/admin/:id/zone
export const assignZone = async (req, res) => {
    try {
        const { zone } = req.body;
        const address = await Address.findByPk(req.params.id);
        if (!address) return res.status(404).json({ success: false, message: "Address not found" });

        await address.update({ zone });
        res.status(200).json({ success: true, message: "Zone assigned successfully", address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
