import { RegisteredEmail } from '../models/index.js';
import { sendPurchaseDemandEmails, sendTestEmail, getPurchaseUrl } from '../utils/mailer.js';

// GET all registered emails
export const getRegisteredEmails = async (req, res) => {
    try {
        const emails = await RegisteredEmail.findAll({
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({
            success: true,
            emails,
            purchaseUrl: getPurchaseUrl()
        });
    } catch (error) {
        console.error('[RegisteredEmail] Fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ADD new registered email
export const addRegisteredEmail = async (req, res) => {
    try {
        const { name, email, status } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: "Email address is required" });
        }

        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ success: false, message: "Please provide a valid email address" });
        }

        const existing = await RegisteredEmail.findOne({ where: { email: cleanEmail } });
        if (existing) {
            return res.status(400).json({ success: false, message: "This email is already registered" });
        }

        const record = await RegisteredEmail.create({
            name: name ? name.trim() : null,
            email: cleanEmail,
            status: status === 'inactive' ? 'inactive' : 'active'
        });

        res.status(201).json({
            success: true,
            message: "Email registered successfully",
            email: record
        });
    } catch (error) {
        console.error('[RegisteredEmail] Add error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE registered email
export const updateRegisteredEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, status } = req.body;

        const record = await RegisteredEmail.findByPk(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Registered email not found" });
        }

        if (email) {
            const cleanEmail = email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
                return res.status(400).json({ success: false, message: "Please provide a valid email address" });
            }

            if (cleanEmail !== record.email) {
                const existing = await RegisteredEmail.findOne({ where: { email: cleanEmail } });
                if (existing && existing.id !== record.id) {
                    return res.status(400).json({ success: false, message: "Another entry already uses this email" });
                }
                record.email = cleanEmail;
            }
        }

        if (name !== undefined) {
            record.name = name ? name.trim() : null;
        }

        if (status && ['active', 'inactive'].includes(status)) {
            record.status = status;
        }

        await record.save();

        res.status(200).json({
            success: true,
            message: "Email updated successfully",
            email: record
        });
    } catch (error) {
        console.error('[RegisteredEmail] Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE registered email
export const deleteRegisteredEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await RegisteredEmail.findByPk(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Registered email not found" });
        }

        await record.destroy();

        res.status(200).json({
            success: true,
            message: "Registered email deleted successfully"
        });
    } catch (error) {
        console.error('[RegisteredEmail] Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// TEST SEND email
export const testSendEmail = async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Target email address is required for test send" });
        }

        const info = await sendTestEmail(email.trim(), name || 'Admin Tester');

        res.status(200).json({
            success: true,
            message: `Test email sent successfully to ${email}`,
            messageId: info.messageId
        });
    } catch (error) {
        console.error('[RegisteredEmail] Test send error:', error);
        res.status(500).json({
            success: false,
            message: `Failed to send test email: ${error.message}. Please verify SMTP credentials in .env`
        });
    }
};

// TRIGGER 8:10 PM email immediately (Manual execution)
export const triggerDailyDemandEmails = async (req, res) => {
    try {
        const activeEmails = await RegisteredEmail.findAll({
            where: { status: 'active' }
        });

        if (activeEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No active registered emails found to notify."
            });
        }

        const recipients = activeEmails.map(r => ({ email: r.email, name: r.name }));
        const result = await sendPurchaseDemandEmails(recipients);

        res.status(200).json({
            success: true,
            message: `Purchase demand email dispatched to ${result.sentCount} active recipient(s)`,
            result
        });
    } catch (error) {
        console.error('[RegisteredEmail] Trigger error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
