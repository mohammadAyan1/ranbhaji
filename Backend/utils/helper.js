import jwt from "jsonwebtoken";

export const generateOTP = () => {

    return Math.floor(
        100000 +
        Math.random() * 900000
    ).toString();
};

export const generateToken = (id) => {

    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );
};

/**
 * Normalizes various date inputs (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ISO string, or day number) into 'YYYY-MM-DD'.
 */
export const normalizeDateString = (input) => {
    if (!input) return null;
    let str = String(input).trim();

    // If user passed just day number e.g. 16 or '16'
    if (/^\d{1,2}$/.test(str)) {
        const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const y = nowIST.getFullYear();
        const m = String(nowIST.getMonth() + 1).padStart(2, '0');
        const d = String(str).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Remove time part if ISO string e.g. 2026-10-16T...
    if (str.includes('T')) {
        str = str.split('T')[0];
    }

    if (str.includes('-')) {
        const parts = str.split('-').map(s => s.trim());
        if (parts.length === 3) {
            if (parts[0].length === 4) { // YYYY-MM-DD
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else if (parts[2].length === 4) { // DD-MM-YYYY
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
    }

    if (str.includes('/')) {
        const parts = str.split('/').map(s => s.trim());
        if (parts.length === 3) {
            if (parts[0].length === 4) { // YYYY/MM/DD
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else if (parts[2].length === 4) { // DD/MM/YYYY
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    return null;
};

/**
 * Returns the earliest allowed start/restart date string (YYYY-MM-DD) based on 8 PM IST cutoff rule.
 * Before 8 PM IST: tomorrow.
 * At or after 8 PM IST: day after tomorrow.
 */
export const getEarliestCutoffDate = () => {
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const currentHour = nowIST.getHours();
    const daysToAdd = currentHour >= 20 ? 2 : 1;

    const minDateIST = new Date(nowIST);
    minDateIST.setDate(minDateIST.getDate() + daysToAdd);

    const y = minDateIST.getFullYear();
    const m = String(minDateIST.getMonth() + 1).padStart(2, '0');
    const d = String(minDateIST.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Calculates number of inclusive days between two YYYY-MM-DD date strings.
 */
export const getDaysBetween = (from, to) => {
    const fParts = from.split('-').map(Number);
    const tParts = to.split('-').map(Number);
    const fTime = Date.UTC(fParts[0], fParts[1] - 1, fParts[2]);
    const tTime = Date.UTC(tParts[0], tParts[1] - 1, tParts[2]);
    return Math.round((tTime - fTime) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Returns date string (YYYY-MM-DD) for 1 day after the provided date.
 */
export const getDayAfterDate = (dateStr) => {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
    return d.toISOString().split('T')[0];
};

/**
 * Returns date string (YYYY-MM-DD) for 1 day before the provided date.
 */
export const getDayBeforeDate = (dateStr) => {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] - 1));
    return d.toISOString().split('T')[0];
};
