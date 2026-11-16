import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to cwd .env if any

/**
 * Creates and returns a configured nodemailer transporter
 */
export const getTransporter = () => {
    const rawHost = (process.env.SMTP_HOST || '').trim();
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
    // Strip spaces from password (essential for Google 16-character App Passwords "abcd efgh ijkl mnop")
    const pass = rawPass.replace(/\s+/g, '');

    if (!user || !pass) {
        console.warn('[MAILER] SMTP credentials (SMTP_USER / SMTP_PASS) are not set in .env. Emails may fail to deliver until configured.');
    }

    // Auto-detect Gmail: if host mentions gmail, or if username ends with @gmail.com
    const isGmail = rawHost.toLowerCase().includes('gmail.com') || user.toLowerCase().endsWith('@gmail.com');

    if (isGmail) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass
            }
        });
    }

    const host = rawHost || 'mail.shreenari.com';
    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Resolves safe From sender address matching the active mail transport
 */
export const getFromAddress = () => {
    const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const envFrom = (process.env.EMAIL_FROM || '').trim();
    
    // If authenticated via Gmail, sender address MUST be the Gmail user for Gmail SMTP to allow it
    if (user.toLowerCase().endsWith('@gmail.com')) {
        return `"RamBhaji Notifications" <${user}>`;
    }

    if (envFrom) {
        return envFrom;
    }

    return '"RamBhaji Admin" <noreply@shreenari.com>';
};

/**
 * Resolves the actual live frontend purchase URL
 */
export const getPurchaseUrl = () => {
    if (process.env.PURCHASE_DEMAND_URL) {
        return process.env.PURCHASE_DEMAND_URL;
    }
    const envUrl = process.env.FRONTEND_URL || '';
    if (envUrl && !envUrl.includes('localhost')) {
        return `${envUrl.replace(/\/$/, '')}/admin/products?tab=purchase`;
    }
    // Default actual live frontend domain
    return 'https://rambhaji.frontend.shreenari.com/admin/products?tab=purchase';
};

/**
 * Generates responsive, modern HTML email template
 */
const generateEmailTemplate = ({ recipientName, purchaseUrl, dateStr }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Purchase Demand - RamBhaji</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">RamBhaji</h1>
              <p style="color: #d1fae5; margin: 6px 0 0 0; font-size: 15px; font-weight: 500;">Fresh Delivery Subscription System</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 35px 30px 25px 30px;">
              <div style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 13px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 18px;">
                ⏰ Daily 8:10 PM Notification
              </div>

              <h2 style="margin: 0 0 14px 0; font-size: 21px; font-weight: 700; color: #111827;">
                Kal ke liye Mandi Purchase Demand Taiyar Hai 🥦🥕
              </h2>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Namaste <strong>${recipientName || 'Admin / Purchase Team'}</strong>,
              </p>

              <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Aane wale kal (${dateStr || 'Next Day'}) ke sabhi confirmed orders, package subscriptions aur retail demands ke aadhar par purchase demand list generate ho chuki hai.
              </p>

              <!-- Highlight Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
                      Direct Purchase Entry Link:
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">
                      Mandi se laye hue maal ka wajan (weight) aur purchase price log karne ke liye link kholein.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${purchaseUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 15px 36px; font-size: 16px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                  Open Purchase Demand List →
                </a>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 25px 0 0 0; font-size: 12px; color: #9ca3af; word-break: break-all; text-align: center; line-height: 1.5;">
                Yadi button kaam na kare, toh yeh URL apne browser me copy-paste karein:<br>
                <a href="${purchaseUrl}" target="_blank" style="color: #059669; text-decoration: underline;">${purchaseUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 22px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Yeh automated notification RamBhaji Admin System dwara bheji gayi hai.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">
                © ${new Date().getFullYear()} RamBhaji • All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Sends purchase demand notification email to a list of recipients
 * @param {Array<string|Object>} recipients - Array of emails or { email, name } objects
 * @param {string} customUrl - Optional custom URL override
 */
export const sendPurchaseDemandEmails = async (recipients = [], customUrl = null) => {
    if (!recipients || recipients.length === 0) {
        console.log('[MAILER] No recipients provided for purchase demand email.');
        return { success: true, count: 0, sent: [] };
    }

    const transporter = getTransporter();
    const fromAddress = getFromAddress();
    const purchaseUrl = customUrl || getPurchaseUrl();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const results = [];
    const errors = [];

    for (const item of recipients) {
        const email = typeof item === 'string' ? item.trim() : item.email.trim();
        const recipientName = typeof item === 'object' && item.name ? item.name : '';

        if (!email) continue;

        const htmlContent = generateEmailTemplate({ recipientName, purchaseUrl, dateStr });

        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `🛒 Kal ki Purchase Demand List (${dateStr}) - RamBhaji`,
                html: htmlContent,
                text: `Namaste ${recipientName || 'Admin'},\n\nKal ke liye Mandi Purchase Demand list taiyar ho chuki hai.\nNeeche diye gaye link par jakar details check karein:\n${purchaseUrl}\n\nRamBhaji Admin System`
            });

            console.log(`[MAILER] Email successfully sent to ${email}: ${info.messageId}`);
            results.push({ email, success: true, messageId: info.messageId });
        } catch (error) {
            console.error(`[MAILER] Failed to send email to ${email}:`, error.message);
            errors.push({ email, error: error.message });
        }
    }

    return {
        success: results.length > 0,
        totalAttempted: recipients.length,
        sentCount: results.length,
        sent: results,
        failed: errors
    };
};

/**
 * Sends a single test email to verify SMTP configuration
 */
export const sendTestEmail = async (targetEmail, targetName = 'Admin Tester') => {
    const transporter = getTransporter();
    const fromAddress = getFromAddress();
    const purchaseUrl = getPurchaseUrl();

    const todayStr = new Date().toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const htmlContent = generateEmailTemplate({
        recipientName: targetName,
        purchaseUrl,
        dateStr: `${todayStr} (Test Run)`
    });

    const info = await transporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject: `[TEST EMAIL] RamBhaji Purchase Demand Notification Test`,
        html: htmlContent,
        text: `RamBhaji Email Test\nTarget URL: ${purchaseUrl}`
    });

    return info;
};
