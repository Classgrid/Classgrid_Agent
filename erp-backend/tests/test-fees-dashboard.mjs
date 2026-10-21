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
import axios from "axios";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const JWT_SECRET = "classgrid_super_secure_jwt_secret_2026";
const MONGO_URI = "mongodb://classgrid-admin:pass123@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid";

async function getOrgAdminToken() {
  await mongoose.connect(MONGO_URI);
  const User = mongoose.connection.collection("users");
  const admin = await User.findOne({ role: "org_admin" });
  await mongoose.disconnect();
  
  return jwt.sign(
    {
      id: admin._id.toString(),
      _id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      organization_id: admin.organization_id?.toString(),
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function run() {
  try {
    const token = await getOrgAdminToken();
    const res = await axios.get("http://localhost:5000/api/fees/analytics", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Fees Analytics:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

run();
