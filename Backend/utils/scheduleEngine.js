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

    for (let i = 0; i < totalServices; i++) {
        const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);

        if (dateVal.getUTCDay() === 0) { // Sunday
            dateVal.setUTCDate(dateVal.getUTCDate() - 1); // Shift back to Saturday
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
