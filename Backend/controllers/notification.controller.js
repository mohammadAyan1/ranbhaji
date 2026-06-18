import { Notification } from "../models/index.js";

// GET /api/notifications
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { user_id: req.user.id },
            order: [['scheduled_at', 'DESC']],
            limit: 50
        });
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/notifications/:id/mark-read
export const markNotificationRead = async (req, res) => {
    try {
        const notif = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!notif) return res.status(404).json({ success: false, message: "Notification not found" });
        await notif.update({ is_read: true });
        res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
