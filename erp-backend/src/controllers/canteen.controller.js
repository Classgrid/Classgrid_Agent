/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import CanteenItem from "../models/CanteenItem.js";
import CanteenOrder from "../models/CanteenOrder.js";
import Organization from "../models/Organization.js";
import RazorpayService from "../services/razorpay.service.js";
import { getIO } from "../services/socket.service.js";

function generateTokenNumber() {
    // Generate a 4 digit token like T-1432
    return "T-" + Math.floor(1000 + Math.random() * 9000);
}

// 🍔 MENU MANAGEMENT
export const createItem = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { name, price, category, imageUrl, prepTimeAvgMinutes } = req.body;

        const newItem = await CanteenItem.create({
            orgId,
            name,
            price,
            category,
            imageUrl,
            prepTimeAvgMinutes
        });

        res.status(201).json({ success: true, item: newItem });
    } catch (err) {
        res.status(500).json({ error: "Failed to create canteen item", details: err.message });
    }
};

export const getMenu = async (req, res) => {
    try {
        // Can be called by students (need only available items) or admins (all items)
        const orgId = req.user.organization_id;
        const items = await CanteenItem.find({ orgId }).sort({ category: 1, name: 1 });
        res.status(200).json({ success: true, items });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch menu", details: err.message });
    }
};

export const toggleAvailability = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;
        const { isAvailable } = req.body;

        const item = await CanteenItem.findOneAndUpdate(
            { _id: id, orgId },
            { isAvailable },
            { returnDocument: 'after' }
        );

        if (!item) return res.status(404).json({ error: "Item not found" });

        res.status(200).json({ success: true, item });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle availability", details: err.message });
    }
};

// 📆 DAILY SPECIALS
export const getDailySpecials = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = days[new Date().getDay()];

        const specials = await CanteenItem.find({
            orgId,
            isAvailable: true,
            isDailySpecial: true,
            specialDays: today
        }).sort({ category: 1 });

        // Map to show special price when applicable
        const mapped = specials.map(item => ({
            ...item.toObject(),
            effectivePrice: item.specialPrice || item.price,
            isSpecialToday: true
        }));

        res.json({ success: true, day: today, specials: mapped });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch daily specials", details: err.message });
    }
};

// ✏️ UPDATE ITEM
export const updateItem = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;
        const updates = req.body;

        // Prevent orgId tampering
        delete updates.orgId;
        delete updates._id;

        const item = await CanteenItem.findOneAndUpdate(
            { _id: id, orgId },
            { $set: updates },
            { returnDocument: 'after', runValidators: true }
        );

        if (!item) return res.status(404).json({ error: "Item not found" });
        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ error: "Failed to update item", details: err.message });
    }
};

// 🗑️ DELETE ITEM
export const deleteItem = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;

        const item = await CanteenItem.findOneAndDelete({ _id: id, orgId });
        if (!item) return res.status(404).json({ error: "Item not found" });

        res.json({ success: true, message: `"${item.name}" removed from menu.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete item", details: err.message });
    }
};

// 📦 BULK IMPORT MENU (Admin uploads JSON array of items)
export const bulkImportMenu = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { items } = req.body; // Array of { name, price, category, dietaryTags, ... }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items array is required and must not be empty." });
        }

        if (items.length > 200) {
            return res.status(400).json({ error: "Maximum 200 items per bulk import." });
        }

        const docs = items.map(item => ({
            orgId,
            name: item.name,
            price: item.price,
            category: item.category || "Uncategorized",
            dietaryTags: item.dietaryTags || ["veg"],
            imageUrl: item.imageUrl || "",
            prepTimeAvgMinutes: item.prepTimeAvgMinutes || 5,
            isDailySpecial: item.isDailySpecial || false,
            specialDays: item.specialDays || [],
            specialPrice: item.specialPrice || null,
            dailyStockLimit: item.dailyStockLimit || 0,
            currentStock: item.dailyStockLimit || 0,
            isAvailable: true,
        }));

        const result = await CanteenItem.insertMany(docs, { ordered: false });
        res.status(201).json({ success: true, imported: result.length });
    } catch (err) {
        res.status(500).json({ error: "Bulk import failed", details: err.message });
    }
};

// 🔄 RESET DAILY STOCK (Cron: runs at midnight, resets currentStock to dailyStockLimit)
export const resetDailyStock = async (req, res) => {
    try {
        const orgId = req.user.organization_id;

        const result = await CanteenItem.updateMany(
            { orgId, dailyStockLimit: { $gt: 0 } },
            [{ $set: { currentStock: "$dailyStockLimit", isAvailable: true } }]
        );

        res.json({ success: true, itemsReset: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: "Stock reset failed", details: err.message });
    }
};

export const createRazorpayOrder = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { cart } = req.body; // Array of { itemId, quantity }

        if (!cart || cart.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        // Fetch prices from DB to prevent tampering
        const itemIds = cart.map(i => i.itemId);
        const dbItems = await CanteenItem.find({ _id: { $in: itemIds }, orgId });

        if (dbItems.length !== cart.length) {
            return res.status(400).json({ error: "One or more items in cart are invalid" });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const cartItem of cart) {
            const dbItem = dbItems.find(i => i._id.toString() === cartItem.itemId);
            if (!dbItem.isAvailable) {
                return res.status(400).json({ error: `${dbItem.name} is currently out of stock.` });
            }

            const itemTotal = dbItem.price * cartItem.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                itemId: dbItem._id,
                quantity: cartItem.quantity,
                priceAtPurchase: dbItem.price
            });
        }

        // Generate Razorpay Order via specific Canteen tenant keys
        const rzpOrder = await RazorpayService.createOrder(
            orgId,
            totalAmount,
            "INR",
            `Receipt_${Date.now()}`,
            "canteen",
            {
                type: "canteen_order",
                organization_id: orgId.toString()
            }
        );

        // Save order as pending payment
        const newOrder = await CanteenOrder.create({
            transactionId: rzpOrder.id,
            orgId,
            studentId: req.user._id,
            tokenNumber: generateTokenNumber(),
            items: orderItems,
            totalAmount,
            status: "PENDING_PAYMENT",
            paymentStatus: "PENDING"
        });

        res.status(200).json({ success: true, rzpOrderId: rzpOrder.id, amount: totalAmount, currency: "INR" });
    } catch (err) {
        res.status(500).json({ error: "Checkout failed", details: err.message });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        const isValid = await RazorpayService.verifySignature(
            orgId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            "canteen"
        );

        if (!isValid) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        // Update DB
        const order = await CanteenOrder.findOneAndUpdate(
            { transactionId: razorpay_order_id, orgId },
            { status: "NEW", paymentStatus: "SUCCESS" },
            { returnDocument: 'after' }
        ).populate("items.itemId", "name");

        if (!order) return res.status(404).json({ error: "Order not found" });

        // 📡 Emit Socket.IO Event to Canteen Staff Dashboard
        try {
            const io = getIO();
            io.to(`org_${orgId}_canteen_kitchen`).emit("canteen_new_order", {
                orderId: order._id,
                tokenNumber: order.tokenNumber,
                items: order.items,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt
            });
        } catch (socketErr) {
            console.error("[Socket] Failed to emit canteen_new_order", socketErr);
        }

        res.status(200).json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: "Payment verification failed", details: err.message });
    }
};

// 👩‍🎓 STUDENT DASHBOARD
export const getStudentHistory = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const studentId = req.user._id;

        const orders = await CanteenOrder.find({ orgId, studentId, paymentStatus: "SUCCESS" })
            .populate("items.itemId", "name imageUrl category")
            .sort({ createdAt: -1 })
            .limit(50);

        // Aggregate total monthly spending
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0, 0, 0, 0);

        const currentMonthTotal = orders
            .filter(o => new Date(o.createdAt) >= currentMonthStart)
            .reduce((sum, o) => sum + o.totalAmount, 0);

        res.status(200).json({ success: true, orders, currentMonthTotal });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch student history", details: err.message });
    }
};

export const rateOrderItems = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params; // Order ID
        const { ratings } = req.body; // Array of { itemId, rating }

        const order = await CanteenOrder.findOne({ _id: id, orgId, studentId: req.user._id });
        if (!order) return res.status(404).json({ error: "Order not found" });

        for (const itemRating of ratings) {
            const itemInOrder = order.items.find(i => i.itemId.toString() === itemRating.itemId);
            if (itemInOrder) {
                itemInOrder.rating = itemRating.rating;

                // Fire & forget update to overall average
                CanteenItem.findById(itemRating.itemId).then(dbItem => {
                    if (dbItem) {
                        const total = dbItem.totalRatings || 0;
                        const avg = dbItem.averageRating || 0;
                        dbItem.averageRating = ((avg * total) + itemRating.rating) / (total + 1);
                        dbItem.totalRatings = total + 1;
                        dbItem.save().catch(e => console.error("Rating save failed", e));
                    }
                });
            }
        }

        await order.save();
        res.status(200).json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: "Failed to rate items", details: err.message });
    }
};

// 🍳 KITCHEN QUEUE
export const getLiveQueue = async (req, res) => {
    try {
        const orgId = req.user.organization_id;

        // Fetch active orders (not DELIVERED or CANCELLED) from today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const activeOrders = await CanteenOrder.find({
            orgId,
            paymentStatus: "SUCCESS",
            status: { $in: ["NEW", "PREPARING", "READY"] },
            createdAt: { $gte: startOfDay }
        }).populate("items.itemId", "name");

        res.status(200).json({ success: true, queue: activeOrders });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch live queue", details: err.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ["NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const order = await CanteenOrder.findOneAndUpdate(
            { _id: id, orgId },
            { status },
            { returnDocument: 'after' }
        ).populate("items.itemId", "name");

        if (!order) return res.status(404).json({ error: "Order not found" });

        // 📡 Emit Socket.IO Event
        try {
            const io = getIO();
            
            // Notify Canteen Kitchen
            io.to(`org_${orgId}_canteen_kitchen`).emit("canteen_status_update", {
                orderId: order._id,
                status: order.status
            });

            // If order is READY, notify the specific student
            if (status === "READY") {
                io.to(`${orgId}:${order.studentId}`).emit("canteen_student_order_ready", {
                    tokenNumber: order.tokenNumber,
                    message: "🍔 Your order is ready for pickup!"
                });
                
                // TODO: Dispatch Push Notification to device if implementing fully offline pushes
            }
        } catch (socketErr) {
            console.error("[Socket] Failed to emit status update", socketErr);
        }

        res.status(200).json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: "Failed to update order status", details: err.message });
    }
};

// 📊 ANALYTICS
export const getCanteenAnalytics = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        
        // Match only successful orders
        const matchStage = {
            $match: {
                orgId: new mongoose.Types.ObjectId(orgId),
                paymentStatus: "SUCCESS"
            }
        };

        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Daily revenue
        const dailyRevenue = await CanteenOrder.aggregate([
            matchStage,
            {
                $match: { createdAt: { $gte: today } }
            },
            {
                $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } }
            }
        ]);

        // Top items
        const topItems = await CanteenOrder.aggregate([
            matchStage,
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.itemId",
                    quantitySold: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } }
                }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "canteenitems",
                    localField: "_id",
                    foreignField: "_id",
                    as: "itemDetails"
                }
            },
            { $unwind: "$itemDetails" }
        ]);

        res.status(200).json({ 
            success: true, 
            dailyRevenue: dailyRevenue[0] || { total: 0, count: 0 },
            topItems 
        });
    } catch (err) {
        res.status(500).json({ error: "Analytics fetch failed", details: err.message });
    }
};
