-- ============================================================
-- 🔄 TESTING RESET QUERY - RamBhaji Production System
-- ============================================================
-- Yeh query sirf batch_product_tasks aur task_worker_assignments
-- ko reset karti hai. Products, batches, demands sab safe rahenge.
-- 
-- ⚠️  BATCH 4 (9-12Pm) ke liye reset hai.
--     Dono batch reset karna ho toh neeche dono queries chalao.
-- ============================================================

-- Step 1: Pehle worker assignments saaf karo
DELETE FROM task_worker_assignments
WHERE task_id IN (
    SELECT id FROM batch_product_tasks WHERE batch_id IN (3, 4)
);

-- Step 2: Saare batch product tasks delete karo (BUCKET_ARRANGE bhi)
DELETE FROM batch_product_tasks WHERE batch_id IN (3, 4);

-- Step 3: Batch splits jo soaking/drying status mein atke hain unhe reset karo
UPDATE batch_splits 
SET status = 'waiting', completed_at = NULL 
WHERE status IN ('completed') AND batch_id IN (3, 4);

-- ============================================================
-- ✅ Ab app mein "Fetch Next Task" dabao - Naya kaam shuru hoga!
-- ============================================================

-- VERIFY: Check karo ki sab theek hai
SELECT 
    b.name AS batch_name,
    COUNT(CASE WHEN bpd.product_id IS NOT NULL THEN 1 END) AS total_demands,
    COUNT(bpt.id) AS remaining_tasks
FROM batches b
LEFT JOIN batch_product_demands bpd ON bpd.batch_id = b.id
LEFT JOIN batch_product_tasks bpt ON bpt.batch_id = b.id
WHERE b.id IN (3, 4)
GROUP BY b.id, b.name;




START TRANSACTION;

UPDATE batch_product_tasks
SET
    status = 'DONE',
    remaining_seconds = 0,
    completed_at = NOW(),
    updated_at = NOW()
WHERE id IN (377, 381, 383, 385)
  AND status = 'PAUSED';
  

COMMIT;