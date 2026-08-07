import { AttendanceLog, User } from "../models/index.js";

// GET /api/attendance
export const getAttendanceLogs = async (req, res) => {
    try {
        const { date, delivery_boy_id } = req.query;

        let whereClause = {};
        if (date) whereClause.date = date;
        if (delivery_boy_id) whereClause.delivery_boy_id = delivery_boy_id;

        const logs = await AttendanceLog.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'DeliveryBoy',
                    attributes: ['id', 'name', 'phone']
                }
            ],
            order: [
                ['date', 'DESC'],
                ['login_time', 'DESC']
            ]
        });

        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error("Error fetching attendance logs:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/attendance/mark
export const markAttendance = async (req, res) => {
    try {
        const delivery_boy_id = req.user.id;
        
        if (req.user.role !== 'delivery') {
            return res.status(403).json({ success: false, message: "Only delivery boys can mark attendance." });
        }

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const existingLog = await AttendanceLog.findOne({
            where: { delivery_boy_id, date: today }
        });

        if (existingLog) {
            return res.status(400).json({ success: false, message: "Attendance already marked for today." });
        }

        const newLog = await AttendanceLog.create({
            delivery_boy_id,
            date: today,
            login_time: new Date()
        });

        res.status(201).json({ success: true, message: "Attendance marked successfully!", data: newLog });
    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
