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
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const MONGO_URI = "mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid";

function hashHandoffToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

async function createDummyToken() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const db = mongoose.connection.db;
    const handoffs = db.collection("billinghandoffs");

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const hashedToken = hashHandoffToken(rawToken);
    const otp = "123456"; // Dummy OTP
    const hashedOtp = await bcrypt.hash(otp, 12);

    const doc = {
      token: hashedToken,
      email: "test@classgrid.in",
      otp: hashedOtp,
      organization_id: new mongoose.Types.ObjectId(),
      paymentOrderId: new mongoose.Types.ObjectId(),
      paymentAttemptId: new mongoose.Types.ObjectId(),
      referenceId: new mongoose.Types.ObjectId(),
      referenceModel: "Invoice",
      razorpay_order_id: "order_dummy_12345",
      amountPaise: 10000,
      currency: "INR",
      razorpay_key_id: "rzp_test_12345678",
      payment_type: "saas_invoice",
      return_url: "https://billing.classgrid.in",
      context: { label: "Dummy Test Token", payerName: "Test User" },
      verified: false,
      attempts: 0,
      lockoutUntil: null,
      otpVerifiedAt: null,
      consumedAt: null,
      resendCount: 0,
      lastOtpSentAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await handoffs.insertOne(doc);

    console.log("\n✅ DUMMY TOKEN CREATED SUCCESSFULLY!");
    console.log("--------------------------------------------------");
    console.log(`URL to test: https://billing.classgrid.in/checkout?token=${rawToken}`);
    console.log(`OTP to use: ${otp}`);
    console.log("--------------------------------------------------\n");

  } catch (err) {
    console.error("Error creating token:", err);
  } finally {
    await mongoose.disconnect();
  }
}

createDummyToken();
