// Live docs: documents the AI writes that the user can keep editing, share and comment on (chat.classgrid.in/docs/<id>)
import mongoose from 'mongoose';
import { MAX_MARKDOWN } from '../services/live-doc.helpers.js';

const replySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  text: { type: String, required: true },
  at: { type: Date, default: Date.now },
  byAI: { type: Boolean, default: false },
}, { _id: false });

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  text: { type: String, required: true },
  quote: { type: String, default: '' }, // the text the user selected
  at: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  replies: { type: [replySchema], default: [] },
}, { _id: false });

const versionSchema = new mongoose.Schema({
  markdown: { type: String, default: '' },
  at: { type: Date, default: Date.now },
  by: { type: String, enum: ['user', 'ai'], default: 'user' },
});

const liveDocSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerName: { type: String, default: '' },
  title: { type: String, default: 'Untitled' },
  markdown: { type: String, default: '', maxlength: MAX_MARKDOWN },
  visibility: { type: String, enum: ['private', 'link'], default: 'private' },
  comments: { type: [commentSchema], default: [] },
  versions: { type: [versionSchema], default: [] }, // last 20 saved versions, newest last
  rev: { type: Number, default: 0 }, // goes up on every text change, to spot changes made while someone was editing
  lastBy: { type: String, enum: ['user', 'ai'], default: 'user' },
}, { timestamps: true });

liveDocSchema.index({ owner: 1, updatedAt: -1 });

export default mongoose.models.LiveDoc || mongoose.model('LiveDoc', liveDocSchema);
