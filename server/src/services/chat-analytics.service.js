/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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
// Chat Analytics (super admin): numbers for superadmin portal → Analytics.
// Used by GET /api/group-chat/analytics and pushed live over the socket room "superadmin:analytics".
// Cached briefly so many viewers / pushes never hammer the free Supabase.
import User from "../models/User.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";

const sb = primarySupabaseClient;
let cache = { at: 0, data: null };
let inFlight = null;

/** @param {{ maxAgeMs?: number }} [opts] */
export async function getChatAnalytics({ maxAgeMs = 60 * 1000 } = {}) {
  if (cache.data && Date.now() - cache.at < maxAgeMs) return cache.data;
  if (inFlight) return inFlight; // one calculation at a time, others wait for it
  inFlight = compute().then((data) => { cache = { at: Date.now(), data }; return data; }).finally(() => { inFlight = null; });
  return inFlight;
}

async function compute() {
    const { CHAT_PUBLIC_ORG_ID } = await import('../utils/chat-onboarding.js');
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Midnight today in India time
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - 5.5 * 60 * 60 * 1000);

  const count = async (table, build) => {
    const { count: c, error } = await build(sb.from(table).select('id', { count: 'exact', head: true }));
    if (error) throw error;
    return c ?? 0;
  };
  const rpc = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) { console.warn(`[ChatAnalytics] ${fn}: ${error.message}`); return null; } // migration 008 not run yet
    return data;
  };
  const chatOrg = { organization_id: CHAT_PUBLIC_ORG_ID };

  const [
    usersTotal, usersHour, usersToday, usersWeek, usersDaily,
    msgHour, msgToday, msgWeek,
    groupsToday, groupsWeek, groupsTotal, pendingRequests,
    dailyMessages, topGroups, activeToday, groupTypeRows, recentUsers,
  ] = await Promise.all([
    User.countDocuments(chatOrg),
    User.countDocuments({ ...chatOrg, createdAt: { $gte: hourAgo } }),
    User.countDocuments({ ...chatOrg, createdAt: { $gte: todayStart } }),
    User.countDocuments({ ...chatOrg, createdAt: { $gte: weekAgo } }),
    User.aggregate([
      { $match: { ...chatOrg, createdAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, users: { $sum: 1 } } },
    ]),
    count('chat_messages', q => q.gte('created_at', hourAgo.toISOString())),
    count('chat_messages', q => q.gte('created_at', todayStart.toISOString())),
    count('chat_messages', q => q.gte('created_at', weekAgo.toISOString())),
    count('chat_groups', q => q.gte('created_at', todayStart.toISOString())),
    count('chat_groups', q => q.gte('created_at', weekAgo.toISOString())),
    count('chat_groups', q => q),
    count('chat_group_join_requests', q => q.eq('status', 'pending')),
    rpc('chat_analytics_daily_messages', { days: 7 }),
    rpc('chat_analytics_top_groups', { since: weekAgo.toISOString(), lim: 8 }),
    rpc('chat_analytics_active_senders', { since: todayStart.toISOString() }),
    sb.from('chat_groups').select('group_type').limit(10000).then(r => r.data || []),
    // Newest chat.classgrid.in accounts for the "Recent sign-ups" table
    User.find(chatOrg).sort({ createdAt: -1 }).limit(25).select('name email createdAt profilePicture').lean(),
  ]);

  // Last 7 days, one row per day (days with nothing show 0)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(istNow.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  const msgByDay = Object.fromEntries((dailyMessages || []).map(r => [String(r.day).slice(0, 10), Number(r.messages)]));
  const usersByDay = Object.fromEntries(usersDaily.map(r => [r._id, r.users]));
  const daily = days.map(day => ({ day, messages: dailyMessages ? (msgByDay[day] || 0) : null, newUsers: usersByDay[day] || 0 }));

  const typeCounts = {};
  for (const g of groupTypeRows) { const t = g.group_type || 'general'; typeCounts[t] = (typeCounts[t] || 0) + 1; }

  const data = {
    generatedAt: now.toISOString(),
    users: { total: usersTotal, lastHour: usersHour, today: usersToday, week: usersWeek },
    messages: { lastHour: msgHour, today: msgToday, week: msgWeek },
    activeUsersToday: activeToday === null ? null : Number(activeToday),
    groups: { today: groupsToday, week: groupsWeek, total: groupsTotal, byType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count) },
    pendingJoinRequests: pendingRequests,
    daily,
    topGroups: topGroups === null ? null : topGroups.map(g => ({ groupId: g.group_id, name: g.group_name, messages: Number(g.messages) })),
    recentUsers: recentUsers.map(u => ({ id: String(u._id), name: u.name || '', email: u.email || '', createdAt: u.createdAt, photo: u.profilePicture || null })),
    needsMigration: dailyMessages === null || topGroups === null || activeToday === null,
  };
  return data;
}
