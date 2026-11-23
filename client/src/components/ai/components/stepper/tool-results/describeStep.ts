// The step line says what the tool actually did and found ("Found 5 classroom assignments: BST Lab, Graphs"),
// from the step's own request and answer. No step ever shows one fixed line for every tool ("… used <tool>")
// (owner, 2026-11-23: "show what it is really doing, natural, like Claude Code").
// Order: a tool with words of its own (describeNamed), then a tool whose name starts with an action word
// (describeStep's general part), then the tool's own name said plainly (plainStep).
import { parseResult, pick, unwrapList } from './primitives';

const PAST: Record<string, string> = {
  list: 'Found', search: 'Searched', find: 'Found', get: 'Read', read: 'Read', view: 'Viewed', count: 'Counted', recall: 'Recalled',
  create: 'Created', add: 'Added', update: 'Updated', edit: 'Updated', delete: 'Deleted', remove: 'Removed', close: 'Closed',
  reopen: 'Reopened', assign: 'Assigned', approve: 'Approved', save: 'Saved', schedule: 'Scheduled', request: 'Requested',
  reply: 'Replied to', attach: 'Attached', send: 'Sent', upload: 'Uploaded', mark: 'Marked', publish: 'Published', invite: 'Invited',
  archive: 'Archived', push: 'Pushed', deploy: 'Deployed', transcribe: 'Transcribed', query: 'Queried', manage: 'Updated',
  warn: 'Warned', end: 'Ended', generate: 'Generated', analyze: 'Analyzed', parse: 'Read', stop: 'Stopped', start: 'Started', check: 'Checked',
  import: 'Imported', export: 'Exported', move: 'Moved', rename: 'Renamed', resize: 'Resized', autofill: 'Made', play: 'Started playing',
  pause: 'Paused', next: 'Skipped to', previous: 'Went back to', transfer: 'Moved', set: 'Set',
};
const ING: Record<string, string> = {
  list: 'Finding', search: 'Searching', find: 'Finding', get: 'Reading', read: 'Reading', view: 'Viewing', count: 'Counting', recall: 'Recalling',
  create: 'Creating', add: 'Adding', update: 'Updating', edit: 'Updating', delete: 'Deleting', remove: 'Removing', close: 'Closing',
  reopen: 'Reopening', assign: 'Assigning', approve: 'Approving', save: 'Saving', schedule: 'Scheduling', request: 'Requesting',
  reply: 'Replying to', attach: 'Attaching', send: 'Sending', upload: 'Uploading', mark: 'Marking', publish: 'Publishing', invite: 'Inviting',
  archive: 'Archiving', push: 'Pushing', deploy: 'Deploying', transcribe: 'Transcribing', query: 'Querying', manage: 'Updating',
  warn: 'Warning', end: 'Ending', generate: 'Generating', analyze: 'Analyzing', parse: 'Reading', stop: 'Stopping', start: 'Starting', check: 'Checking',
  import: 'Importing', export: 'Exporting', move: 'Moving', rename: 'Renaming', resize: 'Resizing', autofill: 'Making', play: 'Playing',
  pause: 'Pausing', next: 'Skipping to', previous: 'Going back to', transfer: 'Moving', set: 'Setting',
};

const APP: Record<string, string> = {
  google_workspace_connector: 'Google', microsoft_workspace_connector: 'Microsoft', github_workspace_connector: 'GitHub', slack_workspace_connector: 'Slack',
  notion_connector: 'Notion', zoom_connector: 'Zoom', vercel_connector: 'Vercel', supabase_connector: 'Supabase', sanity_connector: 'Sanity',
  youtube_connector: 'YouTube', facebook_connector: 'Facebook', instagram_connector: 'Instagram', whatsapp_business_connector: 'WhatsApp', aws_ses_connector: 'AWS SES',
  canva_connector: 'Canva', spotify_connector: 'Spotify',
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

/** Custom connectors (custom_mcp_connector): say which app and what it's doing ("Creating issue in Linear: Fix login") */
function describeCustomMcp(args: any, result: unknown, status: 'loading' | 'success' | 'error'): string {
  const parsed = parseResult(result);
  const data = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? parsed.data : {};
  const raw = String(data.card?.name || args?.server || args?.app || args?.name || 'the app');
  const app = raw; // as the user named it ("n8n" stays n8n)
  const err = status === 'error' || data.error ? String(data.error || parsed.text || '').split('\n')[0]!.replace(new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`, 'i'), '') : '';
  const loading = status === 'loading';
  switch (args?.operation) {
    case 'list_apps':
      return loading ? 'Looking at apps you can connect...' : `Found ${Array.isArray(data.apps) ? data.apps.length : ''} apps you can connect`.replace('  ', ' ');
    case 'list_servers': {
      if (loading) return 'Checking your connected apps...';
      const names = Array.isArray(data.servers) ? data.servers.map((s: any) => s.name) : [];
      return names.length ? `Checked your connected apps: ${names.slice(0, 3).join(', ')}${andMore(Math.min(3, names.length), names.length)}` : 'You have no connected apps yet';
    }
    case 'add_server':
      if (loading) return `Connecting ${app}...`;
      if (err) return `Couldn't connect ${app}: ${err}`;
      return data.card?.status === 'connected' ? `Connected ${app}${data.card.toolCount ? ` (${data.card.toolCount} tools)` : ''}` : `Added ${app}, waiting for you to log in`;
    case 'login':
      return loading ? `Opening the ${app} login...` : err ? `Couldn't open the ${app} login: ${err}` : `Showed the ${app} log in card`;
    case 'get_tools':
      return loading ? `Reading what ${app} can do...` : err ? `Couldn't read ${app}'s tools: ${err}` : `Read ${app}'s tools${Array.isArray(data.tools) ? ` (${data.tools.length})` : ''}`;
    case 'remove_server':
      return loading ? `Removing ${app}...` : err ? `Couldn't remove ${app}: ${err}` : `Removed ${app}`;
    case 'call_tool': {
      const { verb, noun } = splitAction(String(args?.tool || ''));
      const what = nice(noun || 'item');
      const a = args?.arguments && typeof args.arguments === 'object' ? args.arguments : {};
      const target = str(pick(a, TARGET_ARGS)) ?? str(pick(a, ['description', 'text', 'body', 'id', 'issueId', 'issue_id']));
      const t = target ? `: ${clip(target)}` : '';
      if (loading) return `${ING[verb] ? `${ING[verb]} ${what}` : `Running ${humanTool(args?.tool)}`} in ${app}${t}...`;
      if (err || /^error\b/i.test(parsed.text.trim())) return `Couldn't ${PAST[verb] ? `${verb} ${what}` : `run ${humanTool(args?.tool)}`} in ${app}: ${(err || parsed.text).replace(/^error[^:]*:\s*/i, '').split('\n')[0]}`;
      return `${PAST[verb] ? `${PAST[verb]} ${what}` : `Ran ${humanTool(args?.tool)}`} in ${app}${t}`;
    }
    default:
      return loading ? `Using ${app}...` : `Used ${app}`;
  }
}
const humanTool = (t: any) => String(t || 'a tool').replace(/[_-]+/g, ' ');

/** Studio browser steps say what they did, like a command: "Opened jeevanpatra.com", "Clicked at x: 512, y: 300" */
function describeBrowser(tool: string, args: any, status: 'loading' | 'success' | 'error'): string | null {
  const a = args ?? {};
  const short = (t: unknown, n = 80) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
  const site = String(a.url ?? '').trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  const at = `x: ${Math.round(Number(a.x) || 0)}, y: ${Math.round(Number(a.y) || 0)}`;
  const dy = Number(a.dy ?? 600) || 0;
  // [while running, when done, when it failed]
  const words: Record<string, [string, string, string]> = {
    browser_open: [`Opening ${site}`, `Opened ${site}`, `Couldn't open ${site}`],
    browser_click: [`${a.double ? 'Double-clicking' : 'Clicking'} at ${at}`, `${a.double ? 'Double-clicked' : 'Clicked'} at ${at}`, `Couldn't click at ${at}`],
    browser_type: [`Typing "${short(a.text)}"`, `Typed "${short(a.text)}"${a.submit ? ' and pressed Enter' : ''}`, `Couldn't type "${short(a.text)}"`],
    browser_select: a.option
      ? [`Choosing "${short(a.option)}"${a.field ? ` in ${short(a.field, 40)}` : ''}`, `Chose "${short(a.option)}"${a.field ? ` in ${short(a.field, 40)}` : ''}`, `Couldn't choose "${short(a.option)}"`]
      : [`Reading the dropdown's choices`, `Read the dropdown's choices${a.field ? ` in ${short(a.field, 40)}` : ''}`, `Couldn't read the dropdown`],
    browser_press: [`Pressing ${short(a.key || 'Enter', 30)}`, `Pressed ${short(a.key || 'Enter', 30)}`, `Couldn't press ${short(a.key || 'Enter', 30)}`],
    browser_scroll: [`Scrolling ${dy < 0 ? 'up' : 'down'}`, `Scrolled ${dy < 0 ? 'up' : 'down'} ${Math.abs(dy)} px`, `Couldn't scroll`],
    browser_back: ['Going back', 'Went back a page', "Couldn't go back"],
    browser_wait: ['Waiting for the page', `Waited ${Math.min(10, Math.max(1, Number(a.seconds) || 2))} sec`, "Couldn't wait for the page"],
    browser_screenshot: ['Taking a screenshot', 'Took a screenshot', "Couldn't take a screenshot"],
    browser_read: ['Reading the page text', 'Read the page text', "Couldn't read the page"],
    browser_logs: ["Reading the page's errors", "Read the page's errors", "Couldn't read the page's errors"],
    browser_run_js: ['Running JavaScript in the page', 'Ran JavaScript in the page', 'The JavaScript failed'],
  };
  const w = words[tool];
  return w ? (status === 'loading' ? `${w[0]}...` : w[status === 'error' ? 2 : 1]) : null;
}

/** A time the way a person says it: "6:29 pm", with the day when it is not today */
function clock(iso: unknown): string {
  const d = new Date(String(iso ?? ''));
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}
const baseName = (p: unknown) => String(p ?? '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p ?? '');

/** Tools whose names don't start with an action word: each said from its own request and answer */
function describeNamed(tool: string, args: any, result: unknown, status: 'loading' | 'success' | 'error'): string | null {
  const a = args ?? {};
  const loading = status === 'loading';
  const text = typeof result === 'string' ? result.trim() : parseResult(result).text.trim();
  const failed = status === 'error' || /^(error|failed)\b/i.test(text);
  switch (tool) {
    // Another Classgrid session on this computer (desktop/sessions.js)
    case 'message_classgrid_session': {
      const target = String(a.target ?? '').trim().replace(/^@/, '');
      // (a name is shown with @; a session id or a pid is not a name)
      const asked = target && !/^[0-9a-f-]{8,}$/i.test(target) ? `@${target}` : 'the other session';
      if (loading) return `Sending a message to ${asked}...`;
      const who = text.match(/^(?:Delivered to (@.+?)'s inbox|(@.+?) is holding the message|(@.+?) refused the message)/);
      const name = who?.[1] ?? who?.[2] ?? who?.[3] ?? asked;
      if (failed) return `Couldn't send the message to ${asked}`;
      if (who?.[2]) return `${name} is holding the message`;
      if (who?.[3]) return `${name} refused the message`;
      return `Sent a message to ${name}`;
    }
    case 'list_classgrid_sessions': {
      if (loading) return 'Looking for other Classgrid sessions...';
      if (failed) return "Couldn't look for other Classgrid sessions";
      const rows = text.split('\n').map((l) => l.match(/^- (@.+?) \([^()]*\bpid \d+[^()]*\) is (busy|idle)\b/)).filter(Boolean) as RegExpMatchArray[];
      if (!rows.length) return 'No other Classgrid session is running';
      return `Found ${rows.length === 1 ? '1 Classgrid session' : `${rows.length} Classgrid sessions`}: ${rows.slice(0, 3).map((r) => `${r[1]} (${r[2]})`).join(', ')}${andMore(Math.min(3, rows.length), rows.length)}`;
    }
    // The chat goes to sleep until a time or a WhatsApp reply (agent-task.service.js sleepFromTool)
    case 'sleep_until': {
      const at = clock(a.wake_at);
      const until = [at, a.wake_on_whatsapp_reply === true ? 'your WhatsApp reply' : ''].filter(Boolean).join(' or ');
      if (loading) return until ? `Going to sleep until ${until}...` : 'Going to sleep...';
      // (not set yet: the AI is asked to say in its own words what it is waiting for, then it calls again)
      if (/^error: not sleeping yet/i.test(text)) return 'Not asleep yet';
      if (failed) return "Couldn't go to sleep";
      return until ? `Sleeping until ${until}` : 'Sleeping';
    }
    // Waits on this computer until a port answers, a page answers or a file is there (desktop/runner.js wait_until)
    case 'wait_until': {
      const what = a.port ? `port ${a.port}` : a.url ? String(a.url).replace(/^https?:\/\//i, '').replace(/\/$/, '') : a.file ? `${baseName(a.file)}${a.contains ? ` to contain "${clip(String(a.contains))}"` : ''}` : '';
      if (loading) return what ? `Waiting for ${what}...` : 'Waiting...';
      const secs = text.match(/after (\d+) seconds/)?.[1];
      if (/^Ready after/i.test(text)) return `${what ? `${what[0]!.toUpperCase()}${what.slice(1)}` : 'It'} was ready${secs ? ` after ${secs} sec` : ''}`;
      if (/^Still not ready/i.test(text)) return `${what ? `${what[0]!.toUpperCase()}${what.slice(1)}` : 'It'} was still not ready${secs ? ` after ${secs} sec` : ''}`;
      return what ? `Couldn't wait for ${what}` : "Couldn't wait";
    }
    case 'wait_for_whatsapp_reply':
      if (loading) return 'Waiting for your WhatsApp reply...';
      if (failed) return "Couldn't wait for a WhatsApp reply";
      return /did not reply/i.test(text) ? 'No WhatsApp reply came' : 'Got your WhatsApp reply';
    case 'message_helper': {
      const helper = a.helper !== undefined && a.helper !== null && a.helper !== '' ? `Helper ${a.helper}` : 'the helper';
      return loading ? `Sending a message to ${helper}...` : failed ? `Couldn't send the message to ${helper}` : `Sent a message to ${helper}`;
    }
    case 'make_office_file': {
      const kind = ({ word: 'Word file', excel: 'Excel file', powerpoint: 'PowerPoint file' } as Record<string, string>)[String(a.type ?? '')] ?? 'file';
      const named = a.file_name ? `: ${clip(String(a.file_name))}` : '';
      return loading ? `Making a ${kind}${named}...` : failed ? `Couldn't make the ${kind}` : `Made a ${kind}${named}`;
    }
    case 'make_video':
      return loading ? 'Making a video...' : failed ? "Couldn't make the video" : 'Made a video';
    case 'notebook_edit': {
      const file = a.path ? baseName(a.path) : 'the notebook';
      return loading ? `Editing ${file}...` : failed ? `Couldn't edit ${file}` : `Edited ${file}`;
    }
    case 'use_worktree': {
      const back = String(a.action ?? '') === 'finish';
      if (loading) return back ? 'Going back to the main folder...' : 'Making a copy of the project to work in...';
      if (failed) return back ? "Couldn't go back to the main folder" : "Couldn't make a copy of the project";
      return back ? 'Went back to the main folder' : 'Working in a copy of the project';
    }
    case 'page_comments': {
      const act = String(a.action ?? 'list');
      if (loading) return act === 'reply' ? 'Replying to a comment on the page...' : act === 'resolve' ? 'Marking a comment done...' : "Reading the page's comments...";
      if (failed) return act === 'reply' ? "Couldn't reply to the comment" : act === 'resolve' ? "Couldn't mark the comment done" : "Couldn't read the page's comments";
      return act === 'reply' ? 'Replied to a comment on the page' : act === 'resolve' ? 'Marked a comment done' : "Read the page's comments";
    }
    default:
      return null;
  }
}

// ── A tool with no words of its own: its own name, said plainly ──────────────────────────────────────────────
const IRREGULAR: Record<string, [string, string]> = {
  run: ['Ran', 'Running'], make: ['Made', 'Making'], write: ['Wrote', 'Writing'], sleep: ['Slept', 'Sleeping'], tell: ['Told', 'Telling'],
  get: ['Got', 'Getting'], set: ['Set', 'Setting'], read: ['Read', 'Reading'], send: ['Sent', 'Sending'], find: ['Found', 'Finding'],
  take: ['Took', 'Taking'], give: ['Gave', 'Giving'], go: ['Went', 'Going'], do: ['Did', 'Doing'], put: ['Put', 'Putting'],
  build: ['Built', 'Building'], hold: ['Held', 'Holding'], keep: ['Kept', 'Keeping'], draw: ['Drew', 'Drawing'], choose: ['Chose', 'Choosing'],
  cut: ['Cut', 'Cutting'], bring: ['Brought', 'Bringing'], begin: ['Began', 'Beginning'], stop: ['Stopped', 'Stopping'], plan: ['Planned', 'Planning'],
  log: ['Logged', 'Logging'], zip: ['Zipped', 'Zipping'], scan: ['Scanned', 'Scanning'], sync: ['Synced', 'Syncing'], submit: ['Submitted', 'Submitting'],
  pay: ['Paid', 'Paying'], show: ['Showed', 'Showing'], hide: ['Hid', 'Hiding'], leave: ['Left', 'Leaving'],
};
// Action words a tool's name may start with besides the ones above and in PAST (a name that starts with anything
// else, "page_comments", "bulk_read_project", is a thing, not an action: it is shown as it is)
const REGULAR = new Set(['ask', 'define', 'open', 'download', 'message', 'wait', 'use', 'load', 'call', 'fetch', 'click', 'type', 'press', 'scroll', 'navigate',
  'fill', 'select', 'copy', 'paste', 'install', 'test', 'debug', 'compile', 'execute', 'launch', 'connect', 'disconnect', 'clone', 'commit', 'merge', 'pull',
  'restart', 'reset', 'verify', 'validate', 'convert', 'translate', 'summarize', 'extract', 'compare', 'calculate', 'record', 'capture', 'share', 'notify',
  'remind', 'cancel', 'confirm', 'book', 'order', 'sign', 'track', 'watch', 'follow', 'join', 'mute', 'block', 'report', 'enable', 'disable', 'apply',
  'print', 'render', 'preview', 'switch', 'append', 'insert', 'duplicate', 'restore', 'revoke', 'grant', 'link', 'unlink', 'pin', 'unpin', 'rate', 'like']);
function conjugate(verb: string): [string, string] | null {
  if (IRREGULAR[verb]) return IRREGULAR[verb]!;
  if (PAST[verb] && ING[verb]) return [PAST[verb]!, ING[verb]!];
  if (!REGULAR.has(verb)) return null;
  const cap = `${verb[0]!.toUpperCase()}${verb.slice(1)}`;
  if (verb.endsWith('e')) return [`${cap}d`, `${cap.slice(0, -1)}ing`];
  if (/[^aeiou]y$/.test(verb)) return [`${cap.slice(0, -1)}ied`, `${cap}ing`];
  return [`${cap}ed`, `${cap}ing`];
}
/** The step line for a tool that has no words of its own, from its name: "ask_classgrid" → "Asking Classgrid..." /
 * "Asked Classgrid" / "Couldn't ask Classgrid"; a name that is a thing → "Page comments". `where`: " in Notion". */
export function plainStep(name: string, status: 'loading' | 'success' | 'error', where = ''): string {
  const words = nice(String(name || 'step').replace(/_workspace_connector$|_connector$/, '').replace(/[_-]+/g, ' ').trim()) || 'step';
  const [first = '', ...rest] = words.split(' ');
  const tail = rest.length ? ` ${rest.join(' ')}` : '';
  const forms = conjugate(first.toLowerCase());
  if (!forms) {
    const thing = `${words[0]!.toUpperCase()}${words.slice(1)}${where}`;
    return status === 'loading' ? `${thing}...` : status === 'error' ? `${thing} failed` : thing;
  }
  return status === 'loading' ? `${forms[1]}${tail}${where}...` : status === 'error' ? `Couldn't ${first.toLowerCase()}${tail}${where}` : `${forms[0]}${tail}${where}`;
}

export function describeStep(tool: string, args: any, result: unknown, status: 'loading' | 'success' | 'error'): string | null {
  if (tool === 'custom_mcp_connector') return describeCustomMcp(args, result, status);
  if (tool.startsWith('browser_')) return describeBrowser(tool, args, status);
  const named = describeNamed(tool, args, result, status);
  if (named) return named;
  // A helper's note to the main agent (the Agent map shows a helper's steps like the main agent's)
  if (tool === 'tell_main') return status === 'loading' ? 'Sending a note to the main agent...' : 'Sent a note to the main agent';
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
