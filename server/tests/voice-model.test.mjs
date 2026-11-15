// Voice mode's picked model (services/voice-model.service.js): the same plan rules as a typed message
import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceModelRefusal } from "../src/services/voice-model.service.js";

const free = { key: "free", name: "Free", models_allowed: ["auto", "@cf/zai-org/glm-5.3-flash", "claude-haiku-5-5"], claude_credits_per_week: 0, fable_share_percent: 0 };
const pro = { key: "pro", name: "Pro", models_allowed: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-2", "@cf/zai-org/glm-5.3"], claude_credits_per_week: 1000, fable_share_percent: 20 };
const proNoFable = { ...pro, fable_share_percent: 0 };

test("a model the plan does not list is locked", () => {
    const r = voiceModelRefusal({ model: "@cf/openai/gpt-oss-120b", isClaude: false, modelName: "GPT-OSS 120B", plan: free });
    assert.equal(r.status, 402);
    assert.equal(r.code, "model_locked");
    assert.match(r.message, /GPT-OSS 120B is not in your Free plan/);
});

test("Claude on a plan with 0 Claude credits is locked, even when listed", () => {
    const r = voiceModelRefusal({ model: "claude-haiku-5-5", isClaude: true, plan: free });
    assert.equal(r.code, "model_locked");
    assert.match(r.message, /Claude models are not in your Free plan/);
});

test("a listed non-Claude model and Claude on Pro are allowed", () => {
    assert.equal(voiceModelRefusal({ model: "@cf/zai-org/glm-5.3", isClaude: false, plan: pro }), null);
    assert.equal(voiceModelRefusal({ model: "claude-opus-5-5", isClaude: true, plan: pro, counters: { claude_week_used: 10, fable_week_used: 0 } }), null);
});

test("Fable is a family: a plan listing Fable 5.2 includes Fable 5.1", () => {
    assert.equal(voiceModelRefusal({ model: "claude-fable-5-1", isClaude: true, plan: pro, counters: { claude_week_used: 0, fable_week_used: 0 } }), null);
});

test("Fable needs the plan's Fable share", () => {
    const r = voiceModelRefusal({ model: "claude-fable-5-2", isClaude: true, modelName: "Claude Fable 5.2", plan: proNoFable });
    assert.equal(r.code, "model_locked");
    assert.match(r.message, /Claude Fable 5.2 is not in your Pro plan/);
});

test("the week's Claude credits and Fable's share stop it", () => {
    assert.equal(voiceModelRefusal({ model: "claude-sonnet-5-5", isClaude: true, plan: pro, counters: { claude_week_used: 1000, fable_week_used: 0 } }).code, "claude_cap_reached");
    assert.equal(voiceModelRefusal({ model: "claude-fable-5-2", isClaude: true, plan: pro, counters: { claude_week_used: 100, fable_week_used: 200 } }).code, "claude_cap_reached");
    assert.equal(voiceModelRefusal({ model: "claude-sonnet-5-5", isClaude: true, plan: pro, counters: { claude_week_used: 100, fable_week_used: 200 } }), null);
});

test("plans off or staff: Claude is allowed, Fable only when unlocked", () => {
    assert.equal(voiceModelRefusal({ model: "claude-opus-5-5", isClaude: true, plan: null }), null);
    assert.equal(voiceModelRefusal({ model: "claude-fable-5-2", isClaude: true, plan: null, fableUnlocked: false }).code, "model_locked");
    assert.equal(voiceModelRefusal({ model: "claude-fable-5-2", isClaude: true, plan: null, fableUnlocked: true }), null);
});
