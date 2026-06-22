import { CalculatorDraft, CalculatorDraftItem, Product } from "../models/index.js";
import { sequelize } from "../confiq/db.js";

// POST /api/calculator/drafts (admin)
export const createDraft = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, margin_percent, services_per_month, num_persons, calculated_price, max_fixed_count, max_seasonal_count, items } = req.body;

        if (!name) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Draft name is required" });
        }

        const draft = await CalculatorDraft.create({
            name,
            margin_percent: parseFloat(margin_percent || 0),
            services_per_month: parseInt(services_per_month || 1),
            num_persons: parseInt(num_persons || 2),
            calculated_price: parseFloat(calculated_price || 0),
            max_fixed_count: parseInt(max_fixed_count || 0),
            max_seasonal_count: parseInt(max_seasonal_count || 0)
        }, { transaction: t });

        if (items && items.length > 0) {
            const itemRows = items.map(item => ({
                draft_id: draft.id,
                product_id: parseInt(item.product_id),
                qty_gm: parseFloat(item.qty_gm || 0),
                is_fixed: !!item.is_fixed,
                is_seasonal: !!item.is_seasonal
            }));
            await CalculatorDraftItem.bulkCreate(itemRows, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, message: "Draft saved successfully", draft });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/calculator/drafts (admin)
export const getDrafts = async (req, res) => {
    try {
        const drafts = await CalculatorDraft.findAll({
            include: [
                {
                    model: CalculatorDraftItem,
                    as: 'Items',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'purchase_price_per_gm', 'selling_price_per_gm'] }]
                }
            ],
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, drafts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/calculator/drafts/:id (admin)
export const deleteDraft = async (req, res) => {
    try {
        const draft = await CalculatorDraft.findByPk(req.params.id);
        if (!draft) {
            return res.status(404).json({ success: false, message: "Draft not found" });
        }
        await draft.destroy();
        res.status(200).json({ success: true, message: "Draft deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
