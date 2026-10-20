// Views for tool responses. Each view knows one kind of data (people, chats, tickets, files, emails…);
// a view that gets data it doesn't recognise returns null and the next one (finally the generic view) is used.
import React from 'react';
import {
  File, FileText, Folder, Image as ImageIcon, Mail, Calendar, GitBranch, Rocket, MessageSquare, Hash, ClipboardList,
  Ticket, BookOpen, Sparkles, CheckCircle2, XCircle, Globe, Paperclip, Database, Terminal, Clock, BarChart3, Building2, Users,
} from 'lucide-react';
import {
  Avatar, Chip, DataTable, ItemList, KeyValueTable, LinkValue, Muted, SectionLabel, StatTiles, TextBlock, Value,
  formatDate, humanizeKey, isDateLike, pick, shortText, toDateValue, unwrapList, type ListItemSpec,
} from './primitives';

type Parsed = { data: any; text: string };
type Ctx = { tool: string; args: any; text: string };
type View = (data: any, ctx: Ctx) => React.ReactNode | null;

// ─── Field pickers shared by many views ───
const NAME = ['name', 'full_name', 'fullName', 'real_name', 'display_name', 'displayName', 'profile.name.fullName', 'username', 'user_name', 'title', 'label'];
const EMAIL = ['email', 'user_email', 'email_address', 'emailAddress', 'profile.emailAddress', 'contact_email', 'submitterEmail', 'adminEmail'];
const ROLE = ['role', 'groupRole', 'userRole', 'user_role', 'roles', 'designation', 'position', 'department'];
const AVATAR = ['profilePicture', 'profile_picture', 'profile_picture_url', 'avatar', 'avatar_url', 'avatarUrl', 'profile.photoUrl', 'image', 'photo', 'picture', 'user_avatar'];
const STATUS = ['status', 'state', 'courseState', 'readyState', 'stage', 'conclusion'];
const WHEN = ['created_at', 'createdAt', 'updated_at', 'updatedAt', 'date', 'timestamp', 'time', 'sent_at', 'last_message_at', 'modifiedTime', 'createdTime', 'creationTime', 'updateTime', 'start_time', 'startTime', 'joinedAt', 'joined'];
const URL_KEYS = ['url', 'link', 'webViewLink', 'webUrl', 'webLink', 'html_url', 'htmlUrl', 'permalink', 'permalink_url', 'public_url', 'publicUrl', 'file_url', 'fileUrl', 'signedUrl', 'alternateLink', 'formUrl'];

const icon = (Icon: React.ComponentType<{ className?: string }>) => <Icon className="h-4 w-4 text-slate-400 dark:text-[#8a8a8a]" />;
const str = (v: any) => (v === undefined || v === null || v === '' ? undefined : typeof v === 'object' ? shortText(v, 80) : String(v));
const when = (v: any) => {
  const d = toDateValue(v);
  if (d === undefined) return undefined;
  if (isDateLike(d) || typeof d === 'number') return formatDate(d);
  // Email-style dates ("Mon, 20 Oct 2026 09:15:00 +0530")
  if (typeof d === 'string' && d.length < 45 && /\d{4}/.test(d) && /[a-z]{3}/i.test(d) && !Number.isNaN(Date.parse(d))) return formatDate(new Date(d).toISOString());
  return String(d);
};
const httpUrl = (v: any) => {
  const s = str(v);
  if (!s) return undefined;
  return /^https?:\/\//.test(s) ? s : /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s) ? `https://${s}` : undefined;
};
/** HTML email / Teams bodies → readable text */
const plain = (v: any) => {
  const raw = v && typeof v === 'object' ? v.content ?? v.text : v;
  if (typeof raw !== 'string') return str(raw);
  return raw.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
};
const failedText = (text: string) => /^(error|failed|failure|not done|security error|refused)\b|could not|unable to|not found/i.test(text.trim());
const urlsIn = (text: string) => text.match(/https?:\/\/[^\s)"'<>\]]+/g) ?? [];

/** Small stat line above a list, from numbers next to it ({ total: 120, returned: 20, users: [...] }) */
function CountsLine({ rest }: { rest: Record<string, any> }) {
  const nums = Object.entries(rest).filter(([, v]) => typeof v === 'number');
  const groups = Object.entries(rest).filter(([k, v]) => !/^(pagination|pageInfo|paging)$/.test(k) && v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number'));
  if (nums.length === 0 && groups.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">
      {nums.map(([k, v]) => <span key={k}><span className="font-medium text-slate-700 dark:text-[#d6d6d6] tabular-nums">{Number(v).toLocaleString()}</span> {humanizeKey(k).toLowerCase()}</span>)}
      {groups.flatMap(([, g]) => Object.entries(g as Record<string, number>)).map(([k, v]) => <Chip key={k}>{k}: {v}</Chip>)}
    </div>
  );
}

/** Lists of objects get their own view; anything else returns null so the next view is tried */
const listOf = (spec: (item: any) => ListItemSpec, opts?: { max?: number; empty?: string }): View => (data) => {
  const { list, rest } = unwrapList(data);
  if (!list) return null;
  return (
    <div className="flex flex-col gap-2">
      <CountsLine rest={rest} />
      <ItemList items={list.filter((x) => x && typeof x === 'object').map(spec)} max={opts?.max} empty={opts?.empty} />
    </div>
  );
};

// ─── 1. Profile / one person or one group ───
const ProfileView: View = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const obj = data.user ?? data.profile ?? data;
  const name = str(pick(obj, NAME));
  if (!name && !pick(obj, EMAIL)) return null;
  const desc = str(pick(obj, ['bio', 'description', 'about', 'biography']));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={pick(obj, AVATAR)} size={40} />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{name ?? 'Profile'}</div>
          <div className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-[#9a9a9a] min-w-0">
            {pick(obj, EMAIL) && <span className="truncate">{pick(obj, EMAIL)}</span>}
            {pick(obj, ROLE) && <Chip>{str(pick(obj, ROLE))}</Chip>}
          </div>
          {desc && <div className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] line-clamp-2">{desc}</div>}
        </div>
      </div>
      <KeyValueTable data={Object.fromEntries(Object.entries(obj).filter(([k]) => !SHOWN_IN_HEADER.has(k)))} />
    </div>
  );
};
const SHOWN_IN_HEADER = new Set([...NAME.slice(0, 6), 'email', 'role', 'bio', 'description', 'about', 'biography', ...AVATAR]);

// ─── 2. People list ───
const personSpec = (u: any): ListItemSpec => ({
  leading: <Avatar name={str(pick(u, NAME))} src={pick(u, AVATAR)} />,
  title: str(pick(u, NAME)) ?? str(pick(u, EMAIL)) ?? 'User',
  subtitle: [pick(u, NAME) ? str(pick(u, EMAIL)) : undefined, str(pick(u, ['organization.name', 'organization', 'department']))].filter(Boolean).join(' · ') || undefined,
  chip: pick(u, ['active', 'is_active']) === false ? <Chip>Inactive</Chip> : pick(u, ROLE) ? <Chip>{str(pick(u, ROLE))}</Chip> : undefined,
  meta: when(pick(u, ['joinedAt', 'joined', 'createdAt', 'created_at', 'last_active', 'lastLogin'])),
});
const PeopleView = listOf(personSpec, { max: 8, empty: 'No people found' });

/** count_organization_users: { roles: [{ _id: 'student', count, users }] } and similar "count by" lists */
const CountByView: View = (data) => {
  const { list, rest } = unwrapList(data);
  const groups = list ?? (Array.isArray(data) ? data : null);
  if (!groups || !groups.every((g) => g && typeof g === 'object' && typeof (g.count ?? g.total) === 'number')) return null;
  return (
    <div className="flex flex-col gap-2">
      {(rest.organizationName || rest.name) && <span className="text-[13px] font-medium text-slate-700 dark:text-[#d6d6d6]">{str(rest.organizationName ?? rest.name)}</span>}
      <StatTiles stats={groups.slice(0, 12).map((g) => ({ label: humanizeKey(String(g._id ?? g.role ?? g.status ?? g.name ?? 'Total')), value: g.count ?? g.total }))} />
    </div>
  );
};

// ─── 3. Organizations ───
const OrgsView: View = (data, ctx) => {
  const { list } = unwrapList(data);
  if (!list) return ProfileView(data, ctx);
  return listOf((o) => ({
    leading: icon(Building2),
    title: str(pick(o, ['name', 'sidebar_name', 'subdomain', 'title'])) ?? 'Organization',
    subtitle: [str(pick(o, ['subdomain'])), str(pick(o, ['org_type', 'organization_type', 'type'])), str(pick(o, ['ownerName', 'ownerEmail'])), str(pick(o, ['city']))].filter(Boolean).join(' · ') || undefined,
    chip: pick(o, STATUS) ? <Chip>{str(pick(o, STATUS))}</Chip> : undefined,
    meta: when(pick(o, WHEN)),
  }), { max: 8 })(data, ctx);
};

// ─── 4. Chat threads / Grids / groups ───
const ThreadsView = listOf((t) => {
  const title = str(pick(t, ['name', 'title', 'topic', 'group_name', 'other_user_name', 'display_name', 'displayName'])) ?? (t.type === 'dm' ? 'Direct message' : 'Chat');
  const unread = pick(t, ['unread', 'unread_count', 'unreadCount']);
  return {
    leading: t.is_private !== undefined && !pick(t, ['avatar_url', 'avatar', 'image']) ? icon(Hash) : <Avatar name={title} src={pick(t, ['avatar_url', 'avatar', 'image'])} />,
    title,
    subtitle: str(plain(pick(t, ['last_message', 'lastMessage', 'preview', 'description', 'chatType']))),
    chip: unread ? <Chip tone="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{unread} new</Chip> : t.is_private ? <Chip>Private</Chip> : undefined,
    meta: when(pick(t, ['last_message_at', 'lastUpdatedDateTime', 'updated_at', 'updatedAt', 'created_at'])),
    href: pick(t, ['webUrl']),
  };
}, { max: 8, empty: 'No chats found' });

// ─── 5. Messages (chat bubbles): Grids, groups, ticket replies, Slack, Teams ───
const MSG_TEXT = ['message', 'body', 'content', 'text', 'textDisplay', 'snippet.topLevelComment.snippet.textDisplay', 'snippet'];
const MSG_FROM = ['sender_name', 'senderName', 'authorName', 'author', 'from.user.displayName', 'from.name', 'username', 'user_name', 'snippet.topLevelComment.snippet.authorDisplayName', 'user', 'role', 'sender_id'];
const MSG_TIME = ['created_at', 'createdAt', 'createdDateTime', 'date', 'timestamp', 'time', 'ts', 'sent_at'];
const MessagesView: View = (data) => {
  const { list } = unwrapList(data);
  if (!list) return null;
  const msgs = list.filter((m) => m && typeof m === 'object' && pick(m, MSG_TEXT) !== undefined && !m.is_deleted);
  if (msgs.length === 0) return null;
  // Oldest first, like a chat (some tools return newest first)
  const ordered = [...msgs].sort((a, b) => {
    const ta = new Date(toDateValue(pick(a, MSG_TIME)) as any).getTime();
    const tb = new Date(toDateValue(pick(b, MSG_TIME)) as any).getTime();
    return Number.isNaN(ta) || Number.isNaN(tb) ? 0 : ta - tb;
  });
  const shown = ordered.slice(-12);
  return (
    <div className="flex flex-col gap-2">
      {msgs.length > shown.length && <Muted>Showing the last {shown.length} of {msgs.length} messages</Muted>}
      {shown.map((m, i) => {
        const sender = str(pick(m, MSG_FROM)) ?? 'Message';
        const isInternal = m.footer === 'internal_note';
        const files: any[] = Array.isArray(m.attachments) ? m.attachments : Array.isArray(m.files) ? m.files : [];
        return (
          <div key={i} className="flex items-start gap-2.5">
            <Avatar name={sender} src={pick(m, ['user_avatar', 'sender_avatar'])} size={24} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[12.5px] font-medium text-slate-700 dark:text-[#d6d6d6] truncate">{sender}</span>
                {pick(m, ['authorRole']) && <span className="text-[11.5px] text-slate-400 dark:text-[#7a7a7a]">{str(m.authorRole)}</span>}
                {isInternal && <Chip tone="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Internal note</Chip>}
                <span className="text-[11.5px] text-slate-400 dark:text-[#7a7a7a]">{when(pick(m, MSG_TIME))}</span>
              </div>
              <div className="mt-0.5 rounded-lg rounded-tl-sm bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] px-2.5 py-1.5 text-[13px] text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words line-clamp-6">
                {plain(pick(m, MSG_TEXT))}
              </div>
              {files.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {files.slice(0, 4).map((f, j) => (
                    <span key={j} className="inline-flex items-center gap-1 text-[12px] text-slate-500 dark:text-[#9a9a9a]">
                      <Paperclip className="h-3 w-3" />
                      {httpUrl(pick(f, URL_KEYS)) ? <LinkValue href={httpUrl(pick(f, URL_KEYS))!}>{str(pick(f, ['file_name', 'name', 'filename'])) ?? 'File'}</LinkValue> : str(pick(f, ['file_name', 'name', 'filename'])) ?? 'File'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** recall_chat / search_recall_chat text: "#12 user:\n…" blocks split by --- */
const RecallView: View = (data, ctx) => {
  if (data !== undefined) return MessagesView(data, ctx);
  const blocks = ctx.text.split(/\n-{3,}\n/).map((b) => b.trim()).filter(Boolean);
  // The first block starts with a summary line ("This chat has N messages…") before "#1 user:"
  const firstHash = blocks[0]?.search(/^#\d+\s/m) ?? -1;
  const header = firstHash > 0 ? blocks[0]!.slice(0, firstHash).trim() : '';
  if (firstHash > 0) blocks[0] = blocks[0]!.slice(firstHash);
  const parsed = blocks.map((b) => b.match(/^#(\d+)\s+([\w ]+):\s*\n?([\s\S]*)$/)).filter(Boolean) as RegExpMatchArray[];
  if (parsed.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {header && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{header}</span>}
      {parsed.slice(0, 10).map((m, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Avatar name={m[2]} size={24} />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-slate-700 dark:text-[#d6d6d6]">{humanizeKey(m[2]!.trim())} <span className="text-slate-400 dark:text-[#7a7a7a] font-normal">· message {m[1]}</span></div>
            <div className="mt-0.5 rounded-lg rounded-tl-sm bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] px-2.5 py-1.5 text-[13px] text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words line-clamp-6">{m[3]!.trim()}</div>
          </div>
        </div>
      ))}
      {parsed.length > 10 && <Muted>+{parsed.length - 10} more messages</Muted>}
    </div>
  );
};

// ─── 6. Polls ───
const PollView: View = (data) => {
  const polls = Array.isArray(data) ? data : data?.polls ?? (data?.options || data?.question ? [data.poll ?? data] : null);
  if (!polls || !Array.isArray(polls) || polls.length === 0 || !polls.every((p) => p && typeof p === 'object')) return null;
  return (
    <div className="flex flex-col gap-3">
      {polls.slice(0, 5).map((p: any, i: number) => {
        const options: any[] = Array.isArray(p.options) ? p.options : [];
        const counts = p.vote_counts && typeof p.vote_counts === 'object' ? p.vote_counts : {};
        const votes = options.map((o) => Number(typeof o === 'object' ? counts[o.id] ?? pick(o, ['votes', 'vote_count', 'count']) ?? 0 : counts[o] ?? 0));
        const total = Number(p.total_votes ?? votes.reduce((a, b) => a + b, 0));
        const closed = p.closes_at && new Date(p.closes_at).getTime() < Date.now();
        return (
          <div key={i} className="rounded-lg border border-slate-200 dark:border-[#2a2a2a] p-3 flex flex-col gap-2 bg-white/60 dark:bg-transparent">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-[13.5px] font-medium text-slate-800 dark:text-[#ececec] truncate">{str(pick(p, ['question', 'title', 'name'])) ?? 'Poll'}</span>
              {p.closes_at && <Chip>{closed ? 'Closed' : 'Open'}</Chip>}
              {p.allow_multiple && <Chip>Multiple choice</Chip>}
              {p.is_anonymous && <Chip>Anonymous</Chip>}
            </div>
            {options.length === 0 ? <KeyValueTable data={p} maxRows={6} /> : options.map((o, j) => {
              const label = typeof o === 'object' ? str(pick(o, ['text', 'label', 'option', 'name', 'title'])) : String(o);
              const pct = total ? Math.round((votes[j]! / total) * 100) : 0;
              return (
                <div key={j} className="flex flex-col gap-0.5">
                  <div className="flex justify-between gap-3 text-[12.5px] text-slate-600 dark:text-[#bdbdbd]"><span className="truncate">{label}</span><span className="tabular-nums shrink-0">{votes[j]} · {pct}%</span></div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#262626] overflow-hidden"><div className="h-full rounded-full bg-slate-400 dark:bg-[#6b6b6b]" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            <div className="text-[12px] text-slate-400 dark:text-[#7a7a7a]">{total} {total === 1 ? 'vote' : 'votes'}{p.closes_at ? ` · ${closed ? 'closed' : 'closes'} ${when(p.closes_at)}` : ''}</div>
          </div>
        );
      })}
      {polls.length > 5 && <Muted>+{polls.length - 5} more polls</Muted>}
    </div>
  );
};

// ─── 7. Schedules / scheduled tasks ───
const SchedulesView = listOf((s) => {
  const channels = [s.email_subject || s.email_body ? 'Email' : null, s.whatsapp_message || s.whatsapp_phone_number ? 'WhatsApp' : null].filter(Boolean).join(' + ');
  return {
    leading: icon(Clock),
    title: str(pick(s, ['title', 'name', 'summary'])) ?? 'Schedule',
    subtitle: [str(pick(s, ['summary', 'description', 'action_info'])), channels || undefined, s.repeat && s.repeat !== 'none' ? `Repeats ${str(s.repeat)}` : undefined].filter(Boolean).join(' · ') || undefined,
    chip: pick(s, ['status']) ? <Chip>{str(s.status)}</Chip> : undefined,
    meta: when(pick(s, ['scheduled_at', 'next_run', 'nextRun', 'run_at', 'sent_at'])),
  };
}, { max: 8, empty: 'No schedules' });

// ─── 8. Support tickets / Classgrid Talks ───
const TicketsView = listOf((t) => ({
  leading: icon(Ticket),
  title: str(pick(t, ['subject', 'title', 'topic', 'name'])) ?? `#${str(pick(t, ['ticket_number', '_id', 'id'])) ?? ''}`,
  subtitle: [str(pick(t, ['submitterName', 'submittedBy.name', 'user_name', 'submitterEmail'])), str(pick(t, ['category'])), t.priority ? `${str(t.priority)} priority` : undefined, t.assignedTo?.name ? `→ ${t.assignedTo.name}` : undefined].filter(Boolean).join(' · ') || undefined,
  chip: pick(t, STATUS) ? <Chip>{str(pick(t, STATUS))}</Chip> : undefined,
  meta: when(pick(t, ['updatedAt', 'updated_at', 'createdAt', 'created_at'])),
}), { max: 8, empty: 'No tickets' });

const TicketDetailView: View = (data, ctx) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return TicketsView(data, ctx);
  if (data.draftContent !== undefined) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">{icon(FileText)}<span className="text-[13.5px] font-medium text-slate-800 dark:text-[#ececec]">Saved draft</span>{data.source && <Chip>{str(data.source)}</Chip>}</div>
        <TextBlock text={plain(data.draftContent) ?? ''} />
      </div>
    );
  }
  const t = data.ticket ?? data.talk ?? data;
  const thread = [...(Array.isArray(t.messages) ? t.messages : []), ...(Array.isArray(t.replies) ? t.replies : [])];
  const summary: Record<string, any> = {};
  for (const k of ['submitterName', 'submitterEmail', 'category', 'priority', 'assignedTo', 'slaStatus', 'satisfaction', 'createdAt', 'resolvedAt']) if (t[k] !== undefined && t[k] !== null && t[k] !== '') summary[k] = k === 'assignedTo' ? t[k]?.name ?? t[k] : t[k];
  const attachments: any[] = Array.isArray(t.attachments) ? t.attachments : [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon(Ticket)}
        <span className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{str(pick(t, ['subject', 'title', 'topic'])) ?? 'Ticket'}</span>
        {pick(t, STATUS) && <Chip>{str(pick(t, STATUS))}</Chip>}
      </div>
      {Object.keys(summary).length > 0 && <KeyValueTable data={summary} maxRows={9} />}
      {t.message && thread.length === 0 && <TextBlock text={plain(t.message) ?? ''} />}
      {thread.length > 0 && <div className="flex flex-col gap-2"><SectionLabel>Conversation</SectionLabel>{MessagesView(thread, ctx) ?? <DataTable rows={thread} />}</div>}
      {attachments.length > 0 && <div className="flex flex-col gap-1.5"><SectionLabel>Attachments</SectionLabel>{AttachmentView(attachments, ctx)}</div>}
    </div>
  );
};

// ─── 9. Leads ───
const leadSpec = (l: any): ListItemSpec => ({
  leading: <Avatar name={str(pick(l, ['institutionName', 'adminName', 'name']))} />,
  title: str(pick(l, ['institutionName', 'organization_name', 'adminName', 'name', 'company'])) ?? 'Lead',
  subtitle: [str(pick(l, ['adminName', 'contact_name'])), str(pick(l, ['adminEmail', 'email'])), str(pick(l, ['city'])), l.studentCount ? `${l.studentCount} students` : undefined].filter(Boolean).join(' · ') || undefined,
  chip: pick(l, ['lifecycleStage', 'status']) ? <Chip>{str(pick(l, ['lifecycleStage', 'status']))}</Chip> : undefined,
  meta: l.meetingScheduledAt ? `Meeting ${when(l.meetingScheduledAt)}` : when(pick(l, ['createdAt', 'created_at'])),
});
const LeadsView: View = (data, ctx) => {
  const { list } = unwrapList(data);
  if (list) return listOf(leadSpec, { max: 8, empty: 'No leads' })(data, ctx);
  if (!data || typeof data !== 'object') return null;
  const spec = leadSpec(data);
  return (
    <div className="flex flex-col gap-3">
      <ItemList items={[spec]} />
      {data.message && <TextBlock text={String(data.message)} />}
      <KeyValueTable data={Object.fromEntries(Object.entries(data).filter(([k]) => !['message', 'otpExpiresAt'].includes(k)))} maxRows={12} />
    </div>
  );
};

// ─── 10. Skills (results are text) ───
const SkillsView: View = (data, ctx) => {
  const text = ctx.text;
  const rows = [...text.matchAll(/^-\s*ID:\s*([^,]+),\s*Name:\s*(.+?),\s*Active:\s*(\w+)(?:,\s*Default:\s*(\w+))?\s*$/gm)];
  if (rows.length) {
    return <ItemList max={12} items={rows.map((r) => ({ leading: icon(Sparkles), title: r[2]!, chip: <Chip>{r[3] === 'true' ? 'Active' : 'Off'}</Chip>, meta: r[4] === 'true' ? 'Default' : undefined }))} />;
  }
  const read = text.match(/Skill Name:\s*(.+)\n+Instructions:\s*([\s\S]*)/);
  const fenced = text.match(/```skill\s*([\s\S]*?)```/);
  let name = read?.[1]; let body = read?.[2];
  if (!read && fenced) { try { const j = JSON.parse(fenced[1]!); name = j.name; body = j.instructions; } catch { /* keep text */ } }
  if (name || body) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">{icon(Sparkles)}<span className="text-[14px] font-semibold text-slate-900 dark:text-white">{name ?? 'Skill'}</span></div>
        {body && <TextBlock text={body.trim()} />}
      </div>
    );
  }
  return ActionDoneView(data, ctx);
};

// ─── 11. Files on disk / project / sandbox (list) ───
const extIcon = (name: string) => (/\.(png|jpe?g|gif|webp|svg)$/i.test(name) ? ImageIcon : /\.(md|txt|pdf|docx?)$/i.test(name) ? FileText : File);
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
const FilesView: View = (data, ctx) => {
  if (data === undefined) {
    const lines = ctx.text.split('\n').map((l) => l.trim()).filter(Boolean);
    const paths = lines.filter((l) => /^[\w./@-][\w ./@()+-]*$/.test(l) && !/\s{2,}/.test(l) && (l.includes('/') || l.includes('.')));
    if (paths.length < 2) return null;
    const head = lines.filter((l) => !paths.includes(l)).slice(0, 2).join(' · ');
    return (
      <div className="flex flex-col gap-2">
        {head && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{head}</span>}
        <ItemList max={14} items={paths.map((p) => ({ leading: icon(p.endsWith('/') ? Folder : extIcon(p)), title: <span className="font-mono text-[12.5px]">{p}</span> }))} />
      </div>
    );
  }
  const { list } = unwrapList(data);
  if (list && list.every((f) => typeof f === 'string')) {
    return <ItemList max={14} items={(list as string[]).map((p) => ({ leading: icon(p.endsWith('/') ? Folder : extIcon(p)), title: p }))} />;
  }
  if (!list) return null;
  return listOf((f) => {
    const name = str(pick(f, ['name', 'filename', 'file', 'path', 'title'])) ?? 'file';
    const isDir = ['dir', 'directory', 'folder'].includes(String(pick(f, ['type', 'kind']) ?? '')) || pick(f, ['isDirectory', 'is_dir']) === true;
    const size = pick(f, ['size', 'bytes', 'sizeBytes', 'file_size']);
    const path = str(pick(f, ['path']));
    return {
      leading: icon(isDir ? Folder : extIcon(name)),
      title: name,
      subtitle: path && path !== name ? path : undefined,
      meta: typeof size === 'number' && !isDir ? formatBytes(size) : when(pick(f, ['modified', 'mtime', 'updated_at', 'modifiedTime'])),
      href: httpUrl(pick(f, ['html_url', 'webViewLink', 'url'])),
    };
  }, { max: 12, empty: 'No files' })(data, ctx);
};

// ─── 12. File content (code / text) ───
const FileContentView: View = (data, ctx) => {
  const content = data && typeof data === 'object' ? pick(data, ['content', 'text', 'data', 'body', 'output']) : undefined;
  const text = typeof content === 'string' ? content : data === undefined ? ctx.text : undefined;
  if (!text) return null;
  const path = str(pick(ctx.args, ['path', 'file_path', 'filePath', 'filename', 'file', 'name'])) ?? str(pick(data, ['path', 'name']));
  return (
    <div className="flex flex-col gap-1.5">
      {path && <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#9a9a9a] min-w-0">{icon(extIcon(path))}<span className="font-mono truncate">{path}</span></div>}
      <TextBlock text={text} />
    </div>
  );
};

// ─── 13. Google Drive / OneDrive / cloud files ───
const DriveView = listOf((f) => {
  const name = str(pick(f, ['name', 'title', 'fileName'])) ?? 'File';
  const mime = String(pick(f, ['mimeType', 'mime_type', 'type']) ?? '');
  const isFolder = /folder/.test(mime);
  return {
    leading: icon(isFolder ? Folder : /image/.test(mime) ? ImageIcon : /document|text|pdf|sheet|presentation/.test(mime) ? FileText : File),
    title: name,
    subtitle: mime ? mime.replace('application/vnd.google-apps.', 'Google ').replace(/^application\//, '') : undefined,
    meta: when(pick(f, ['modifiedTime', 'lastModifiedDateTime', 'createdTime', 'updated_at'])),
    href: httpUrl(pick(f, ['webViewLink', 'webUrl', 'alternateLink', 'url', 'link'])),
  };
}, { max: 10, empty: 'No files found' });

// ─── 14. Email (Gmail / Outlook) ───
const EmailView: View = (data, ctx) => {
  const { list } = unwrapList(data);
  if (!list) {
    if (data && typeof data === 'object' && pick(data, ['subject', 'snippet', 'body', 'bodyPreview'])) return <EmailCard m={data} full />;
    return null;
  }
  if (!list.every((m) => m && typeof m === 'object' && (m.subject !== undefined || m.snippet !== undefined || m.bodyPreview !== undefined))) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {list.slice(0, 8).map((m, i) => <EmailCard key={i} m={m} />)}
      {list.length > 8 && <Muted>+{list.length - 8} more emails</Muted>}
    </div>
  );
};

function EmailCard({ m, full }: { m: any; full?: boolean }) {
  const from = str(pick(m, ['senderName', 'from.emailAddress.name', 'from.name', 'from', 'sender', 'senderEmail']));
  const to = Array.isArray(m.toRecipients) ? m.toRecipients.map((r: any) => r?.emailAddress?.address ?? r?.emailAddress?.name).filter(Boolean).join(', ') : str(m.to);
  const attachments: any[] = Array.isArray(m.attachments) ? m.attachments : [];
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 bg-white/60 dark:bg-transparent flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate text-[13px] font-medium text-slate-800 dark:text-[#ececec]">{from ?? (to ? `To ${to}` : 'Email')}</span>
        {(m.unread === true || m.isRead === false) && <Chip tone="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Unread</Chip>}
        <span className="ml-auto shrink-0 text-[11.5px] text-slate-400 dark:text-[#7a7a7a]">{when(pick(m, ['date', 'receivedDateTime', 'sentDateTime', 'internalDate', 'sent_at']))}</span>
      </div>
      <span className="truncate text-[13px] text-slate-800 dark:text-[#e2e2e2]">{str(pick(m, ['subject'])) ?? <Muted>(no subject)</Muted>}</span>
      {full && to && from && <span className="text-[12px] text-slate-500 dark:text-[#9a9a9a] truncate">To: {to}</span>}
      <span className={full ? 'text-[12.5px] text-slate-600 dark:text-[#b0b0b0] whitespace-pre-wrap line-clamp-[14]' : 'text-[12.5px] text-slate-500 dark:text-[#9a9a9a] line-clamp-2'}>
        {plain(pick(m, full ? ['body', 'text', 'snippet', 'bodyPreview'] : ['snippet', 'bodyPreview']))}
      </span>
      {attachments.length > 0 && <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-slate-500 dark:text-[#9a9a9a]"><Paperclip className="h-3 w-3" />{attachments.map((a) => a?.filename ?? a?.name).filter(Boolean).join(', ')}</span>}
    </div>
  );
}

// ─── 15. Calendar events / meetings (Google, Zoom, Teams) ───
const EventsView: View = (data) => {
  const { list } = unwrapList(data);
  const events = list ?? (data && typeof data === 'object' && !Array.isArray(data) && pick(data, ['start', 'start_time', 'startTime', 'startDateTime', 'summary', 'topic']) ? [data] : null);
  if (!events || !events.every((e) => e && typeof e === 'object')) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {events.slice(0, 8).map((e: any, i: number) => {
        const startRaw = pick(e, ['start.dateTime', 'start.date', 'startDateTime', 'start_time', 'startTime', 'scheduled_at']);
        const d = startRaw ? new Date(startRaw) : null;
        const valid = !!d && !Number.isNaN(d.getTime());
        const join = httpUrl(pick(e, ['hangoutLink', 'conferenceData.entryPoints.0.uri', 'join_url', 'joinUrl', 'joinWebUrl', 'onlineMeeting.joinUrl']));
        const open = httpUrl(pick(e, ['htmlLink', 'webLink', 'url']));
        const attendees = Array.isArray(e.attendees) ? e.attendees.length : Array.isArray(e.participants?.attendees) ? e.participants.attendees.length : 0;
        return (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 bg-white/60 dark:bg-transparent">
            <div className="w-11 shrink-0 rounded-md bg-slate-100 dark:bg-[#232323] text-center py-1">
              <div className="text-[10px] uppercase text-slate-500 dark:text-[#8a8a8a]">{valid ? d!.toLocaleString(undefined, { month: 'short' }) : '—'}</div>
              <div className="text-[15px] font-semibold leading-tight text-slate-900 dark:text-white">{valid ? d!.getDate() : <Calendar className="h-4 w-4 mx-auto" />}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-slate-800 dark:text-[#ececec]">{str(pick(e, ['summary', 'subject', 'topic', 'title', 'name'])) ?? 'Event'}</div>
              <div className="truncate text-[12px] text-slate-500 dark:text-[#9a9a9a]">
                {[valid ? d!.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : str(startRaw), e.duration ? `${e.duration} min` : undefined, str(e.location), attendees ? `${attendees} attendees` : undefined, e.status && e.status !== 'confirmed' ? str(e.status) : undefined].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span className="shrink-0 text-[13px]">{join ? <LinkValue href={join}>Join</LinkValue> : open ? <LinkValue href={open}>Open</LinkValue> : null}</span>
          </div>
        );
      })}
      {events.length > 8 && <Muted>+{events.length - 8} more events</Muted>}
    </div>
  );
};

// ─── 16. Google Classroom (courses, coursework, announcements, topics, submissions, teachers) ───
const ClassroomView: View = (data, ctx) => {
  const inner = data?.coursework ?? data?.announcement;
  const { list } = unwrapList(inner ? [inner] : data);
  if (!list) return null;
  if (list.every((x) => x?.profile)) return listOf((t) => personSpec({ ...t.profile, name: t.profile?.name?.fullName, email: t.profile?.emailAddress, avatar: t.profile?.photoUrl }))(list, ctx);
  return listOf((c) => {
    const due = c.dueDate && typeof c.dueDate === 'object' ? new Date(c.dueDate.year, (c.dueDate.month ?? 1) - 1, c.dueDate.day ?? 1) : null;
    return {
      leading: icon(c.text && !c.title ? MessageSquare : BookOpen),
      title: str(pick(c, ['name', 'title'])) ?? str(shortText(c.text ?? '', 90)) ?? (c.userId ? `Student ${c.userId}` : 'Item'),
      subtitle: [str(c.section), str(c.room), str(c.workType)?.replace(/_/g, ' ').toLowerCase(), c.maxPoints ? `${c.maxPoints} points` : undefined, c.assignedGrade !== undefined ? `Grade ${c.assignedGrade}` : undefined, c.late ? 'Late' : undefined].filter(Boolean).join(' · ') || str(c.description),
      chip: pick(c, ['courseState', 'state']) ? <Chip>{String(pick(c, ['courseState', 'state'])).replace(/_/g, ' ').toLowerCase()}</Chip> : undefined,
      meta: due ? `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : when(pick(c, ['updateTime', 'creationTime'])),
      href: httpUrl(c.alternateLink),
    };
  }, { max: 10, empty: 'Nothing found in Classroom' })(list, ctx);
};

// ─── 17. Google Forms ───
const FormsView: View = (data, ctx) => {
  if (data?.formUrl || (data?.formId && !data.items)) return <LinkCard icon={ClipboardList} title="Form created" href={httpUrl(data.formUrl ?? data.responderUri)} sub={str(data.formId)} />;
  if (data?.items || data?.info) {
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">{icon(ClipboardList)}<span className="text-[14px] font-semibold text-slate-900 dark:text-white">{str(data.info?.title) ?? 'Form'}</span><span className="text-[12px] text-slate-400">{items.length} questions</span></div>
        {data.info?.description && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{str(data.info.description)}</span>}
        <ItemList max={10} items={items.map((q, i) => ({ leading: <span className="text-[12px] tabular-nums text-slate-400 w-4 text-right">{i + 1}</span>, title: str(q.title) ?? 'Question', subtitle: q.questionItem?.question?.required ? 'Required' : undefined }))} />
        {data.responderUri && <span className="text-[13px]"><LinkValue href={data.responderUri}>Open form</LinkValue></span>}
      </div>
    );
  }
  const { list } = unwrapList(data);
  if (list && list.every((r) => r?.responseId || r?.answers)) {
    return <DataTable rows={list.map((r) => ({ respondent: r.respondentEmail ?? 'Anonymous', submitted: r.lastSubmittedTime ?? r.createTime, answers: r.answers ? Object.keys(r.answers).length : 0 }))} />;
  }
  return GenericView(data, ctx);
};

function LinkCard({ icon: Icon, title, href, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; href?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 bg-white/60 dark:bg-transparent min-w-0">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-slate-800 dark:text-[#ececec]">{title}</div>
        {sub && <div className="truncate text-[12px] text-slate-500 dark:text-[#9a9a9a]">{sub}</div>}
      </div>
      {href && <span className="shrink-0 text-[12.5px]"><LinkValue href={href}>Open</LinkValue></span>}
    </div>
  );
}

// ─── 18. Notion ───
const NotionView: View = (data, ctx) => {
  if (data === undefined) return null;
  return listOf((p) => {
    const titleProp = p?.properties && (Object.values(p.properties).find((v: any) => v?.type === 'title') as any);
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || str(pick(p, ['title', 'name', 'plain_text'])) || 'Untitled';
    return {
      leading: <span className="text-[15px] leading-none">{p?.icon?.emoji ?? (p?.object === 'database' ? '🗂️' : '📄')}</span>,
      title,
      subtitle: str(p.object),
      meta: when(pick(p, ['last_edited_time', 'created_time'])),
      href: httpUrl(pick(p, ['url', 'public_url'])),
    };
  }, { max: 10, empty: 'No Notion pages found' })(data, ctx);
};

// ─── 19. GitHub ───
const repoSpec = (r: any): ListItemSpec => ({
  leading: icon(GitBranch),
  title: str(pick(r, ['full_name', 'name'])) ?? 'Repository',
  subtitle: str(pick(r, ['description', 'language'])),
  chip: r?.private !== undefined ? <Chip>{r.private ? 'Private' : 'Public'}</Chip> : undefined,
  meta: [r?.stargazers_count !== undefined ? `★ ${r.stargazers_count}` : undefined, when(pick(r, ['updated_at', 'pushed_at']))].filter(Boolean).join(' · ') || undefined,
  href: httpUrl(pick(r, ['html_url', 'url'])),
});
const GitHubView: View = (data, ctx) => {
  if (data === undefined) return null;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (Array.isArray(data.files) && data.sha) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">{icon(GitBranch)}<span className="truncate text-[13.5px] font-medium text-slate-800 dark:text-[#ececec]">{str(data.message)?.split('\n')[0] ?? 'Commit'}</span><Chip>{String(data.sha).slice(0, 7)}</Chip></div>
          <DataTable rows={data.files.map((f: any) => ({ file: f.filename, status: f.status, added: f.additions, removed: f.deletions }))} columns={['file', 'status', 'added', 'removed']} />
        </div>
      );
    }
    if (pick(data, ['full_name', 'clone_url'])) return listOf(repoSpec)([data], ctx);
    if (data.number && data.html_url) return <LinkCard icon={GitBranch} title={`#${data.number}${data.title ? ` ${data.title}` : ''}`} href={data.html_url} sub={str(data.state)} />;
    if (data.commit || data.files_pushed) return <LinkCard icon={GitBranch} title={data.files_pushed ? `Pushed ${data.files_pushed.length} files${data.branch ? ` to ${data.branch}` : ''}` : 'Committed'} href={httpUrl(data.commit?.html_url ?? data.commit)} sub={Array.isArray(data.files_pushed) ? data.files_pushed.slice(0, 6).join(', ') : undefined} />;
    return null;
  }
  return listOf((r) => (pick(r, ['full_name', 'stargazers_count', 'default_branch']) !== undefined ? repoSpec(r) : {
    leading: icon(GitBranch),
    title: str(pick(r, ['title', 'message', 'name', 'path'])) ?? (r.sha ? String(r.sha).slice(0, 7) : 'Item'),
    subtitle: [r.number ? `#${r.number}` : undefined, str(pick(r, ['user.login', 'user', 'author', 'repository.full_name', 'path'])), r.commit_sha ? String(r.commit_sha).slice(0, 7) : r.sha && r.message ? String(r.sha).slice(0, 7) : undefined].filter(Boolean).join(' · ') || undefined,
    chip: pick(r, ['state', 'status', 'conclusion']) ? <Chip>{str(pick(r, ['state', 'status', 'conclusion']))}</Chip> : undefined,
    meta: when(pick(r, ['date', 'updated_at', 'created_at'])),
    href: httpUrl(pick(r, ['html_url', 'url'])),
  }), { max: 10, empty: 'Nothing found on GitHub' })(data, ctx);
};

// ─── 20. Deployments (Vercel / Classgrid Cloud) ───
const DeployView: View = (data, ctx) => {
  if (data === undefined) {
    const live = ctx.text.match(/(?:Live (?:at|URL):\s*)(https?:\/\/\S+)/i)?.[1] ?? urlsIn(ctx.text).pop();
    if (!live) return null;
    return (
      <div className="flex flex-col gap-2">
        <LinkCard icon={Rocket} title={failedText(ctx.text) ? 'Did not deploy' : 'Live'} href={live} sub={live.replace(/^https?:\/\//, '')} />
        <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] whitespace-pre-wrap line-clamp-4">{ctx.text}</span>
      </div>
    );
  }
  const { list, rest } = unwrapList(data);
  if (!list) {
    if (data?.created?.key) return <LinkCard icon={Rocket} title={`Env variable ${data.created.key} added`} sub={([] as any[]).concat(data.created.target ?? []).join(', ')} />;
    if (data && typeof data === 'object' && pick(data, ['url', 'alias', 'readyState'])) {
      const url = httpUrl(pick(data, ['alias.0', 'url', 'alias']));
      return (
        <div className="flex flex-col gap-2">
          <LinkCard icon={Rocket} title={str(data.name) ?? 'Deployment'} href={url} sub={str(pick(data, ['readyState', 'state']))} />
          <KeyValueTable data={data} maxRows={8} />
        </div>
      );
    }
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <CountsLine rest={rest} />
      <ItemList max={8} empty="No deployments" items={list.map((d) => ({
        leading: icon(Rocket),
        title: str(pick(d, ['name', 'url'])) ?? 'Deployment',
        subtitle: [str(d.url), str(d.target), str(d.framework)].filter(Boolean).join(' · ') || undefined,
        chip: pick(d, ['readyState', 'state']) ? <Chip>{str(pick(d, ['readyState', 'state']))}</Chip> : undefined,
        meta: when(pick(d, ['createdAt', 'created', 'updatedAt'])),
        href: httpUrl(pick(d, ['url', 'link'])),
      }))} />
    </div>
  );
};

// ─── 21. Social posts / videos / comments (Facebook, Instagram, YouTube) ───
const SocialView: View = (data, ctx) => {
  if (data === undefined) return null;
  const { list, rest } = unwrapList(data);
  if (!list) return ProfileView({ ...data, name: data?.name ?? data?.username }, ctx) ?? null;
  return (
    <div className="flex flex-col gap-2">
      <CountsLine rest={Object.fromEntries(Object.entries(rest).filter(([k]) => !['kind', 'etag'].includes(k)))} />
      <ItemList max={8} empty="No posts" items={list.map((p) => {
        const thumb = pick(p, ['snippet.thumbnails.medium.url', 'snippet.thumbnails.default.url', 'thumbnail_url', 'media_url', 'full_picture', 'picture']);
        const stats = p.statistics ?? {};
        return {
          leading: thumb && /^https?:/.test(thumb) && p.media_type !== 'VIDEO' ? <img src={thumb} alt="" className="h-10 w-10 rounded-md object-cover bg-slate-100 dark:bg-[#2a2a2a]" /> : icon(Globe),
          title: str(pick(p, ['snippet.title', 'title', 'snippet.topLevelComment.snippet.textDisplay', 'message', 'caption', 'name', 'text'])) ?? 'Post',
          subtitle: [str(pick(p, ['snippet.channelTitle', 'snippet.topLevelComment.snippet.authorDisplayName', 'from.name', 'username'])), str(p.media_type)?.toLowerCase(), stats.subscriberCount ? `${Number(stats.subscriberCount).toLocaleString()} subscribers` : undefined, stats.viewCount ? `${Number(stats.viewCount).toLocaleString()} views` : undefined].filter(Boolean).join(' · ') || undefined,
          meta: when(pick(p, ['snippet.publishedAt', 'created_time', 'timestamp', 'updated_time'])),
          href: httpUrl(pick(p, ['permalink_url', 'permalink', 'link'])) ?? (p.id?.videoId ? `https://www.youtube.com/watch?v=${p.id.videoId}` : undefined),
        };
      })} />
    </div>
  );
};

// ─── 22. Message sent (Grids, groups, WhatsApp, announcements, Slack, Teams) ───
const SentView: View = (data, ctx) => {
  const to = str(pick(ctx.args, ['to', 'recipient', 'phone', 'phone_number', 'phoneNumber', 'channel', 'channel_id', 'channelId', 'chatId', 'recipient_name', 'thread_id', 'threadId', 'group_id', 'groupId', 'user_id', 'userId', 'email']));
  const message = str(pick(ctx.args, ['message', 'text', 'content', 'body', 'announcement']));
  const failed = failedText(ctx.text) || !!(data && typeof data === 'object' && (data.error || data.success === false));
  if (!message && !to && data === undefined && !ctx.text) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 bg-white/60 dark:bg-transparent min-w-0">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-[#9a9a9a] min-w-0">
            <span className="truncate">{to ? `To ${to}` : 'Message'}</span>
            <Chip>{failed ? 'Failed' : 'Sent'}</Chip>
          </div>
          {message && <div className="mt-1 text-[13px] text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words line-clamp-6">{message}</div>}
        </div>
      </div>
      {ctx.text && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] whitespace-pre-wrap line-clamp-3">{ctx.text}</span>}
    </div>
  );
};

// ─── 23. Images (generate / edit / view) ───
const ImageView: View = (data, ctx) => {
  const url = pick(data, ['url', 'image_url', 'imageUrl', 'public_url', 'publicUrl']) ?? urlsIn(ctx.text).pop();
  if (!url || !/^https?:/.test(String(url))) return null;
  return (
    <div className="flex flex-col gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block w-fit" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={str(pick(ctx.args, ['prompt'])) ?? 'Image'} className="max-h-64 rounded-lg border border-slate-200 dark:border-[#2a2a2a] object-contain bg-white dark:bg-[#1b1b1b]" />
      </a>
      {pick(ctx.args, ['prompt']) && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] line-clamp-3">{str(pick(ctx.args, ['prompt']))}</span>}
    </div>
  );
};

// ─── 24. Attachments / file links ───
const AttachmentView: View = (data, ctx) => {
  const list: any[] = Array.isArray(data) ? data : data && typeof data === 'object' && pick(data, URL_KEYS) ? [data] : [];
  const files = list.filter((f) => f && typeof f === 'object' && pick(f, URL_KEYS));
  if (files.length === 0) {
    const url = urlsIn(ctx.text)[0];
    if (!url) return null;
    files.push({ url, name: decodeURIComponent(url.split('?')[0]!.split('/').pop() ?? 'File') });
  }
  return (
    <div className="flex flex-col gap-2">
      {files.slice(0, 8).map((f, i) => {
        const url = String(pick(f, URL_KEYS));
        const name = str(pick(f, ['file_name', 'fileName', 'name', 'filename'])) ?? decodeURIComponent(url.split('?')[0]!.split('/').pop() ?? 'File');
        const isImage = /^image\//.test(String(pick(f, ['file_type', 'mimeType', 'type']) ?? '')) || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);
        const size = pick(f, ['file_size', 'sizeBytes', 'size']);
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-3 py-2 bg-white/60 dark:bg-transparent min-w-0">
              <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-[13px] font-medium text-slate-800 dark:text-[#ececec]">{name}</span>
              {typeof size === 'number' && <span className="shrink-0 text-[12px] text-slate-400">{formatBytes(size)}</span>}
              <span className="ml-auto shrink-0 text-[12.5px]"><LinkValue href={url}>Open</LinkValue></span>
            </div>
            {isImage && <img src={url} alt={name} className="max-h-48 w-fit rounded-lg border border-slate-200 dark:border-[#2a2a2a] object-contain" />}
          </div>
        );
      })}
      {files.length > 8 && <Muted>+{files.length - 8} more files</Muted>}
    </div>
  );
};

// ─── 25. Numbers / stats ───
const StatsView: View = (data, ctx) => {
  if (data === undefined) {
    const t = ctx.text.trim();
    const m = t.match(/^([^:\n]{2,60}):\s*(-?\d[\d,]*(\.\d+)?)\s*$/);
    if (!m) return null;
    return <StatTiles stats={[{ label: m[1]!.trim(), value: Number(m[2]!.replace(/,/g, '')) }]} />;
  }
  const byGroup = CountByView(data, ctx);
  if (byGroup) return byGroup;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const nums = Object.entries(data).filter(([, v]) => typeof v === 'number');
  if (nums.length === 0) return null;
  const rest = Object.fromEntries(Object.entries(data).filter(([k]) => !nums.some(([n]) => n === k)));
  return (
    <div className="flex flex-col gap-2">
      <StatTiles stats={nums.slice(0, 9).map(([k, v]) => ({ label: humanizeKey(k), value: v }))} />
      {Object.keys(rest).length > 0 && <KeyValueTable data={rest} maxRows={8} />}
    </div>
  );
};

// ─── 26. Server status / logs / transcripts (long text) ───
const LogsView: View = (data, ctx) => {
  const text = data && typeof data === 'object' ? pick(data, ['logs', 'output', 'stdout', 'text']) : data === undefined ? ctx.text : undefined;
  if (typeof text !== 'string' && !Array.isArray(text)) return null;
  const label = /transcript/.test(String(ctx.args?.operation ?? ctx.tool)) ? 'Transcript' : ctx.tool === 'get_server_status' ? 'Server status' : 'Logs';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{icon(Terminal)}<span>{label}</span></div>
      <TextBlock text={Array.isArray(text) ? text.join('\n') : text} />
    </div>
  );
};

// ─── 27. Database rows (Supabase, Sanity, SES stats) ───
const RowsView: View = (data, ctx) => {
  if (data === undefined) return null;
  const { list, rest } = unwrapList(data);
  if (!list) {
    if (Array.isArray(data) && data.every((v) => typeof v !== 'object')) return <ItemList max={14} items={data.map((v) => ({ leading: icon(Hash), title: String(v) }))} />;
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">
        {icon(Database)}<span>{list.length} {list.length === 1 ? 'row' : 'rows'}</span>
        {typeof rest.ms === 'number' && <span>· {rest.ms} ms</span>}
        {ctx.text && <span className="truncate">· {shortText(ctx.text, 80)}</span>}
      </div>
      <DataTable rows={list} />
    </div>
  );
};

// ─── 28. Something was created / changed / deleted / sent ───
const VERB_LABEL: Record<string, string> = { create: 'Created', add: 'Added', delete: 'Deleted', update: 'Updated', edit: 'Updated', close: 'Closed', reopen: 'Reopened', assign: 'Assigned', approve: 'Approved', save: 'Saved', schedule: 'Scheduled', request: 'Requested', reply: 'Replied', attach: 'Attached', warn: 'Noted', end: 'Ended', manage: 'Done', push: 'Pushed', deploy: 'Deployed', upload: 'Uploaded', transcribe: 'Transcribed', stop: 'Stopped', start: 'Started', mark: 'Marked', send: 'Sent', invite: 'Invited', archive: 'Archived', publish: 'Published' };
const ActionDoneView: View = (data, ctx) => {
  const verb = String(ctx.args?.operation ?? ctx.tool).split('_')[0] ?? '';
  const label = VERB_LABEL[verb];
  const failed = failedText(ctx.text) || !!(data && typeof data === 'object' && !Array.isArray(data) && (data.error || data.success === false));
  if (!label && !failed && !(data && typeof data === 'object' && 'success' in data)) return null;
  const detail = data && typeof data === 'object' ? str(data.message ?? data.error) : ctx.text;
  const rest = data && typeof data === 'object' && !Array.isArray(data) ? Object.fromEntries(Object.entries(data).filter(([k]) => !['message', 'success', 'error'].includes(k))) : null;
  const ids = ctx.text.match(/\b(?:ID|id|schedule_id is|Org ID|Message ID):?\s*([\w-]{6,})/)?.[1];
  const link = urlsIn(ctx.text)[0];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2 min-w-0">
        {failed ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
        <div className="min-w-0 flex-1">
          <span className="text-[13.5px] font-medium text-slate-800 dark:text-[#ececec]">{failed ? 'Did not work' : label ?? 'Done'}</span>
          {detail && <div className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a] whitespace-pre-wrap break-words line-clamp-4">{detail}</div>}
        </div>
        {ids && !failed && <Chip>{ids.length > 14 ? `${ids.slice(0, 8)}…` : ids}</Chip>}
      </div>
      {link && !failed && <LinkValue href={link} />}
      {rest && Object.keys(rest).length > 0 && <KeyValueTable data={rest} maxRows={10} />}
    </div>
  );
};

// ─── Generic: any data at all ───
export const GenericView: View = (data, ctx) => {
  if (data === undefined) {
    if (!ctx.text) return <Muted>No response</Muted>;
    // A short sentence reads better as normal text than as a code box
    if (ctx.text.length < 400 && !/[{}<>=;]|\n\s{2,}/.test(ctx.text)) return <p className="text-[13.5px] leading-relaxed text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words">{ctx.text}</p>;
    return <TextBlock text={ctx.text} />;
  }
  const { list, rest } = unwrapList(data);
  if (list) {
    return (
      <div className="flex flex-col gap-2">
        {ctx.text && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{shortText(ctx.text, 200)}</span>}
        <CountsLine rest={rest} />
        {Object.keys(rest).some((k) => typeof rest[k] !== 'number') && <KeyValueTable data={Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'number'))} maxRows={6} />}
        <DataTable rows={list} />
      </div>
    );
  }
  if (Array.isArray(data)) return data.length && data.every((v) => typeof v !== 'object') ? <ItemList max={14} items={data.map((v) => ({ title: String(v) }))} /> : <Value value={data} />;
  if (data && typeof data === 'object') return (
    <div className="flex flex-col gap-2">
      {ctx.text && <span className="text-[12.5px] text-slate-500 dark:text-[#9a9a9a]">{shortText(ctx.text, 200)}</span>}
      <KeyValueTable data={data} />
    </div>
  );
  return <Value value={data} />;
};

// ─── Which view for which tool ───
const first = (...views: View[]): View => (d, c) => { for (const v of views) { const out = v(d, c); if (out) return out; } return null; };

const VIEWS: Array<[RegExp, View]> = [
  [/^get_my_profile$/, ProfileView],
  [/^(read_organization_details|get_organization_info|list_organizations)$/, OrgsView],
  [/^(list_global_users|list_recent_users|search_users_for_chat|list_group_members|list_department_admins|list_blog_subscribers)$/, PeopleView],
  [/^count_organization_users$/, CountByView],
  [/^(list_chat_threads|list_grids|list_group_chats)$/, ThreadsView],
  [/^(read_chat_messages|read_group_chat_messages)$/, MessagesView],
  [/^read_group_chat_details$/, ProfileView],
  [/^(list_group_polls|read_group_poll_details)$/, PollView],
  [/^list_schedules$/, SchedulesView],
  [/^(list_support_tickets|list_pending_support_tickets|list_classgrid_talks)$/, TicketsView],
  [/^(read_support_ticket_details|read_classgrid_talk_details|read_support_ticket_draft|read_classgrid_talk_draft)$/, TicketDetailView],
  [/^(list_leads|list_recent_leads|read_lead_details)$/, LeadsView],
  [/^(list_skills|read_skill|create_skill|update_skill|delete_skill)$/, SkillsView],
  [/^(list_project_files|search_project|search_project_by_meaning)$/, FilesView],
  [/^(read_local_file|read_sandbox_file|view_project_file|transcribe_audio)$/, FileContentView],
  [/^(recall_chat|search_recall_chat)$/, RecallView],
  [/^(send_chat_message|send_group_chat_message|send_whatsapp_message|send_group_announcement|whatsapp_business_connector)$/, SentView],
  [/^(generate_image|edit_image|view_image)$/, ImageView],
  [/^(get_chat_attachment_url|get_group_chat_attachment_url|upload_file_to_chat|upload_file_to_group_chat)$/, AttachmentView],
  [/^(count_.*|get_.*_stats|get_.*_count)$/, StatsView],
  [/^(read_server_logs|get_server_status)$/, LogsView],
  [/^(supabase_connector|sanity_connector|aws_ses_connector)$/, RowsView],
  [/^(github_workspace_connector|create_github_repo_for_project|push_project_to_github|update_project_github_repo)$/, GitHubView],
  [/^(vercel_connector|deploy_to_classgrid_cloud)$/, DeployView],
  [/^(facebook_connector|instagram_connector|youtube_connector)$/, SocialView],
  [/^notion_connector$/, NotionView],
  [/^zoom_connector$/, EventsView],
];

/** Connectors that cover many apps: choose by the operation name */
function operationView(tool: string, op: string): View | null {
  if (tool === 'google_workspace_connector') {
    if (/attachment|read_drive_file|read_classroom_file/.test(op)) return AttachmentView;
    if (/email/.test(op)) return EmailView;
    if (/event/.test(op)) return EventsView;
    if (/form/.test(op)) return FormsView;
    if (/classroom/.test(op)) return ClassroomView;
    if (/drive|folder/.test(op)) return DriveView;
  }
  if (tool === 'microsoft_workspace_connector') {
    if (/transcript/.test(op)) return LogsView;
    if (/email/.test(op)) return EmailView;
    if (/meeting/.test(op)) return EventsView;
    if (/^send_/.test(op)) return first(SentView);
    if (/messages/.test(op)) return MessagesView;
    if (/team|channel|chat/.test(op)) return ThreadsView;
  }
  if (tool === 'slack_workspace_connector') {
    if (/^send_/.test(op)) return SentView;
    if (/messages/.test(op)) return MessagesView;
    if (/users/.test(op)) return PeopleView;
    if (/channel/.test(op)) return ThreadsView;
  }
  if (/_connector$/.test(tool) && /profile/.test(op)) return ProfileView;
  if (/_connector$/.test(tool) && /^(send|reply)_/.test(op)) return SentView;
  return null;
}

export function renderToolResult(tool: string, args: any, parsed: Parsed): React.ReactNode {
  const ctx: Ctx = { tool, args: args ?? {}, text: parsed.text };
  const views: View[] = [];
  const opView = operationView(tool, String(args?.operation ?? '').toLowerCase());
  if (opView) views.push(opView);
  for (const [re, v] of VIEWS) if (re.test(tool)) views.push(v);
  // Write actions anywhere ("create_…", "delete_…", or an error) get the done / did-not-work card when nothing better fits
  views.push(ActionDoneView);
  for (const v of views) {
    const out = v(parsed.data, ctx);
    if (out) return out;
  }
  return GenericView(parsed.data, ctx);
}

