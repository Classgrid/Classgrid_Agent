import mongoose from "mongoose";

// A chat group in the left sidebar (Project and Studio Mode): a name, an icon, pinned or not, and its chats. Groups
// belong to the project that was open when they were made (projectId), or to no project (null) for Studio chats
// made without a project. A chat is in at most one group.
const chatGroupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: String, default: null },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    icon: { type: String, default: "folder" },
    pinned: { type: Boolean, default: false },
    chatIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.ChatGroup || mongoose.model("ChatGroup", chatGroupSchema);
