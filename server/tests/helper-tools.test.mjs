// A helper has the main AI's tools too (owner, 2026-11-23: "that much tools my main agent has, that much my subagent
// will have: web search, open url, plugins... it can't message and can't add more subagents, all the remaining tools
// I want it to have"). services/helper-tools.js picks them; the chat controller gives them the main AI's handlers.
// Checked here:
//   - the web, the time and the other always-loaded tools are a helper's from the start
//   - a connected app, pictures, documents: there with the helper's own load_tools, group by group
//   - never: more helpers, talking to helpers, messages to other sessions and chats, the chat's own course tools,
//     a GitHub push
//   - a helper's own tools stay its own (no second copy), a tool with no handler is left out
//   - a read-only helper gets no tool that changes files; one in its own copy of the project gets none that work in
//     the main folder
//   - staff tools stay with staff
// Run: node --test tests/helper-tools.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { sharedHelperTools, loadHelperGroups, groupsWithRules, HELPER_NEVER_TOOLS } = await import("../src/services/helper-tools.js");

const tool = (name) => ({ type: "function", function: { name, description: name, parameters: { type: "object", properties: {} } } });
// The main AI's list in a desktop project chat, as the controller builds it (a part of it)
const MAIN = [
    "get_my_profile", "search_web", "open_url", "get_timezone_time", "search_knowledge_base", "save_user_note", "recall_chat",
    "execute_terminal_command", "start_background_command", "list_project_files", "view_project_file", "search_project", "find_project_files",
    "write_project_file", "edit_project_file", "write_project_file_from_spec", "notebook_edit", "bulk_read_project", "search_project_by_meaning",
    "push_project_to_github", "create_github_repo_for_project", "update_project_github_repo", "rename_project", "use_worktree",
    "run_project_helpers", "check_helpers", "message_helper", "define_helper", "stop_helpers", "run_workflow",
    "list_classgrid_sessions", "message_classgrid_session", "send_to_chat",
    "load_tools", "internal_thought_process", "update_plan_step", "sleep_until", "end_task", "end_conversation", "warn_user", "open_integration_panel",
    "generate_image", "edit_image", "analyze_image", "parse_document", "generate_pdf", "make_office_file",
    "google_workspace_connector", "github_workspace_connector", "custom_mcp_connector", "run_code", "send_email", "send_whatsapp_message",
    "read_server_logs", "get_server_status", "computer",
].map(tool);
const OWN_READ_ONLY = ["list_project_files", "view_project_file", "search_project", "find_project_files", "execute_terminal_command", "start_background_command", "tell_main"];
const names = (list) => list.map((t) => t.function.name);
const pick = (over = {}) => sharedHelperTools({ mainTools: MAIN, ownNames: OWN_READ_ONLY, role: "user", email: "someone@example.com", ...over });

test("the web and the other always-loaded tools are a helper's from the start", () => {
    const { loaded } = pick();
    for (const n of ["search_web", "open_url", "get_timezone_time", "search_knowledge_base", "get_my_profile"]) assert.ok(names(loaded).includes(n), n);
    // (tools of no group are always loaded, like the main AI's: a custom connector, the computer)
    assert.ok(names(loaded).includes("custom_mcp_connector"));
    assert.ok(names(loaded).includes("computer"));
    // (a group's tools wait for load_tools)
    for (const n of ["generate_image", "google_workspace_connector", "parse_document", "send_email"]) assert.equal(names(loaded).includes(n), false, n);
});

test("connected apps, pictures and documents come with the helper's own load_tools", () => {
    const set = pick();
    assert.ok(set.loader, "there is a load_tools");
    assert.equal(set.loader.function.name, "load_tools");
    const ids = set.groups.map((g) => g.id);
    for (const id of ["image_media", "files_docs", "connector:google", "connector:github", "email_messaging", "code_sandbox"]) assert.ok(ids.includes(id), id);
    assert.deepEqual(set.loader.function.parameters.properties.groups.items.enum, ids);

    const defs = [...OWN_READ_ONLY.map(tool), ...set.loaded];
    const before = defs.length;
    const got = loadHelperGroups({ shared: set.shared, defs, groups: set.groups, wanted: ["image_media", "connector:google", "no_such_group"] });
    assert.deepEqual(got.loaded, ["image_media", "connector:google"]);
    assert.deepEqual(got.denied, ["no_such_group"]);
    assert.deepEqual(got.toolNames.sort(), ["analyze_image", "edit_image", "generate_image", "google_workspace_connector"]);
    assert.equal(defs.length, before + 4);
    // (loading the same group again adds nothing a second time)
    loadHelperGroups({ shared: set.shared, defs, groups: set.groups, wanted: "image_media" });
    assert.equal(defs.length, before + 4);
    assert.equal(new Set(names(defs)).size, defs.length, "no tool twice");
});

test("never: more helpers, messages to sessions and chats, the chat's own course, a GitHub push", () => {
    const { shared, groups } = pick({ canEdit: true });
    const all = new Set(names(shared));
    for (const n of HELPER_NEVER_TOOLS) assert.equal(all.has(n), false, n);
    for (const n of ["run_project_helpers", "check_helpers", "message_helper", "define_helper", "stop_helpers", "run_workflow", "list_classgrid_sessions", "message_classgrid_session", "send_to_chat", "sleep_until", "end_conversation", "push_project_to_github"]) {
        assert.equal(all.has(n), false, n);
        assert.equal(groups.some((g) => g.tools.includes(n)), false, `${n} in no group it can load`);
    }
});

test("a helper's own tools stay its own, and a tool with no handler is left out", () => {
    const { shared } = pick({ hasHandler: (n) => n !== "make_office_file" });
    const all = names(shared);
    for (const n of OWN_READ_ONLY) assert.equal(all.includes(n), false, n);
    assert.equal(all.includes("make_office_file"), false);
    assert.ok(all.includes("generate_pdf"));
});

test("a read-only helper gets no tool that changes files; one that may edit gets them", () => {
    const readOnly = names(pick().shared);
    for (const n of ["write_project_file", "edit_project_file", "write_project_file_from_spec", "notebook_edit"]) assert.equal(readOnly.includes(n), false, n);
    assert.ok(readOnly.includes("bulk_read_project"));
    const editor = names(pick({ canEdit: true, ownNames: [...OWN_READ_ONLY, "write_project_file", "edit_project_file"] }).shared);
    assert.ok(editor.includes("write_project_file_from_spec"));
    assert.ok(editor.includes("notebook_edit"));
    // (its own write and edit tools are not doubled)
    assert.equal(editor.includes("write_project_file"), false);
});

test("a helper in its own copy of the project gets no tool that works in the main folder", () => {
    const copy = names(pick({ canEdit: true, ownCopy: true }).shared);
    for (const n of ["write_project_file_from_spec", "notebook_edit", "bulk_read_project", "search_project_by_meaning"]) assert.equal(copy.includes(n), false, n);
    assert.ok(copy.includes("search_web"));
});

test("staff tools stay with staff", () => {
    assert.equal(pick().groups.some((g) => g.id === "internal_ops"), false);
    const staff = pick({ role: "super_admin", email: "someone@classgrid.in" });
    assert.ok(staff.groups.some((g) => g.id === "internal_ops"));
});

test("the main AI's project and terminal rules are not handed to a helper", () => {
    assert.deepEqual(groupsWithRules(["code_project", "image_media", "terminal", "connector:google"]), ["image_media", "connector:google"]);
});

test("nothing left to load: no load_tools", () => {
    const set = sharedHelperTools({ mainTools: ["search_web", "open_url"].map(tool), ownNames: [], role: "user", email: "a@example.com" });
    assert.deepEqual(names(set.loaded), ["search_web", "open_url"]);
    assert.equal(set.loader, null);
});
