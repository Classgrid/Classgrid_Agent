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

import dotenv from "dotenv";
import path from "path";
// Load BOTH envs: platform for Brevo, marketing for MongoDB
dotenv.config({ path: "C:/Users/nikhi/OneDrive/Documents/Classgrid_platfrom/classgrid_platform/server/.env" });
dotenv.config({ path: "c:/classgrid_marketting/Classgrid_marketting/.env.local", override: true });
import mongoose from "mongoose";
import { notifyUserOfTicketCreation, notifyTicketCreatorOfAdminReply, notifyUserOfTalkRequestCreation, notifyTalkCreatorOfAdminReply } from "../services/support-ticket-email.service.js";
import { processEmailQueue } from "../services/email-queue.service.js";

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is undefined!");
    return;
  }
  
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const emailToTest = "nikhilsubsun321@gmail.com";
  
  const mockTicket = {
    _id: new mongoose.Types.ObjectId(),
    subject: "Help with my account setup",
    message: "I am having trouble logging in. It keeps saying invalid credentials but my password is correct. Please help!",
    category: "technical",
    priority: "high",
    submitterEmail: emailToTest,
    submittedBy: new mongoose.Types.ObjectId(),
    organization_id: new mongoose.Types.ObjectId()
  };

  console.log(`\n1. Queuing Ticket Creation Email to ${emailToTest}...`);
  const createResult = await notifyUserOfTicketCreation({ ticket: mockTicket });
  console.log("   Queue Result:", createResult);

  console.log(`\n2. Queuing Admin Reply Email to ${emailToTest}...`);
  const replyResult = await notifyTicketCreatorOfAdminReply({ 
    ticket: mockTicket,
    replyMessage: "Hello Nikhil!<br><br>This is a <strong>test reply</strong> from the Classgrid Support Team. We can now send <u>underlined text</u> and even <a href='https://classgrid.in' style='color:#34d399;'>Hypertext links</a>!<br><br>Please let us know if you have any questions."
  });
  console.log("   Queue Result:", replyResult);

  console.log(`\n3. Queuing Talk Request Creation Email to ${emailToTest}...`);
  const talkCreateResult = await notifyUserOfTalkRequestCreation({ ticket: mockTicket });
  console.log("   Queue Result:", talkCreateResult);

  console.log(`\n4. Queuing Talk Request Admin Reply Email to ${emailToTest}...`);
  const talkReplyResult = await notifyTalkCreatorOfAdminReply({ 
    ticket: mockTicket,
    replyMessage: "Hello! Thank you for reaching out to Classgrid Talk. We would love to show you how Classgrid can streamline your institution's operations.<br><br>Please let me know a good time for a brief 15-minute <strong>introductory call</strong> next week."
  });
  console.log("   Queue Result:", talkReplyResult);


  console.log(`\n3. Processing Email Queue (Sending emails via Brevo)...`);
  const processResult = await processEmailQueue();
  console.log("   Process Result:", processResult);

  await mongoose.disconnect();
  console.log("\n✅ Disconnected from MongoDB. Check your inbox!");
}

run().catch(console.error);
