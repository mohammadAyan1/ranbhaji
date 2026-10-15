# 💧 Water Subscription Delivery Scheduling Implementation Plan

## 1. Problem Overview & Current Behavior

### 🔴 Current Issue:
Currently, when a user purchases a 30-day water package (e.g. Daily frequency for 30 bottles/deliveries), the system generates delivery dates using the following formula:
```javascript
for (let i = 0; i < totalServices; i++) {
    const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);

    if (dateVal.getUTCDay() === 0) { // Sunday rule: shift to Saturday
        dateVal.setUTCDate(dateVal.getUTCDate() - 1);
    }
    dates.push(dateVal.toISOString().split('T')[0]);
}
```

### Why this is problematic:
1. **Double delivery on Saturday:** Because Sunday delivery is shifted backwards to Saturday (`- 1`), Saturday already has its own delivery **plus** Sunday's shifted delivery. The delivery boy gets 2 delivery tasks on Saturday for the same customer.
2. **Fixed 30 calendar days window:** The system compresses 30 services into strictly 30 calendar days at the expense of doubling deliveries on Saturdays.

---

## 2. New Desired Behavior

1. **🚫 No deliveries on Sundays:** Sundays will have **0** deliveries scheduled.
2. **✅ No duplicate/double deliveries on Saturdays:** Saturday will only receive its standard **1** delivery.
3. **⏩ Forward Extension (Skip Sunday):**
   - Whenever Sunday arrives, the schedule skips Sunday and continues on Monday.
   - For **Daily (30 services):**
     - Mon to Sat (6 deliveries per week).
     - Sundays skipped.
     - 30 services will naturally take **~35 calendar days** (around 5 weeks).
   - For **Alternate (15 services):**
     - Delivery every 2 days. If a scheduled delivery lands on a Sunday, it shifts forward to Monday.
     - 15 services will naturally take **~34-35 calendar days**.

---

## 3. Comparison Example (Start Date: Friday, Oct 16, 2026)

| Service # | Current Logic (Faulty) | New Logic (Extended Working Days) |
| :--- | :--- | :--- |
| Service 1 | Fri, 16 Oct 2026 | Fri, 16 Oct 2026 |
| Service 2 | Sat, 17 Oct 2026 | Sat, 17 Oct 2026 |
| Service 3 | **Sat, 17 Oct 2026** *(Duplicate from Sun!)* | **Mon, 19 Oct 2026** *(Sunday skipped)* |
| Service 4 | Mon, 19 Oct 2026 | Tue, 20 Oct 2026 |
| Service 5 | Tue, 20 Oct 2026 | Wed, 21 Oct 2026 |
| Service 6 | Wed, 21 Oct 2026 | Thu, 22 Oct 2026 |
| Service 7 | Thu, 22 Oct 2026 | Fri, 23 Oct 2026 |
| Service 8 | Fri, 23 Oct 2026 | Sat, 24 Oct 2026 |
| Service 9 | **Sat, 24 Oct 2026** *(Duplicate from Sun!)* | **Mon, 26 Oct 2026** *(Sunday skipped)* |
| ... | ... | ... |
| **Total Services** | **30 deliveries** | **30 deliveries** |
| **End Date** | Sat, 14 Nov 2026 (30 calendar days) | Thu, 19 Nov 2026 (35 calendar days) |
| **Saturday Deliveries** | **2 bottles / double delivery** ❌ | **1 bottle / single delivery** ✅ |
| **Sunday Deliveries** | 0 bottles | 0 bottles ✅ |

---

## 4. Files to be Modified & Exact Changes

### File 1: `Backend/utils/scheduleEngine.js`
Create and export a new centralized helper function: `generateWaterDeliveryDates(startDate, totalServices, frequency)`:
```javascript
/**
 * Generates water delivery dates:
 * - Sundays are completely skipped (0 deliveries on Sunday).
 * - Saturdays receive only 1 normal delivery (NO shifting Sunday to Saturday).
 * - Total services count is strictly preserved by extending the end date forward.
 */
export const generateWaterDeliveryDates = (startDate, totalServices, frequency = 'daily') => {
    const dates = [];
    const startParts = startDate.split('-').map(Number);
    let current = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));

    // If start date itself is Sunday, advance to Monday
    if (current.getUTCDay() === 0) {
        current.setUTCDate(current.getUTCDate() + 1);
    }

    while (dates.length < totalServices) {
        if (current.getUTCDay() !== 0) { // Not Sunday
            dates.push(current.toISOString().split('T')[0]);

            if (frequency === 'daily') {
                current.setUTCDate(current.getUTCDate() + 1);
            } else {
                // Alternate: every 2 days
                current.setUTCDate(current.getUTCDate() + 2);
                if (current.getUTCDay() === 0) {
                    current.setUTCDate(current.getUTCDate() + 1); // Shift Sunday to Monday
                }
            }
        } else {
            current.setUTCDate(current.getUTCDate() + 1);
        }
    }
    return dates;
};
```

---

### File 2: `Backend/controllers/water.controller.js`
Update two functions:

1. **`confirmWaterStartDate` (Lines ~216–235):**
   - Import `generateWaterDeliveryDates` from `../utils/scheduleEngine.js`.
   - Replace old loop with:
     ```javascript
     const dates = generateWaterDeliveryDates(start_date, sub.total_services, sub.frequency);
     const end_date = dates[dates.length - 1];
     ```

2. **`restartWaterSubscription` (Lines ~530–550):**
   - Replace old loop with:
     ```javascript
     const remainingServices = sub.total_services - sub.services_completed;
     const newDates = remainingServices > 0 
         ? generateWaterDeliveryDates(normalizedRestartDate, remainingServices, sub.frequency) 
         : [];
     const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : sub.end_date;
     ```

---

### File 3: `Backend/utils/cronJobs.js`
Update Water Auto-Restart when pause expires (Lines ~110–135):
- Import `generateWaterDeliveryDates` from `./scheduleEngine.js`.
- Replace old loop in step 0 (expired pauses for `p.water_subscription_id`) with:
  ```javascript
  const remainingServices = sub.total_services - sub.services_completed;
  const newDates = remainingServices > 0 
      ? generateWaterDeliveryDates(tomorrowStr, remainingServices, sub.frequency) 
      : [];
  const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : sub.end_date;
  ```

---

## 5. Verification & Testing Strategy

1. **Unit Testing Dates Generator:**
   - Test start on Monday, Friday, Saturday, and Sunday.
   - Verify `dates.length === totalServices`.
   - Verify `new Set(dates).size === dates.length` (No duplicate dates on Saturdays).
   - Verify `dates.every(d => new Date(d).getUTCDay() !== 0)` (No Sundays).
2. **Subscription Confirmation Test:**
   - Simulate confirming start date for a water subscription.
   - Verify delivery rows created in `delivery_schedule` table match the extended dates without duplicates.
3. **Restart Test:**
   - Test pausing a water subscription and restarting for a new date.
   - Verify remaining services are re-scheduled with Sunday extension rule.
