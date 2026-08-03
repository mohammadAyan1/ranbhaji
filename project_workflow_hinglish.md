# Project Flow aur Architecture: Rambhaji (FreshBox)

Ye document Rambhaji (FreshBox) project ke overall logic aur features ka detailed overview hai. Yahan packages, retail orders, delivery aur admin portal ke workflow ko explain kiya gaya hai.

---

## 1. Package Lene Ka Flow (Subscription Flow)

User ke perspective se package subscribe karne ka process kuch is tarah hoga:

1. **Packages Browse Karna:** 
   User app ya website open karega aur available `Packages` dekhega. Package teen types ke hote hain: `standard`, `custom` (user ki pasand ke items), aur `yearly`.
   
2. **Package Select aur Customize Karna:** 
   - Har package me kuch **Fixed Items** hote hain (jo regular milenge) aur kuch **Seasonal Items** (jo user change kar sakta hai ek pool/list me se).
   - User choose karega ki uski family me kitne log hain (`num_persons`) aur mahine me kitni delivery chahiye (`services_per_month`).
   
3. **Subscription Purchase:** 
   - User address select karega ya naya address add karega.
   - User payment karega (Wallet se ya Razorpay/PhonePe ke through). 
   - Ek naya `Subscription` create ho jayega jiska status `active` hoga. Isme user ki total services, start date aur end date record ho jayegi.

---

## 2. Serving aur Delivery Ka Flow

Ek baar user ka package active hone ke baad system deliveries ko manage karta hai:

1. **Delivery Schedule Generate Hona:**
   - User ki services (e.g. 10 bar in a month) ke hisaab se backend automatically `DeliverySchedule` entries create karta hai dates ke sath.
   
2. **Items aur Seasonal Selection:**
   - Har delivery date pe user ko jo samaan milega, wo `DeliveryItems` me add hoga.
   - User chahe to apne seasonal items select kar sakta hai next delivery ke liye (`ScheduleSeasonalSelection`). Agar user select nahi karta, to system auto-assign kar deta hai (`is_auto = true`).

3. **Delivery Process (Delivery Boy's End):**
   - Delivery schedule ek particular batch ya route me `delivery_boy` ko assign hota hai.
   - Delivery boy app me dekh sakta hai ki kis user ke address pe kya deliver karna hai (`status: ready_for_delivery`).
   - Delivery complete hone ke baad delivery boy `status: delivered` mark karega aur proof ke taur pe `delivery_photo_url` capture kar sakta hai.

4. **Return aur Skip (Pause):**
   - User chahe to apni upcoming delivery pause ya skip kar sakta hai (`PauseLog`). Jo deliveries skip hongi wo end date ko aage badha dengi (extra services add ho jayengi).
   - Agar kuch kharab nikalta hai, to item return bhi ho sakta hai (`return_qty` aur `return_reason` recorded hota hai).

---

## 3. Retail Orders Ka Flow (One-Time Purchases)

Bina package (subscription) ke bhi user aam (retail) order place kar sakta hai:

1. **Items Cart me add karna:** 
   User app me products dekhta hai aur directly cart me quantities (grams/kgs me) add karta hai.
   
2. **Checkout:** 
   - User payment method (COD, Wallet ya PhonePe) aur delivery address choose karta hai.
   - Retail delivery pe delivery charge (e.g., Rs. 30) bhi apply ho sakta hai agar order total kam ho.
   - Order confirm hone pe ek naya `RetailOrder` banta hai jiska status `pending` hota hai.

3. **Delivery:**
   - Yeh order delivery boy ko assign hota hai. 
   - Delivery hone pe `RetailOrder` ka `delivery_status` change hoke `delivered` ho jata hai. Agar COD tha to `payment_status` update kiya jata hai.

---

## 4. Admin Authorities aur Data Visibility

Admin system ka boss hai. Uske paas role `admin` hota hai aur usko ek special dashboard (Admin Panel) dikhta hai. Admin ka kaam backend ki operations handle karna hai.

### Admin Ko Kya Kya Dekhne Milta Hai?

1. **Users & Wallets:**
   - Saare customers, unki details, balances, wallets aur unka status.
   - Kaunse users defaulters hain (`due_amount` bacha hua hai).

2. **Inventory aur Stock:**
   - `Products` table ka poora control - Naye products add karna, pricing set karna, aur stock check karna.
   - `PurchaseLog` - Market/vendor se jo sabzi kharidi gayi hai uska record (Kitne rate pe kharidi, kitni bechi).
   - `current_stock`, `total_purchased_qty`, aur `total_sold_qty`.

3. **Packages & Subscriptions Management:**
   - Naye `Packages` create karna, fixed/seasonal items configure karna.
   - Saari active, paused ya cancelled subscriptions dekhna.

4. **Batch Processing (Back-office work):**
   - Sabzi lane ke baad use clean karna, sukhana, katna, pack karna. In sab cheezon ki time tracking `BatchProcessingLog` aur product ke time fields (cleaning_time, cutting_time, etc.) ke through hoti hai.
   
5. **Orders & Deliveries Monitoring:**
   - Aaj ki saari scheduled deliveries aur retail orders list.
   - Assign karna ki konsa Delivery Boy kaunse orders le jayega.
   - Kitne items miss ho gaye ya wapas aaye (`MissedProductLog`, `ReturnedProductLog`).

### Admin Ki Authorities (Powers)
- **Financial Controls:** Wallet transactions manually credit/debit karna (override), due payments clear karna, prices update karna.
- **Operations:** Delivery schedule manually lock karna, batch create karna, deliveries ko reschedule ya cancel karna.
- **Approvals:** Agar kisi user ne return request daali hai (kuch kharab nikalne par), to admin use approve ya reject kar sakta hai (`return_status`).
- **Reports:** Credit log dekhna, monthly revenue, missing ya damage items ka loss track karna.
