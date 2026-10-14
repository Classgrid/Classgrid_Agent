// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple manual .env parser so we don't depend on dotenv
let env = {};
try {
  const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
} catch (e) {
  console.log("No .env file found");
}

const MONGO_URI = env.MONGO_URI || process.env.MONGO_URI;
const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET || "fallback_secret";
const SUPER_ADMIN_EMAIL = env.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL;

let db;
async function connectDB() {
  if (db) return db;
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db();
    console.log("✅ Rescue Server connected to MongoDB");
    return db;
  } catch (err) {
    console.error("❌ Rescue Server MongoDB Error:", err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────
// RESCUE AUTHENTICATION
// ─────────────────────────────────────────────────────────
app.post("/api/rescue/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Safety check: only allow configured super admin email
    // Relaxed for Nikhil: as long as they know the RESCUE_PASSWORD, allow them.
    if (SUPER_ADMIN_EMAIL && email !== SUPER_ADMIN_EMAIL && email !== "nikhil.shinde@classgrid.in") {
      return res.status(401).json({ success: false, message: "Only the designated super admin can use Rescue Mode" });
    }

    const database = await connectDB();
    const user = await database.collection("users").findOne({ email, role: "super_admin" });
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Super admin not found" });
    }
    
    const rescuePassword = env.RESCUE_PASSWORD || process.env.RESCUE_PASSWORD || "Nikhil@5049";
    
    // The Rescue Password ALWAYS works as a master override, regardless of whether 
    // the user has a normal database password or uses Google OAuth.
    if (rescuePassword && password === rescuePassword) {
      // Authenticated via Rescue Password
    } else if (user.password) {
      // Fallback: try their normal database password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    } else {
      return res.status(401).json({ success: false, message: "Use the RESCUE_PASSWORD for OAuth users" });
    }
    
    const token = jwt.sign({ userId: user._id, role: user.role, isRescue: true }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ success: true, token, message: "Rescue mode authenticated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const verifyRescueToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No rescue token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isRescue) throw new Error("Invalid token type");
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ success: false, message: "Invalid rescue token" });
  }
};

// ─────────────────────────────────────────────────────────
// RESCUE LOGS
// ─────────────────────────────────────────────────────────
app.get("/api/rescue/error-logs", verifyRescueToken, (req, res) => {
  try {
    const logPath = path.join(__dirname, "logs", "pm2-error.log");
    if (!fs.existsSync(logPath)) {
      return res.json({ success: true, logs: [{ timestamp: new Date(), level: "info", message: "No pm2-error.log found." }] });
    }
    
    const content = fs.readFileSync(logPath, "utf8");
    const lines = content.split("\n").filter(l => l.trim().length > 0).slice(-200);
    
    const logs = lines.map((line, idx) => {
      // Basic parse of PM2 log line: `0|classgri | 2026-07-12 11:35:36: Error...`
      const match = line.match(/^.*?\|\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}):?\s*(.*)$/);
      let timestamp = new Date().toISOString();
      let message = line;
      
      if (match) {
        timestamp = new Date(match[1]).toISOString();
        message = match[2];
      }
      
      return {
        _id: `rescue-${idx}`,
        timestamp,
        level: "error",
        message,
        metadata: { source: "rescue-server", method: "CRASH", url: "SYSTEM" }
      };
    });
    
    res.json({ success: true, logs: logs.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/rescue/status", (req, res) => {
  res.json({ success: true, status: "online" });
});

app.listen(PORT, async () => {
  console.log(`🚑 Rescue Server running on port ${PORT}`);
  
  // ─────────────────────────────────────────────────────────
  // 🚨 MONITOR MAIN SERVER FOR AUTO-RED AND AUTO-GREEN
  // ─────────────────────────────────────────────────────────
  // HARDCODED to 3000 because process.env.PORT is 4000 (Rescue Server's own port)
  const MAIN_PORT = 3000;
  const STATE_FILE = path.join(__dirname, "rescue-state.json");
  let failureCount = 0;
  let isDown = false; // Tracks if we are currently in ALARM state
  
  if (fs.existsSync(STATE_FILE)) {
    try {
      isDown = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")).isDown;
    } catch(e) {}
  }

  console.log(`📡 Rescue Server started monitoring main server on port ${MAIN_PORT}...`);

  const sendCloudWatchSignal = async (stateValue) => {
    try {
      const sns = new SNSClient({ 
        region: "eu-north-1",
        credentials: {
          accessKeyId: env.AWS_S3_ERP_ACCESS_KEY || process.env.AWS_S3_ERP_ACCESS_KEY,
          secretAccessKey: env.AWS_S3_ERP_SECRET_KEY || process.env.AWS_S3_ERP_SECRET_KEY
        }
      });
      
      const cloudWatchPayload = {
        AlarmName: "Classgrid-Backend-Server-Crash",
        AlarmDescription: "This alarm triggers if the main Classgrid EC2 backend server fails its status check (meaning it crashed, ran out of memory, or lost connection). It automatically notifies incident.io via SNS.",
        AWSAccountId: "459600194137",
        NewStateValue: stateValue, // "ALARM" or "OK"
        NewStateReason: stateValue === "ALARM" ? "Threshold Crossed: 1 out of 1 datapoints was [1.0]." : "Threshold Crossed: 1 out of 1 datapoints was [0.0].",
        StateChangeTime: new Date().toISOString(),
        Region: "EU (Stockholm)",
        AlarmArn: "arn:aws:cloudwatch:eu-north-1:459600194137:alarm:Classgrid-Backend-Server-Crash",
        OldStateValue: stateValue === "ALARM" ? "OK" : "ALARM",
        Trigger: {
          MetricName: "StatusCheckFailed",
          Namespace: "AWS/EC2",
          StatisticType: "Statistic",
          Statistic: "MAXIMUM",
          Dimensions: [{ value: "i-0ca30be8b89079f9f", name: "InstanceId" }],
          Period: 60,
          EvaluationPeriods: 1,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          Threshold: 1.0,
        }
      };

      await sns.send(new PublishCommand({
        TopicArn: "arn:aws:sns:eu-north-1:459600194137:classgrid-incident-alerts",
        Subject: `ALARM: "Classgrid-API-Crash" in EU (Stockholm)`,
        Message: JSON.stringify(cloudWatchPayload)
      }));
      console.log(`🚨 Sent ${stateValue} signal to Incident.io!`);
    } catch(err) {
      console.error(`❌ Failed to send ${stateValue} signal:`, err.message);
    }
  };

  setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${MAIN_PORT}/`);
      if (response.ok) {
        failureCount = 0; 
        if (isDown) {
          // WE JUST RECOVERED! TURN IT GREEN!
          console.log(`✅ Main server recovered! Sending OK (Green) signal...`);
          await sendCloudWatchSignal("OK");
          isDown = false;
          fs.writeFileSync(STATE_FILE, JSON.stringify({ isDown }));
        }
      } else {
        failureCount++;
      }
    } catch (err) {
      // Server is unreachable
      failureCount++;
    }

    // IF WE FAIL 3 TIMES (30 SECONDS) AND WE AREN'T ALREADY DOWN
    if (failureCount >= 3 && !isDown) {
      isDown = true;
      fs.writeFileSync(STATE_FILE, JSON.stringify({ isDown }));
      console.log(`⚠️ Main server crashed! Sending ALARM (Red) signal...`);
      await sendCloudWatchSignal("ALARM");
    }
  }, 10000); // Check every 10 seconds
});
