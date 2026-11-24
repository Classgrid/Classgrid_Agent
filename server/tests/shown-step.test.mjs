// What the chat is shown of a step (utils/shown-step.js).
// 1. A helper's copy of a step is cut at 6,000 characters. An opened page's result is JSON, and the card that shows
//    it reads it as JSON: a long page, cut in the middle, could not be read and the card said "Failed" for a page that
//    was opened and read (owner, 2026-11-24: "what does it mean failed").
// 2. Why a helper's model stopped was shown as the provider's raw error, with the provider's name.
// Run: node --test tests/shown-step.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { shownStepResult, stepText, plainModelError } = await import("../src/utils/shown-step.js");

// An opened page as open_url returns it (ai-chat.controller.js)
const page = (chars) => JSON.stringify({
    how_to_cite: "This is the page itself (source id 4). Cite facts from it as [4].", id: 4, url: "https://docs.context.dev/llms.txt", part: "1 of 3",
    links: Array.from({ length: 25 }, (_, i) => ({ text: `Link ${i}`, url: `https://docs.context.dev/page-${i}` })),
    content: `# Context.dev docs\n\n${"A long line of the page's text. ".repeat(Math.ceil(chars / 32))}`,
});

test("a long page cut for the chat is still JSON the card can read: its address, its title, its links", () => {
    const whole = page(20000);
    assert.ok(whole.length > 6000);
    const shown = shownStepResult(whole, 6000);
    assert.ok(shown.length <= 6000);
    const parsed = JSON.parse(shown); // (the card does exactly this; the plain cut threw here)
    assert.equal(parsed.url, "https://docs.context.dev/llms.txt");
    assert.equal(parsed.id, 4);
    assert.ok(parsed.content.startsWith("# Context.dev docs"), "the page's title is the first heading of its text");
    assert.equal(parsed.links.length, 25);
    // (what the old cut gave: not JSON)
    assert.throws(() => JSON.parse(whole.slice(0, 6000)));
});

test("a web search cut for the chat keeps every website, with its whole name and address, like the main agent's card", () => {
    // What search_web returns (ai-chat.controller.js): the results with each page's long text
    const results = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        title: `Context.dev review number ${i + 1}: web scraping API pricing, limits and how it compares with the others`,
        url: `https://example-${i + 1}.com/blog/context-dev-web-scrape-api-review-and-pricing-comparison-${i + 1}`,
        content: "The page's own text, long. ".repeat(160),
    }));
    const whole = JSON.stringify({ how_to_cite: "Cite facts from these results with the result id in square brackets.", answer: null, results, images: [] });
    assert.ok(whole.length > 40000);
    const shown = shownStepResult(whole, 6000);
    assert.ok(shown.length <= 6000);
    const parsed = JSON.parse(shown);
    assert.equal(parsed.results.length, 12, "every website is still in the list");
    parsed.results.forEach((r, i) => {
        assert.equal(r.title, results[i].title, "its whole name");
        assert.equal(r.url, results[i].url, "its whole address");
        assert.equal(r.id, i + 1);
    });
    // (the old cut gave the card nothing it could read: "Could not parse search results.")
    assert.throws(() => JSON.parse(whole.slice(0, 6000)));
});

// The search that still said "Could not parse search results. Failed" after the first fix (owner's screenshot,
// 2026-11-24 10:35): a deep search gives 15 websites with their pictures, and with every text down to a few words the
// list alone is longer than 6,000 characters. The first version then fell back to a plain cut, which is not JSON.
test("a deep search (15 websites, long addresses, pictures) is still JSON with every website whole", () => {
    const results = Array.from({ length: 15 }, (_, i) => ({
        url: `https://www.example-company-${i + 1}.com/blog/2026/context-dev-web-scraping-api-founders-funding-and-the-full-company-story/part-${i + 1}?utm_source=search&ref=classgrid`,
        title: `Context.dev, the web scraping API company: who made it, the founders, the funding and how it compares (${i + 1})`,
        content: "A chunk of the page's text. ".repeat(120),
        score: 0.87, raw_content: null, favicon: `https://www.example-company-${i + 1}.com/static/images/favicon-32x32.png`, snippet: "s".repeat(240), id: i + 1,
    }));
    const images = Array.from({ length: 6 }, (_, i) => ({ url: `https://cdn.example.com/images/context-dev-screenshot-of-the-dashboard-number-${i}.png`, description: "d".repeat(400) }));
    const whole = JSON.stringify({ how_to_cite: "Cite facts from these results with the result id in square brackets. ".repeat(8), answer: null, results, images });
    for (const max of [6000, 4000]) {
        const shown = shownStepResult(whole, max);
        const parsed = JSON.parse(shown); // (the card does exactly this)
        assert.equal(parsed.results.length, 15, "every website");
        parsed.results.forEach((r, i) => { assert.equal(r.title, results[i].title); assert.equal(r.url, results[i].url); });
        assert.equal(parsed.images.length, 6);
        assert.ok(shown.length > max && shown.length <= 30000, `the list is kept whole (${shown.length})`);
    }
});

test("whatever the size, a JSON result is never cut into something that is not JSON", () => {
    const huge = JSON.stringify({ results: Array.from({ length: 900 }, (_, i) => ({ id: i, title: `Title ${i} ${"t".repeat(80)}`, url: `https://site-${i}.example.com/${"p".repeat(120)}` })) });
    assert.ok(huge.length > 150000);
    const shown = shownStepResult(huge, 6000);
    assert.ok(shown.length <= 30000);
    const parsed = JSON.parse(shown);
    assert.ok(parsed.results.length >= 1 && parsed.results.length < 900);
    assert.equal(parsed.results[0].url, `https://site-0.example.com/${"p".repeat(120)}`);
    // (one text so long that nothing else can be dropped still gives JSON)
    assert.doesNotThrow(() => JSON.parse(shownStepResult(JSON.stringify({ title: "x".repeat(500), list: Array.from({ length: 400 }, () => "y".repeat(500)) }), 6000)));
    assert.doesNotThrow(() => JSON.parse(shownStepResult(JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ url: `https://a.example/${i}` }))), 6000)));
});

test("a short result, and a long result that is not JSON, are as before", () => {
    const short = page(200);
    assert.equal(shownStepResult(short, 6000), short);
    const text = "x".repeat(9000);
    assert.equal(shownStepResult(text, 6000), text.slice(0, 6000));
    assert.equal(shownStepResult("{ not json ".repeat(900), 6000).length, 6000);
    assert.equal(shownStepResult(null), "");
    assert.equal(shownStepResult(undefined), "");
});

test("a handler's { text, images } result and a list are handled", () => {
    assert.equal(stepText({ text: "the words", images: [{}] }), "the words");
    assert.equal(shownStepResult({ text: "the words", images: [{}] }), "the words");
    const list = JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: i, title: `Result ${i}`, content: "c".repeat(900) })));
    const shown = shownStepResult(list, 4000);
    assert.ok(shown.length <= 4000);
    const parsed = JSON.parse(shown);
    assert.ok(Array.isArray(parsed) && parsed.length >= 1);
    assert.equal(parsed[0].title, "Result 0");
});

test("why a model stopped: plain words, never the provider's name or its raw error", () => {
    const raw = 'Anthropic 400: 400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-12-01 at 00:00 UTC."},"request_id":"req_011ChM7YLi7Xaa5xYmhP3KRd"}';
    assert.equal(plainModelError(raw), "it is not available right now");
    for (const [error, words] of [
        ["Cloudflare 429: rate limit exceeded", "it was too busy"],
        ["Anthropic 529: overloaded_error", "it was too busy"],
        ["The operation was aborted due to timeout", "it took too long to answer"],
        ["Cloudflare 502: Bad Gateway", "it had a problem on its side"],
        ["Anthropic 401: invalid x-api-key", "it is not available right now"],
        ["the model is not available right now", "it is not available right now"],
        ["no answer", "it gave no answer"],
        ["", "it gave no answer"],
        ["something odd happened", "it could not go on"],
    ]) assert.equal(plainModelError(error), words, error);
    assert.equal(plainModelError(new Error("Anthropic 400: usage limits")), "it is not available right now");
    for (const error of [raw, "Cloudflare 429: rate limit", "Anthropic 529"]) assert.doesNotMatch(plainModelError(error), /anthropic|cloudflare|\d{3}|\{|req_/i);
});
