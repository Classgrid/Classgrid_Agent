import mongoose from "mongoose";

// Remote PC (owner, 2026-11-18): a chat on the person's computer (the desktop app, Classgrid Code, the VS Code
// extension) that they turned on with "/remote", so it can be followed and answered from the phone. The work stays on
// that computer; the phone sees the chat live and sends messages into it (services/remote-pc.service.js).
const remoteChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true },
    // Which computer and app it was turned on from (the app's device id and its name, e.g. "Classgrid desktop app on
    // Windows"); the phone shows the name
    deviceId: { type: String, default: null },
    deviceName: { type: String, default: null },
    // How the chat runs, so a message from the phone runs it the same way (the desktop chat's own settings)
    clientApp: { type: String, default: "desktop" },
    appMode: { type: String, default: null },
    on: { type: Boolean, default: true },
}, { timestamps: true });

remoteChatSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
remoteChatSchema.index({ userId: 1, on: 1, updatedAt: -1 });

export default mongoose.models.RemoteChat || mongoose.model("RemoteChat", remoteChatSchema);

// A computer's own Remote PC switch (the app's Settings > General > Remote PC, "Allow this computer to be controlled
// from your phone"): off, the phone's messages for that computer's chats are refused and "/remote" there says so.
// A computer with no row is allowed (the switch is on until turned off).
const remoteDeviceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String, required: true },
    allowed: { type: Boolean, default: true },
    // The permission mode the phone starts with for this computer's chats (the app's Settings; the phone can change it)
    defaultMode: { type: String, enum: ["review", "default", "auto", "turbo"], default: "default" },
}, { timestamps: true });
remoteDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
export const RemoteDevice = mongoose.models.RemoteDevice || mongoose.model("RemoteDevice", remoteDeviceSchema);
