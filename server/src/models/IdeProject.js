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
import mongoose from "mongoose";

// A Project Mode project: only its name, its GitHub repo and the chats inside it. The code itself is never stored
// here or kept on our servers for long; it is downloaded fresh from GitHub each time the project is opened.
const ideProjectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    repo: { type: String, default: null }, // "owner/name" on GitHub
    chatSessionIds: { type: [String], default: [], index: true },
    lastOpenedAt: { type: Date, default: null },
    // Unpushed work pushed to GitHub when the project left the sandbox, shown once on the next open
    lastBackup: { branch: { type: String }, at: { type: Date } },
  },
  { timestamps: true }
);

export default mongoose.models.IdeProject || mongoose.model("IdeProject", ideProjectSchema);
