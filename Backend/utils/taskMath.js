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
 * Calculate drying time.
 * Fixed, regardless of quantity.
 */
export const calculateDryingDuration = (product) => {
    return product.drying_time_seconds || 0;
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
