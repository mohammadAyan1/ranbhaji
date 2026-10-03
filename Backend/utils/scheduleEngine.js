/**
 * Generates delivery dates based on RamBhaji business rules.
 * - gap_days = 30 / services_per_month
 * - Sunday rule: if a date falls on Sunday, shift to Saturday (previous day)
 * - Only that single date moves; subsequent dates keep original spacing
 *
 * @param {string} startDate - ISO date string e.g. "2024-01-10"
 * @param {number} servicesPerMonth - how many deliveries per 30-day cycle
 * @param {number} cycles - how many 30-day cycles (1 for monthly, 12 for yearly)
 * @returns {string[]} Array of ISO date strings
 */
export const generateDeliveryDates = (startDate, servicesPerMonth, cycles = 1) => {
    const gap_days = 30 / servicesPerMonth;
    const totalServices = servicesPerMonth * cycles;
    const dates = [];

    const startParts = startDate.split('-').map(Number);
    const baseTime = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);

    // Calculate the interval between deliveries so they fit perfectly within a 30-day window.
    // For 5 services: 29 / 4 = 7.25 (Difference of 7 days: 1, 8, 15, 22, 29) -> 6 empty days gap.
    // This perfectly matches the user's logic while remaining safe for other numbers of services (like 10 or 15)
    // without exceeding the 30 day limit.

    let interval_days;

    // Custom gap rules requested by user
    // Gap means empty days between deliveries, so interval is gap + 1
    switch (servicesPerMonth) {
        case 5:
            interval_days = 7; // 6 days gap
            break;
        case 6:
            interval_days = 6; // 5 days gap (Assuming the second '5 serving' was a typo for 6)
            break;
        case 7:
            interval_days = 5; // 4 days gap
            break;
        case 8:
            interval_days = 4; // 3 days gap
            break;
        case 9:
            interval_days = 3; // 2 days gap
            break;
        default:
            // Fallback for other serving counts
            interval_days = servicesPerMonth > 1 ? Math.floor(29 / (servicesPerMonth - 1)) : 0;
            break;
    }

    for (let i = 0; i < totalServices; i++) {
        const dateVal = new Date(baseTime + (i * interval_days) * 24 * 60 * 60 * 1000);

        if (dateVal.getUTCDay() === 0) { // Sunday
            if (servicesPerMonth === 9) {
                dateVal.setUTCDate(dateVal.getUTCDate() + 1); // Shift forward to Monday for 9 services
            } else {
                dateVal.setUTCDate(dateVal.getUTCDate() - 1); // Shift back to Saturday for all others
            }
        }

        dates.push(dateVal.toISOString().split('T')[0]);
    }

    return dates;
};

/**
 * Calculate seasonal budget per service
 */
export const calcSeasonalBudget = (packagePrice, servicesPerMonth, fixedItems) => {
    const per_service_amount = parseFloat(packagePrice) / parseInt(servicesPerMonth);
    let fixed_cost = 0;
    for (const item of fixedItems) {
        fixed_cost += parseFloat(item.qty_gm) * parseFloat(item.purchase_price_per_gm || item.selling_price_per_gm);
    }
    return {
        per_service_amount,
        fixed_cost_per_service: fixed_cost,
        seasonal_budget_per_service: per_service_amount - fixed_cost
    };
};

/**
 * Calculate yearly package amount with 25% discount
 */
export const calcYearlyAmount = (monthlyPrice) => {
    const annual_total = parseFloat(monthlyPrice) * 12;
    const discount = annual_total * 0.25;
    return {
        annual_total,
        discount,
        final_yearly_amount: annual_total - discount,
        total_services_yearly: null // set from services_per_month * 12
    };
};
