// What a connected app's step says in the chat, the way the launch video shows it: "Checked your calendar" with the
// app's name in grey after it ("Google Calendar") and the app's icon, instead of "Successfully used Google Workspace
// to list events" (owner, 2026-11-12). One line per operation; an operation not listed here falls back to the
// described step ("Found 2 events: …") or the plain "Used …" line.

export type ConnectorWording = { text: string; app: string; icon?: string };

const CDN = "https://cdn.classgrid.in/classgrid_intgration/";
export const APP_ICONS: Record<string, string> = {
  "Gmail": `${CDN}Gmail_icon_(2026).svg`,
  "Google Calendar": `${CDN}Google_Calendar_icon_(2026).svg`,
  "Google Drive": `${CDN}Google_Drive_icon_(2026).svg`,
  "Google Classroom": `${CDN}Google_Classroom_Logo.svg`,
  "Google Meet": `${CDN}Google_Meet_icon_(2026).svg`,
  "Google Forms": `${CDN}Google_Forms_icon_(2026).svg`,
  "Notion": `${CDN}Notion-logo.svg`,
  "Microsoft Outlook": `${CDN}Microsoft_Outlook_Icon_(2025%C3%A2%C2%80%C2%93present).svg`,
  "Microsoft Teams": `${CDN}microsoft-teams-svgrepo-com.svg`,
  "Zoom": `${CDN}zoom-communications-icon_(1).svg`,
  "WhatsApp": `${CDN}whatsapp-svgrepo-com_(1).svg`,
  "Vercel": `${CDN}vercel-icon-svgrepo-com.svg`,
  "Slack": `${CDN}slack-new-logo-logo-svgrepo-com.svg`,
  "GitHub": `${CDN}github-icon.svg`,
  "Canva": `${CDN}canva.svg`,
  "Spotify": `${CDN}spotify.svg`,
  "YouTube": "https://cdn.classgrid.in/youtube-icon.svg",
  "Supabase": `${CDN}supabase-icon.svg`,
  "Sanity": `${CDN}sanity-icon-logo-png_seeklogo-653456.png`,
  "Facebook": `${CDN}2023_Facebook_icon.svg`,
  "Instagram": `${CDN}Instagram_logo_2016.svg`,
};
/** Icons drawn in one colour that need inverting on a dark background */
export const INVERT_IN_DARK = new Set(["Vercel", "GitHub", "Sanity"]);

type Line = [done: string, loading: string, app: string];
// Google Workspace: one connector, many apps; the operation says which app
const GOOGLE: Record<string, Line> = {
  list_events: ["Checked your calendar", "Checking your calendar", "Google Calendar"],
  create_event: ["Added a calendar event", "Adding a calendar event", "Google Calendar"],
  list_emails: ["Read your inbox", "Reading your inbox", "Gmail"],
  list_sent_emails: ["Looked at your sent emails", "Looking at your sent emails", "Gmail"],
  read_email: ["Read an email", "Reading an email", "Gmail"],
  read_email_attachment: ["Opened an email attachment", "Opening an email attachment", "Gmail"],
  mark_email_read: ["Marked an email as read", "Marking an email as read", "Gmail"],
  send_email: ["Sent an email", "Sending an email", "Gmail"],
  list_drive_files: ["Looked through your Drive", "Looking through your Drive", "Google Drive"],
  read_drive_file: ["Read a file from Drive", "Reading a file from Drive", "Google Drive"],
  create_folder: ["Made a folder in Drive", "Making a folder in Drive", "Google Drive"],
  upload_drive_file: ["Saved a file to Drive", "Saving a file to Drive", "Google Drive"],
  get_form: ["Opened a form", "Opening a form", "Google Forms"],
  list_form_responses: ["Read the form's responses", "Reading the form's responses", "Google Forms"],
  create_form: ["Created a form", "Creating a form", "Google Forms"],
  list_classroom_courses: ["Looked at your courses", "Looking at your courses", "Google Classroom"],
  list_classroom_assignments: ["Checked the assignments", "Checking the assignments", "Google Classroom"],
  get_classroom_coursework: ["Opened an assignment", "Opening an assignment", "Google Classroom"],
  create_classroom_assignment: ["Created an assignment", "Creating an assignment", "Google Classroom"],
  create_classroom_announcement: ["Posted an announcement", "Posting an announcement", "Google Classroom"],
  list_classroom_submissions: ["Checked the submissions", "Checking the submissions", "Google Classroom"],
  list_classroom_teachers: ["Looked at the teachers", "Looking at the teachers", "Google Classroom"],
  list_classroom_announcements: ["Read the announcements", "Reading the announcements", "Google Classroom"],
  get_classroom_announcement: ["Opened an announcement", "Opening an announcement", "Google Classroom"],
  list_classroom_topics: ["Looked at the topics", "Looking at the topics", "Google Classroom"],
  list_classroom_materials: ["Looked at the materials", "Looking at the materials", "Google Classroom"],
  read_classroom_file: ["Read a Classroom file", "Reading a Classroom file", "Google Classroom"],
};
const NOTION: Record<string, Line> = {
  search: ["Searched Notion", "Searching Notion", "Notion"],
  read_page: ["Read a Notion page", "Reading a Notion page", "Notion"],
  get_page: ["Read a Notion page", "Reading a Notion page", "Notion"],
  create_page: ["Created a Notion page", "Creating a Notion page", "Notion"],
  update_page: ["Updated a Notion page", "Updating a Notion page", "Notion"],
  add_comment: ["Commented in Notion", "Commenting in Notion", "Notion"],
  list_comments: ["Read the Notion comments", "Reading the Notion comments", "Notion"],
  query_database: ["Looked through a Notion database", "Looking through a Notion database", "Notion"],
};
const ZOOM: Record<string, Line> = {
  create_meeting: ["Scheduled a Zoom meeting", "Scheduling a Zoom meeting", "Zoom"],
  list_meetings: ["Checked your Zoom meetings", "Checking your Zoom meetings", "Zoom"],
  get_meeting: ["Opened a Zoom meeting", "Opening a Zoom meeting", "Zoom"],
  delete_meeting: ["Cancelled a Zoom meeting", "Cancelling a Zoom meeting", "Zoom"],
};
const MICROSOFT: Record<string, Line> = {
  list_emails: ["Read your inbox", "Reading your inbox", "Microsoft Outlook"],
  read_email: ["Read an email", "Reading an email", "Microsoft Outlook"],
  send_email: ["Sent an email", "Sending an email", "Microsoft Outlook"],
  list_meetings: ["Checked your calendar", "Checking your calendar", "Microsoft Outlook"],
  create_meeting: ["Scheduled a meeting", "Scheduling a meeting", "Microsoft Outlook"],
  list_teams: ["Looked at your teams", "Looking at your teams", "Microsoft Teams"],
  list_channels: ["Looked at the channels", "Looking at the channels", "Microsoft Teams"],
  list_channel_messages: ["Read the channel", "Reading the channel", "Microsoft Teams"],
  send_channel_message: ["Posted in Teams", "Posting in Teams", "Microsoft Teams"],
  list_chats: ["Looked at your chats", "Looking at your chats", "Microsoft Teams"],
  send_chat_message: ["Sent a Teams message", "Sending a Teams message", "Microsoft Teams"],
  get_meeting_transcript: ["Read the meeting transcript", "Reading the meeting transcript", "Microsoft Teams"],
};
const SLACK: Record<string, Line> = {
  list_channels: ["Looked at the channels", "Looking at the channels", "Slack"],
  search_channels: ["Searched the channels", "Searching the channels", "Slack"],
  list_messages: ["Read the channel", "Reading the channel", "Slack"],
  read_thread: ["Read a thread", "Reading a thread", "Slack"],
  search_messages: ["Searched Slack", "Searching Slack", "Slack"],
  send_message: ["Sent a Slack message", "Sending a Slack message", "Slack"],
  list_users: ["Looked at the people", "Looking at the people", "Slack"],
  search_users: ["Searched the people", "Searching the people", "Slack"],
  get_user_profile: ["Looked at a profile", "Looking at a profile", "Slack"],
  create_channel: ["Created a channel", "Creating a channel", "Slack"],
  invite_users: ["Invited people to a channel", "Inviting people to a channel", "Slack"],
  archive_channel: ["Archived a channel", "Archiving a channel", "Slack"],
  create_canvas: ["Created a canvas", "Creating a canvas", "Slack"],
  read_canvas: ["Read a canvas", "Reading a canvas", "Slack"],
  update_canvas: ["Updated a canvas", "Updating a canvas", "Slack"],
};
const GITHUB: Record<string, Line> = {
  list_repositories: ["Looked at your repositories", "Looking at your repositories", "GitHub"],
  list_repos: ["Looked at your repositories", "Looking at your repositories", "GitHub"],
  read_file: ["Read a file on GitHub", "Reading a file on GitHub", "GitHub"],
  get_file: ["Read a file on GitHub", "Reading a file on GitHub", "GitHub"],
  search_code: ["Searched the code", "Searching the code", "GitHub"],
  list_branches: ["Looked at the branches", "Looking at the branches", "GitHub"],
  list_commits: ["Read the commit history", "Reading the commit history", "GitHub"],
  get_commit: ["Opened a commit", "Opening a commit", "GitHub"],
  list_issues: ["Looked at the issues", "Looking at the issues", "GitHub"],
  create_issue: ["Opened an issue", "Opening an issue", "GitHub"],
  comment_on_issue: ["Commented on an issue", "Commenting on an issue", "GitHub"],
  create_or_update_file: ["Changed a file on GitHub", "Changing a file on GitHub", "GitHub"],
  create_repository: ["Created a repository", "Creating a repository", "GitHub"],
  list_pull_requests: ["Looked at the pull requests", "Looking at the pull requests", "GitHub"],
  create_pull_request: ["Opened a pull request", "Opening a pull request", "GitHub"],
};
const VERCEL: Record<string, Line> = {
  list_projects: ["Looked at your Vercel projects", "Looking at your Vercel projects", "Vercel"],
  list_deployments: ["Checked the deployments", "Checking the deployments", "Vercel"],
  get_deployment: ["Opened a deployment", "Opening a deployment", "Vercel"],
  create_deployment: ["Deployed to Vercel", "Deploying to Vercel", "Vercel"],
  list_env: ["Looked at the env variables", "Looking at the env variables", "Vercel"],
  set_env: ["Set an env variable", "Setting an env variable", "Vercel"],
};
const YOUTUBE: Record<string, Line> = {
  search_videos: ["Searched YouTube", "Searching YouTube", "YouTube"],
  get_channel_stats: ["Checked the channel stats", "Checking the channel stats", "YouTube"],
  read_comments: ["Read the comments", "Reading the comments", "YouTube"],
};
const SUPABASE: Record<string, Line> = {
  list_projects: ["Looked at your Supabase projects", "Looking at your Supabase projects", "Supabase"],
  query_database: ["Queried the database", "Querying the database", "Supabase"],
  list_storage_buckets: ["Looked at the storage buckets", "Looking at the storage buckets", "Supabase"],
};
const SANITY: Record<string, Line> = {
  query_documents: ["Looked through Sanity", "Looking through Sanity", "Sanity"],
  create_document: ["Created a Sanity document", "Creating a Sanity document", "Sanity"],
  update_document: ["Updated a Sanity document", "Updating a Sanity document", "Sanity"],
};

const BY_TOOL: Record<string, { ops: Record<string, Line>; app: string }> = {
  google_workspace_connector: { ops: GOOGLE, app: "Google Workspace" },
  notion_connector: { ops: NOTION, app: "Notion" },
  zoom_connector: { ops: ZOOM, app: "Zoom" },
  microsoft_workspace_connector: { ops: MICROSOFT, app: "Microsoft" },
  slack_workspace_connector: { ops: SLACK, app: "Slack" },
  github_workspace_connector: { ops: GITHUB, app: "GitHub" },
  vercel_connector: { ops: VERCEL, app: "Vercel" },
  youtube_connector: { ops: YOUTUBE, app: "YouTube" },
  supabase_connector: { ops: SUPABASE, app: "Supabase" },
  sanity_connector: { ops: SANITY, app: "Sanity" },
};

const humanize = (s: string) => String(s || "").replace(/[_-]+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());

/** The line for a connected app's step, or null when this step is not one of them */
export function connectorWording(tool: string, args: any, status: "loading" | "success" | "error"): ConnectorWording | null {
  const op = String(args?.operation || "");
  const loading = status === "loading";
  // Custom connectors (any MCP server the user added): "Created an issue" with the server's name
  if (tool === "custom_mcp_connector") {
    const app = String(args?.server || args?.app || args?.name || "Custom connector");
    const action = humanize(String(args?.tool || args?.operation || ""));
    return { text: action ? (loading ? `${action}…` : action) : (loading ? `Using ${app}…` : `Used ${app}`), app };
  }
  const entry = BY_TOOL[tool];
  if (!entry) return null;
  const line = entry.ops[op];
  if (line) return { text: loading ? `${line[1]}…` : line[0], app: line[2], icon: APP_ICONS[line[2]] };
  // An operation without its own line: still the app's name and icon
  const action = humanize(op);
  return { text: action ? (loading ? `${action}…` : action) : (loading ? `Using ${entry.app}…` : `Used ${entry.app}`), app: entry.app, icon: APP_ICONS[entry.app] };
}
