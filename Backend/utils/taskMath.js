/**
 * Computes processing stage durations based on strict requirements.
 */

/**
 * Calculate weighing time.
 * Always done once for the full batch demand quantity in one shot.
 */
export const calculateWeighingDuration = (product) => {
    return product.weighing_time_seconds || 0;
};

/**
 * Calculate soaking time.
 * Fixed, regardless of how much quantity is placed.
 */
export const calculateSoakingDuration = (product) => {
    return product.soaking_time_seconds || 0;
};

/**
 * Calculate cutting time.
 * @param {Object} product The product object
 * @param {Number} quantityGrams The quantity to cut in grams
 */
export const calculateCuttingDuration = (product, quantityGrams) => {
    const q = Number(quantityGrams) || 0;

    const isPerPiece = product.cutting_mode === 'PER_PIECE' && product.pieces_per_25g != null;

    if (isPerPiece) {
        const totalPieces = (q / 25) * Number(product.pieces_per_25g);
        return totalPieces * (Number(product.time_per_piece_seconds) || 0);
    } else {
        // PER_25G fallback
        return (q / 25) * (Number(product.time_per_25g_seconds) || 0);
    }
};

/**
 * Calculate drying time (Default Machine time, or piece/gram fallback if machine time is 0).
 * Used when initially scheduling or machine mode.
 */
export const calculateDryingDuration = (product, quantityGrams = 0) => {
    if (!product) return 0;
    if (product.drying_time_seconds && Number(product.drying_time_seconds) > 0) {
        return Number(product.drying_time_seconds);
    }
    // Fallback: If machine drying is 0, check if piece or 25g drying time is set
    if (product.drying_time_per_piece_seconds && Number(product.drying_time_per_piece_seconds) > 0) {
        if (quantityGrams > 0 && product.pieces_per_25g) {
            const totalPieces = (Number(quantityGrams) / 25) * Number(product.pieces_per_25g);
            return Math.ceil(totalPieces * Number(product.drying_time_per_piece_seconds));
        }
        return Number(product.drying_time_per_piece_seconds) * 10 || 30;
    }
    if (product.drying_time_per_25g_seconds && Number(product.drying_time_per_25g_seconds) > 0) {
        if (quantityGrams > 0) {
            return Math.ceil((Number(quantityGrams) / 25) * Number(product.drying_time_per_25g_seconds));
        }
        return Number(product.drying_time_per_25g_seconds) * 10 || 30;
    }
    return 0;
};

/**
 * Recalculate drying time based on drying mode and quantity.
 * @param {Object} product The product object
 * @param {Number} quantityGrams The quantity to dry in grams
 * @param {String} dryingMode 'machine', 'piece', or 'gram'
 */
export const recalculateDryingDuration = (product, quantityGrams, dryingMode) => {
    if (!dryingMode || dryingMode === 'machine') {
        return calculateDryingDuration(product);
    }

    const q = Number(quantityGrams) || 0;

    if (dryingMode === 'piece' && product.pieces_per_25g != null) {
        const totalPieces = (q / 25) * Number(product.pieces_per_25g);
        return totalPieces * (Number(product.drying_time_per_piece_seconds) || 0);
    } else {
        // gram base or fallback
        return (q / 25) * (Number(product.drying_time_per_25g_seconds) || 0);
    }
};

/**
 * Total product processing time used for scheduling priority
 */
export const calculateTotalProductTime = (product, batchQuantityGrams) => {
    const weigh = calculateWeighingDuration(product);
    const soak = calculateSoakingDuration(product);
    const cut = calculateCuttingDuration(product, batchQuantityGrams);
    const dry = calculateDryingDuration(product);
    return weigh + soak + cut + dry;
};

/**
 * Recalculate remaining time when worker count changes (Joint Task Math)
 * remainingTimeSeconds = remainingWorkUnits / newWorkerCount
 */
export const recalculateRemainingTime = (currentRemainingSeconds, oldWorkerCount, newWorkerCount) => {
    if (newWorkerCount === 0) return currentRemainingSeconds;
    const effectiveOldCount = oldWorkerCount > 0 ? oldWorkerCount : 1;
    const remainingWorkUnits = currentRemainingSeconds * effectiveOldCount;
    return Math.floor(remainingWorkUnits / newWorkerCount);
};

/**
 * Robustly calculate elapsed seconds since a task started,
 * avoiding timezone offset bugs from Sequelize parsing.
 */
export const calculateElapsedRealSeconds = (startedAt) => {
    if (!startedAt) return 0;
    const now = new Date();
    const started = new Date(startedAt);
    const elapsed = Math.floor((now.getTime() - started.getTime()) / 1000);
    return elapsed > 0 ? elapsed : 0;
};
