// The main AI's tools a helper gets too (owner, 2026-11-23: "that much tools my main agent has, that much my subagent
// will have: web search, open url, connected apps, plugins... a subagent can't message and can't add more subagents,
// that stays, but all the remaining tools I want it to have").
// Until that day a helper had the project's file tools, the terminal, the browser in Studio and tell_main, and
// nothing else: it could not search the web, open a page, use a connected app or make a picture, while the
// /research command told the main AI to send helpers to research on the web.
// Now a helper's list is its own tools plus every tool the main AI may use in the same answer, loaded the way the
// main AI's are (services/ai-tool-groups.js): the always-loaded ones (the web, the time, the knowledge base...) and
// the groups its task names from the start, the rest with its own load_tools.
// What a helper never has is listed here; nothing else is held back.
import { LOAD_TOOLS_NAME, planToolsForMessage, buildLoadToolsTool, orderTools } from "./ai-tool-groups.js";

export const HELPER_NEVER_TOOLS = new Set([
    // more helpers, and talking to helpers
    "run_project_helpers", "check_helpers", "message_helper", "define_helper", "stop_helpers", "run_workflow",
    // messages to other sessions and other chats
    "list_classgrid_sessions", "message_classgrid_session", "send_to_chat",
    // the chat's own course: its tool loader (a helper has its own), its thinking and plan steps, sleeping and
    // ending, a warning to the user, a panel opened in the user's app, the chat's own copy of the project
    LOAD_TOOLS_NAME, "internal_thought_process", "update_plan_step", "sleep_until", "end_task", "end_conversation", "warn_user", "open_integration_panel", "use_worktree",
    // GitHub and the project's name (a helper never pushes)
    "push_project_to_github", "create_github_repo_for_project", "update_project_github_repo", "rename_project",
]);
// The main AI's tools that change the project's files: only for a helper that may edit
export const HELPER_EDIT_ONLY_TOOLS = new Set(["write_project_file", "edit_project_file", "write_project_file_from_spec", "notebook_edit"]);
// The main AI's project tools that work in the project's main folder: not for a helper working in its own copy
export const HELPER_OWN_COPY_SKIPS = new Set(["write_project_file_from_spec", "notebook_edit", "bulk_read_project", "search_project_by_meaning"]);
// Groups whose rules in the main AI's prompt are about the main AI's own project work (a helper has its own)
const NO_RULES_GROUPS = new Set(["code_project", "terminal"]);

const nameOf = (t) => t?.function?.name;

/**
 * The main AI's tools for one helper.
 * @param mainTools  every tool the main AI may use in this answer (its full list)
 * @param ownNames   the helper's own tools (they stay the helper's)
 * @param hasHandler (name) => the main AI has a handler for it
 * @param canEdit    the helper may change files
 * @param ownCopy    the helper works in its own copy of the project (git worktree)
 * @param task       the helper's task (the groups it names are loaded from the start)
 * @returns { shared, loaded, groups, loader, startGroups }: every shared tool, the ones loaded from the start (in the
 *          fixed order), the groups load_tools can load, the load_tools definition (null when nothing is left to
 *          load) and the ids of the groups loaded from the start
 */
export function sharedHelperTools({ mainTools = [], ownNames = [], hasHandler = () => true, canEdit = false, ownCopy = false, task = "", role, email, hasOrg = false }) {
    const own = new Set(ownNames);
    const seen = new Set();
    const shared = mainTools.filter((t) => {
        const n = nameOf(t);
        if (!n || seen.has(n) || own.has(n) || HELPER_NEVER_TOOLS.has(n) || !hasHandler(n)) return false;
        if (!canEdit && HELPER_EDIT_ONLY_TOOLS.has(n)) return false;
        if (ownCopy && HELPER_OWN_COPY_SKIPS.has(n)) return false;
        seen.add(n);
        return true;
    });
    const plan = planToolsForMessage({ allTools: shared, text: task, role, email, hasOrg });
    const loaded = orderTools(shared.filter((t) => plan.loadedNames.has(nameOf(t))));
    const loadedNames = new Set(loaded.map(nameOf));
    // (a group is offered while one of its tools is still to load)
    const groups = plan.allowedGroups
        .map((g) => ({ ...g, tools: g.tools.filter((n) => seen.has(n)) }))
        .filter((g) => g.tools.some((n) => !loadedNames.has(n)));
    return { shared, loaded, groups, loader: groups.length ? buildLoadToolsTool(groups) : null, startGroups: plan.activeGroupIds };
}

/**
 * A helper's load_tools: adds the asked groups' tools to its list (the same array the model loop reads again every
 * round). Returns { loaded, denied, toolNames }.
 */
export function loadHelperGroups({ shared = [], defs, groups = [], wanted }) {
    const asked = Array.isArray(wanted) ? wanted : [wanted].filter(Boolean);
    const loaded = [], denied = [], toolNames = [];
    for (const id of asked) {
        const group = groups.find((g) => g.id === id);
        if (!group) { denied.push(String(id)); continue; }
        loaded.push(group.id);
        for (const t of shared) {
            const n = nameOf(t);
            if (!group.tools.includes(n)) continue;
            toolNames.push(n);
            if (!defs.some((d) => nameOf(d) === n)) defs.push(t);
        }
    }
    return { loaded, denied, toolNames };
}

/** The groups whose rules a helper is given with their tools */
export const groupsWithRules = (ids = []) => ids.filter((id) => !NO_RULES_GROUPS.has(id));
