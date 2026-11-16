// Live docs: documents the AI writes that the user can keep editing, share and comment on (chat.classgrid.in/docs/<id>)
import mongoose from 'mongoose';
import { MAX_MARKDOWN, ROLES } from '../services/live-doc.helpers.js';

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

// A person the doc is shared with by email (owner, 2026-11-16: "Add people", like the share box he showed). They are
// known by the email they were invited with until they open the doc signed in; then their user id is kept too.
const memberSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  role: { type: String, enum: ROLES, default: 'viewer' },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: false });

// Someone opened the link of a doc they can't open and asked its owner for access, or someone who can read the
// doc asked to be let to edit it (`wants`). The request waits here until the owner says yes (they become a member
// with that role) or no (it is removed).
const requestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  wants: { type: String, enum: ROLES, default: 'viewer' },
  at: { type: Date, default: Date.now },
  emailedAt: { type: Date, default: null }, // when the owner was last emailed about it
}, { _id: false });

const liveDocSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerName: { type: String, default: '' },
  title: { type: String, default: 'Untitled' },
  markdown: { type: String, default: '', maxlength: MAX_MARKDOWN },
  // General access: "private" (the owner and the people it is shared with) or "link" (any signed-in user with the
  // link, as linkRole). A doc from before roles has no linkRole: its link gives "commenter", as it always did.
  visibility: { type: String, enum: ['private', 'link'], default: 'private' },
  linkRole: { type: String, enum: ROLES, default: 'commenter' },
  members: { type: [memberSchema], default: [] },
  requests: { type: [requestSchema], default: [] },
  comments: { type: [commentSchema], default: [] },
  versions: { type: [versionSchema], default: [] }, // last 20 saved versions, newest last
  rev: { type: Number, default: 0 }, // goes up on every text change, to spot changes made while someone was editing
  lastBy: { type: String, enum: ['user', 'ai'], default: 'user' },
  views: { type: Number, default: 0 }, // times it was opened (one person counts once in half an hour)
  pinnedBy: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // the people who pinned it in their own list
}, { timestamps: true });

liveDocSchema.index({ owner: 1, updatedAt: -1 });
liveDocSchema.index({ 'members.userId': 1 });
liveDocSchema.index({ 'members.email': 1 });

export default mongoose.models.LiveDoc || mongoose.model('LiveDoc', liveDocSchema);
