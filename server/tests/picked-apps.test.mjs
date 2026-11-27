// Apps picked in the chat box ("@Gmail", "@Web search") are found in the message, so the AI is told to use them and
// their tool groups load from the start (owner, 2026-11-27). utils/picked-apps.js.
// Run: node --test tests/picked-apps.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { mentionsIn, pickedApps, pickedGroupIds, pickedAppsNote } = await import("../src/utils/picked-apps.js");

test("a picked plugin and the search items are found, in order, each once", () => {
    const picked = pickedApps("@Gmail @Web search what did Rahul send me? also @gmail again");
    assert.deepEqual(picked.names, ["Gmail", "Web search"]);
    assert.deepEqual(picked.plugins.map((p) => p.group), ["connector:google"]);
    assert.equal(picked.webSearch, true);
    assert.equal(picked.deepResearch, false);
});

test("the longest name wins and the name must end the word", () => {
    assert.deepEqual(mentionsIn("@Google Drive files", ["Google", "Google Drive"]), ["Google Drive"]);
    assert.deepEqual(mentionsIn("@Gmailx and @Gmail.com", ["Gmail"]), []);
    assert.deepEqual(mentionsIn("@Gmail, then @Notion.", ["Gmail", "Notion"]), ["Gmail", "Notion"]);
});

test("an email address is never a pick", () => {
    assert.deepEqual(mentionsIn("write to rahul@Gmail please", ["Gmail"]), []);
    assert.deepEqual(mentionsIn("(@Gmail) and \"@Slack\"", ["Gmail", "Slack"]), ["Gmail", "Slack"]);
});

test("custom connectors by their saved name; plugins off in a shared chat", () => {
    const picked = pickedApps("check @My CRM and @Linear", { customNames: ["My CRM", "Linear"] });
    assert.deepEqual(picked.custom, ["My CRM", "Linear"]);
    const shared = pickedApps("@Gmail @Deep research", { pluginsAllowed: false });
    assert.deepEqual(shared.names, ["Deep research"]);
    assert.deepEqual(shared.plugins, []);
});

test("groups to load: each once", () => {
    assert.deepEqual(pickedGroupIds(pickedApps("@Gmail @Google Calendar @GitHub")), ["connector:google", "connector:github"]);
    assert.deepEqual(pickedGroupIds(pickedApps("nothing here")), []);
});

test("the note names the apps, their tools and what to do; empty when nothing was picked", () => {
    assert.equal(pickedAppsNote(pickedApps("hello")), "");
    const note = pickedAppsNote(pickedApps("@GitHub @Deep research @Web search"), { researchLine: "Do deep research." });
    assert.match(note, /^\n\n--- APPS THE USER PICKED ---\nThe user picked these apps in the chat box for this message/);
    assert.match(note, /GitHub, Deep research, Web search/);
    assert.match(note, /- GitHub: use its tool github_workspace_connector for this request \(group connector:github; if the tool is not in your list, load that group with load_tools first\)/);
    assert.match(note, /- Web search: search the web for this request with search_web/);
    assert.match(note, /- Deep research: Do deep research\./);
});
