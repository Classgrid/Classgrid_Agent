// The step line says what the tool actually did and found ("Found 5 classroom assignments: BST Lab, Graphs"),
// instead of the same "Successfully used <tool>" line for every call.
import { parseResult, pick, unwrapList } from './primitives';

const PAST: Record<string, string> = {
  list: 'Found', search: 'Searched', find: 'Found', get: 'Read', read: 'Read', view: 'Viewed', count: 'Counted', recall: 'Recalled',
  create: 'Created', add: 'Added', update: 'Updated', edit: 'Updated', delete: 'Deleted', remove: 'Removed', close: 'Closed',
  reopen: 'Reopened', assign: 'Assigned', approve: 'Approved', save: 'Saved', schedule: 'Scheduled', request: 'Requested',
  reply: 'Replied to', attach: 'Attached', send: 'Sent', upload: 'Uploaded', mark: 'Marked', publish: 'Published', invite: 'Invited',
  archive: 'Archived', push: 'Pushed', deploy: 'Deployed', transcribe: 'Transcribed', query: 'Queried', manage: 'Updated',
  warn: 'Warned', end: 'Ended', generate: 'Generated', analyze: 'Analyzed', parse: 'Read', stop: 'Stopped', start: 'Started', check: 'Checked',
};
const ING: Record<string, string> = {
  list: 'Finding', search: 'Searching', find: 'Finding', get: 'Reading', read: 'Reading', view: 'Viewing', count: 'Counting', recall: 'Recalling',
  create: 'Creating', add: 'Adding', update: 'Updating', edit: 'Updating', delete: 'Deleting', remove: 'Removing', close: 'Closing',
  reopen: 'Reopening', assign: 'Assigning', approve: 'Approving', save: 'Saving', schedule: 'Scheduling', request: 'Requesting',
  reply: 'Replying to', attach: 'Attaching', send: 'Sending', upload: 'Uploading', mark: 'Marking', publish: 'Publishing', invite: 'Inviting',
  archive: 'Archiving', push: 'Pushing', deploy: 'Deploying', transcribe: 'Transcribing', query: 'Querying', manage: 'Updating',
  warn: 'Warning', end: 'Ending', generate: 'Generating', analyze: 'Analyzing', parse: 'Reading', stop: 'Stopping', start: 'Starting', check: 'Checking',
};

const APP: Record<string, string> = {
  google_workspace_connector: 'Google', microsoft_workspace_connector: 'Microsoft', github_workspace_connector: 'GitHub', slack_workspace_connector: 'Slack',
  notion_connector: 'Notion', zoom_connector: 'Zoom', vercel_connector: 'Vercel', supabase_connector: 'Supabase', sanity_connector: 'Sanity',
  youtube_connector: 'YouTube', facebook_connector: 'Facebook', instagram_connector: 'Instagram', whatsapp_business_connector: 'WhatsApp', aws_ses_connector: 'AWS SES',
};

const TITLE_KEYS = ['title', 'name', 'subject', 'summary', 'topic', 'question', 'full_name', 'displayName', 'institutionName', 'snippet.title', 'info.title', 'filename', 'path', 'message'];
const TARGET_ARGS = ['title', 'name', 'subject', 'query', 'q', 'search', 'topic', 'question', 'fileName', 'filename', 'path', 'sandboxFilePath', 'repo'];
const RECIPIENT_ARGS = ['to', 'phone_number', 'phoneNumber', 'recipient', 'email', 'channel', 'channel_name'];
const NICE: Array<[RegExp, string]> = [[/\bwhatsapp\b/g, 'WhatsApp'], [/\bgithub\b/g, 'GitHub'], [/\bcdn\b/g, 'CDN'], [/\bai\b/g, 'AI'], [/\burl\b/g, 'URL'], [/\bclassgrid\b/g, 'Classgrid'], [/\brag\b/g, 'RAG']];
const nice = (t: string) => NICE.reduce((acc, [re, v]) => acc.replace(re, v), t);

// Full first line, never cut with "…": long labels wrap onto the next line instead
const clip = (raw: string, _n?: number) => raw.split('\n')[0]!.trim();
const andMore = (shown: number, total: number) => (total > shown ? ` and ${total - shown} more` : '');
const str = (v: any) => (v === undefined || v === null || v === '' || typeof v === 'object' ? undefined : String(v));

/** "list_classroom_assignments" → { verb: "list", noun: "classroom assignments" } */
function splitAction(action: string) {
  const parts = action.replace(/_connector$|_workspace$/, '').split('_').filter(Boolean);
  const verb = parts[0] ?? '';
  const noun = parts.slice(1).join(' ').replace(/\bmy\b/, 'your').trim();
  return { verb, noun };
}

/** One item noun from a plural ("assignments" → "assignment") for "1 assignment" */
const singular = (noun: string) => noun.replace(/ies$/, 'y').replace(/(ss)es$/, '$1').replace(/([^s])s$/, '$1');

export function describeStep(tool: string, args: any, result: unknown, status: 'loading' | 'success' | 'error'): string | null {
  const op = APP[tool] && args?.operation ? String(args.operation) : tool;
  const { verb, noun } = splitAction(op);
  if (!verb || (!PAST[verb] && !ING[verb])) return null;
  const app = APP[tool];
  const nounText = nice(noun || (verb === 'search' ? 'results' : app ? `${app} items` : 'it'));
  const rawTarget = str(pick(args ?? {}, TARGET_ARGS));
  const target = rawTarget && !/^\d+$/.test(rawTarget) ? rawTarget : undefined;
  const recipient = str(pick(args ?? {}, RECIPIENT_ARGS));

  // Chat memory tools read better with their own words
  if (tool === 'recall_chat') return status === 'loading' ? 'Recalling earlier messages...' : `Recalled messages ${args?.from ?? ''}${args?.to ? `–${args.to}` : ''}`.trim();
  if (tool === 'search_recall_chat') return status === 'loading' ? `Searching earlier messages${target ? ` for "${clip(target, 30)}"` : ''}...` : `Searched earlier messages${target ? ` for "${clip(target, 30)}"` : ''}`;

  if (status === 'loading') {
    const t = (verb === 'send' || verb === 'reply' || verb === 'invite') && recipient ? ` to ${clip(recipient, 30)}`
      : target && verb !== 'list' ? ` ${verb === 'search' || verb === 'query' ? `for "${clip(target, 30)}"` : `"${clip(target, 30)}"`}` : '';
    // "Searching Notion for …" reads better than "Searching results for …"
    const what = !noun && app ? app : nounText;
    return `${ING[verb] ?? `${verb}ing`} ${what}${t}...`;
  }

  const parsed = parseResult(result);
  const text = parsed.text.trim();
  const failed = status === 'error' || /^(error|failed|failure|not done|refused|security error)\b|could not|unable to/i.test(text) || (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) && (parsed.data.error || parsed.data.success === false));
  if (failed) return `Could not ${verb} ${nounText}`;

  // Lists: how many, and the first names
  const { list } = unwrapList(parsed.data);
  const listVerb = verb === 'list' || verb === 'search' || verb === 'find' || verb === 'query';
  const items = Array.isArray(parsed.data) ? parsed.data : listVerb ? list : null;
  if (items && (listVerb || verb === 'get' || verb === 'read')) {
    if (items.length === 0) return `No ${nounText} found${target && verb !== 'list' ? ` for "${clip(target, 30)}"` : ''}`;
    const names = items.slice(0, 3).map((it) => (typeof it === 'object' ? str(pick(it, TITLE_KEYS)) : str(it))).filter(Boolean).map((n) => clip(n!));
    const count = items.length === 1 ? `1 ${singular(nounText)}` : `${items.length} ${nounText}`;
    return `${PAST[verb] === 'Read' || PAST[verb] === 'Searched' || PAST[verb] === 'Queried' || PAST[verb] === 'Recalled' ? 'Found' : PAST[verb]} ${count}${names.length ? `: ${names.join(', ')}${andMore(names.length, items.length)}` : ''}`;
  }
  // Text lists ("- ID: x, Name: y" lines)
  const bullets = parsed.data === undefined ? text.split('\n').filter((l) => /^\s*[-•*]\s+\S/.test(l)) : [];
  if (listVerb && bullets.length) {
    const names = bullets.slice(0, 3).map((l) => l.match(/Name:\s*([^,]+)/)?.[1] ?? l.replace(/^\s*[-•*]\s+/, '')).map((n) => clip(n.trim()));
    return `Found ${bullets.length === 1 ? `1 ${singular(nounText)}` : `${bullets.length} ${nounText}`}: ${names.join(', ')}${andMore(names.length, bullets.length)}`;
  }

  // "Total members: 38" / { count: 12 }
  const num = text.match(/^[^:\n]{2,60}:\s*(\d[\d,]*)\s*$/)?.[1] ?? (typeof parsed.data?.count === 'number' ? String(parsed.data.count) : undefined);
  if (verb === 'count' && num) return `Counted ${num} ${nounText.replace(/^organization |^group /, '')}`;

  if ((verb === 'send' || verb === 'reply' || verb === 'invite') && recipient) return `${PAST[verb]} ${nounText} to ${clip(recipient, 34)}`;

  // One record: name it
  const one = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? str(pick(parsed.data.user ?? parsed.data.profile ?? parsed.data.ticket ?? parsed.data, TITLE_KEYS)) : undefined;
  const label = clip(one ?? target ?? '', 44);
  return `${PAST[verb] ?? 'Used'} ${nounText}${label ? `: ${label}` : ''}`;
}
