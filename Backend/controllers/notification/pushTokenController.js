import pool from "../../confiq/db.js";

export const savePushToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pushToken } = req.body;

        const roleChecker = req.user?.role?.toLowerCase();

        if (roleChecker !== "user" && roleChecker !== "admin") {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to perform this task",
            });
        }

        if (!pushToken) {
            return res.status(400).json({
                success: false,
                message: "Push token required hai",
            });
        }

        const query = `
            INSERT INTO pushtoken (token, userId)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                token = VALUES(token),
                updated_at = CURRENT_TIMESTAMP
        `;

        await pool.execute(query, [pushToken, userId]);

        return res.status(200).json({
            success: true,
            message: "Push token saved",
        });

    } catch (error) {
        console.error("Save Push Token Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};