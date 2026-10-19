<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# Canteen Management System Blueprint (Module 22)

The Classgrid Canteen Module is a premium offering designed to eliminate cash-handling chaos, pre-order confusion, and queue bottlenecks during peak college lunch hours. It acts as an internal Swiggy/Zomato specifically tailored for educational institutions.

## Core Objective
To allow students to pre-order and pay for food directly via the Classgrid app, ensuring their order is ready for pickup during break time. Specifically, **payments route directly to the canteen owner's Razorpay account**, absolving Classgrid from accounting liabilities for physical goods. Canteen staff receive orders in a live, real-time Socket.io queue.

> [!IMPORTANT]
> **Tenant-Specific Payment Architecture**
> The system will require organizations to input their *own* Razorpay `KEY_ID` and `KEY_SECRET` in the Org Settings (under Canteen configuration). The payment gateway will instantiate using the *tenant's* keys, ensuring funds settle directly into the canteen owner's bank account. Classgrid will neither touch nor hold this money.

## Key Features

1. **Smart Order Aggregation (Kitchen Display):** Instead of showing 14 individual tickets for Vada Pavs scattered across a screen, the system aggregates identical items from the 'NEW' column into a bold top banner: *"🔥 Preparing Now: 14x Vada Pav, 5x Tea"*. This heavily reduces kitchen confusion.
2. **Scan-to-Order (Walk-Ins):** Students who forgot to pre-order can scan a Razorpay QR code at the canteen counter. This routes them instantly to the Classgrid Canteen Menu without navigating menus.
3. **Queue Transparency:** Students can check the app to see their position in the queue (e.g., *"3 orders ahead of yours"*).
4. **Instant Sold-Out Toggles:** Canteen staff can tap a single button to mark an item 'Out of Stock', instantly removing it from the student-facing app to prevent refunds.
5. **Student Canteen Insights:** Students have their own dashboard showing total monthly spending, order history, and the ability to rate items (1-5 stars) after purchase. If a parent asks where their allowance went, the student can just pull up the monthly expense report.
6. **Data-Driven Canteen Analytics:** Admin dashboard tracking top-selling items, highest-rated food, lowest-rated food, and overall student behavior.
7. **Two Operating Modes:** 'Live Kitchen Mode' for large canteens with staff to manage a screen, and a simple 'Digital Token Mode' (Pay & Show Receipt) for small canteens without dedicated screen staff.

---

## 1. Database Schema Additions (MongoDB)

We will introduce two new collections to handle canteen operations.

### `CanteenItem` Collection
Holds the menu for a specific organization's canteen.
- `_id`: ObjectId
- `orgId`: Reference to Organization
- `name`: String (e.g., "Vada Pav")
- `price`: Number (in INR)
- `category`: String (e.g., "Snacks", "Beverages", "Meals")
- `isAvailable`: Boolean (Toggle to mark item out of stock instantly)
- `imageUrl`: String (Optional)
- `prepTimeAvgMinutes`: Number (To estimate queue times)
- `averageRating`: Number (1-5 scale)
- `totalRatings`: Number

### `CanteenOrder` Collection
Tracks the lifecycle of an individual student's order.
- `_id`: ObjectId
- `transactionId`: String (Razorpay Payment ID / `pay_xxx`)
- `orgId`: Reference to Organization
- `studentId`: Reference to User
- `items`: Array
  - `itemId`: Reference to CanteenItem
  - `quantity`: Number
  - `priceAtPurchase`: Number (Prevents historical price changes from affecting past receipts)
  - `rating`: Number (1-5, Optional)
- `totalAmount`: Number
- `status`: Enum (`['PENDING_PAYMENT', 'NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']`)
- `paymentStatus`: Enum (`['SUCCESS', 'FAILED', 'REFUNDED']`)
- `createdAt` / `updatedAt`: Timestamps

---

## 2. API Endpoints (Node.js/Express)

**Menu Management (`/api/canteen/menu`)**
- `POST /` - Admin creates new item
- `GET /` - Fetch active menu for the org
- `PUT /:id/toggle-availability` - Fast toggle for sold-out items

**Order Lifecycle (`/api/canteen/order`)**
- `POST /create-razorpay-order` - Calculates total server-side, fetches the tenant's Razorpay keys, and generates an order ID.
- `POST /verify-payment` - Verifies the signature, marks the order `NEW`, and emits a Socket.io event to the canteen staff.
- `GET /history/student` - Student views their receipt and total monthly spending.
- `POST /:id/rate` - Student rates the items in an order (1-5 stars).
- `GET /queue/live` - Pre-fetches the day's active queue for the canteen staff dashboard.
- `PUT /:id/status` - Canteen staff updates order status (PREPARING -> READY -> DELIVERED).

---

## 3. Real-Time Engine Integration (Socket.io)

We will leverage the existing `socket.service.js` to create frictionless live updates.

**Socket Events:**
- `canteen_new_order`: Emitted by server when payment succeeds. The canteen dashboard instantly injects the new order card into the 'NEW' column with an alert sound.
- `canteen_status_update`: Emitted when staff mark an order as 'READY'. The student receives a real-time push notification 🔔 "Your order is ready for pickup at Counter A".

---

## 4. Frontend UI Pages (React)

### For Students: Mobile-First Menu Page
**Path:** `/canteen/menu`
- **Tabbed Interface:** The very top of the screen has a toggle: `[ Instant Buy ] | [ Pre-Order ]`.
    - *Instant Buy Tab:* Triggers the "Without Max" walk-up flow. Token is generated instantly for counter presentation.
    - *Pre-Order Tab:* Triggers the "Max Mode" flow. Instructs the student to pick up their food at a specific time (e.g. Lunch Break at 1:00 PM).
- A clean grid of menu items categorised nicely.
- Persistent sticky bottom bar: `Cart: ₹180 | Proceed to Pay`.
- After payment, transitions to an **Order Tracking Screen** showing live status.

### For Canteen Staff: Two Operating Modes (Dashboard Always Active)

Every canteen will have the Dashboard open to track daily revenue and incoming orders. The difference is in *how* they process the queue.

***Mode A: Without Max Mode (Instant Walk-Up)***
Designed for fast, immediate transactions directly at the counter.
- Student pays on the app while standing at the counter.
- Student shows the app generating a large, colorful unique **Token Receipt**.
    - *Token MUST show: Amount Paid, Student Name, Token Number, Item Names, Time of Razorpay payment.*
    - *Token MUST NOT show: PRN (Roll Number).*
- Staff glances at the phone, hands over the food. 
- *Crucially:* The canteen dashboard logs the money and order stats instantly, but the staff **does not need to click anything** to clear the order. It handles it automatically to keep the line moving.

***Mode B: Max Mode (Pre-Order & Tracking)***
Designed for lunch pre-orders placed 15-30 minutes *before* break time.
- Student places a ₹60 Sandwich order while in class.
- The Canteen Dashboard instantly receives the order and payment confirmation.
- The dashboard keeps this order actively pending on the screen.
- When the student physically arrives and shows their token, the staff hands them the sandwich and **manually clicks "Mark Order Completed"**.
- This ensures the canteen knows exactly who has collected their pre-paid food and who hasn't.

### For Admin & Canteen Owner: Data-Driven Analytics
**Path:** `/org/canteen-analytics`
- **Sales Analytics:** Total revenue across days, weeks, and months.
- **Top Performers:** Grid showing the most ordered items (e.g., 2,500 Vada Pavs sold this month).
- **Quality Control:** Insights tracking the highest-rated and lowest-rated items so the canteen can improve food quality based on student feedback.

---

## 5. Implementation Phases & Walkthrough

1. **Phase 1: Razorpay Tenant Injection**
   Update `payment.service.js` to accept dynamic, per-org Razorpay keys fetched from the database instead of the rigid `process.env` keys.
2. **Phase 2: Database & Menu Setup**
   Build the Mongoose models and the Admin UI to populate the initial menu items.
3. **Phase 3: The Student Cart & Checkout**
   Build the frontend cart state, wire it to the dynamic Razorpay gateway, and successfully insert a `NEW` order record.
4. **Phase 4: The Live Kitchen Display**
   Build the socket-powered Kanban board for the canteen staff and the aggregator logic.

---

## User Review Required

> [!WARNING]
> Because you want payments to go to the canteen owner, we must store their Razorpay API keys in our MongoDB database. I will encrypt these keys in the database for security using AES-256 before saving them, so even if the DB is compromised, the keys are safe. Do you agree with this approach?
