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
  },
  { timestamps: true }
);

export default mongoose.models.IdeProject || mongoose.model("IdeProject", ideProjectSchema);
