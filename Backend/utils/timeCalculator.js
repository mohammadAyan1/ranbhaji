export const calculateProductProcessingTime = (productConfig, qty_kg, worker_count = 1) => {
    // Convert kg to grams
    const qty_g = qty_kg * 1000;

    // Number of plans
    const num_plans = qty_g / (productConfig.plan_weight_g || 1);

    // 1. Fixed Stages
    const soak_time = parseFloat(productConfig.soak_time_min) || 0;
    const weigh_time_start = parseFloat(productConfig.weigh_time_min) || 0;
    const weigh_time_end = parseFloat(productConfig.weigh_time_min) || 0;

    // 2. Cleaning & Cutting Stage (Worker scalable)
    let pieces = null;
    let clean_cut_total_work_minutes = 0;

    if (productConfig.is_piece_based) {
        // Piece-based (e.g., potatoes)
        pieces = (qty_g / 25) * (parseFloat(productConfig.pieces_per_25g) || 0);
        clean_cut_total_work_minutes = pieces * (parseFloat(productConfig.clean_cut_time_per_piece_min) || 0);
    } else {
        // Weight-based (e.g., leafy greens)
        clean_cut_total_work_minutes = (qty_g / 25) * (parseFloat(productConfig.clean_cut_time_per_25g_min) || 0);
    }

    const clean_cut_effective_time = clean_cut_total_work_minutes / Math.max(1, worker_count);

    // 3. Drying Stage
    const dry_loads_needed = 1;
    const dry_time_total = parseFloat(productConfig.dry_cycle_time_min) || 0;

    // 4. Wrapping & Packing Stages
    const wrap_time_total = num_plans * (parseFloat(productConfig.wrap_time_per_plan_min) || 0);
    const pack_time_total = num_plans * (parseFloat(productConfig.pack_time_per_plan_min) || 0);

    // 5. Grand Total Time
    const total_time_min = soak_time + weigh_time_start + clean_cut_effective_time +
        weigh_time_end + dry_time_total + wrap_time_total + pack_time_total;

    return {
        num_plans: Number(num_plans.toFixed(2)),
        pieces: pieces !== null ? Number(pieces.toFixed(2)) : null,
        stages: {
            soaking: { time_min: Number(soak_time.toFixed(2)) },
            weighing_start: { time_min: Number(weigh_time_start.toFixed(2)) },
            cleaning_cutting: {
                total_work_minutes: Number(clean_cut_total_work_minutes.toFixed(2)),
                worker_count,
                effective_time_min: Number(clean_cut_effective_time.toFixed(2))
            },
            weighing_end: { time_min: Number(weigh_time_end.toFixed(2)) },
            drying: {
                loads_needed: dry_loads_needed,
                time_min: Number(dry_time_total.toFixed(2))
            },
            wrapping: { time_min: Number(wrap_time_total.toFixed(2)) },
            packing: { time_min: Number(pack_time_total.toFixed(2)) }
        },
        total_time_min: Number(total_time_min.toFixed(2))
    };
};
