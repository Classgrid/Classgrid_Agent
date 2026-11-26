// Desktop app and extension pictures sent inside the chat request (utils/inline-images.js). How many one message may
// carry is the plan's files_per_message (the chat controller checks it next); a fixed 6 here dropped the 7th to 15th
// picture on Max without a word (owner, 2026-11-27: "I sent all 15, it only got 6").
// Run: node --test tests/inline-images.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { takeInlineImages, INLINE_IMAGE_PREFIX } from "../src/utils/inline-images.js";

const pic = (i) => `data:image/png;base64,${Buffer.from(`picture ${i}`).toString("base64")}`;

test("all 15 pictures of a message are kept, each as its placeholder", () => {
    const body = { attachments: Array.from({ length: 15 }, (_, i) => ({ url: pic(i), name: `s${i}.png`, mimeType: "image/png" })) };
    const images = takeInlineImages(body, { allowed: true });
    assert.equal(images.length, 15);
    assert.equal(body.attachments.length, 15, "none dropped from the message");
    assert.ok(body.attachments.every((a) => a.url.startsWith(INLINE_IMAGE_PREFIX)));
    assert.equal(body.fileUrls.length, 15);
});

test("a website request still keeps no inline picture", () => {
    const body = { attachments: [{ url: pic(1), name: "a.png" }] };
    assert.deepEqual(takeInlineImages(body, { allowed: false }), []);
    assert.equal(body.attachments.length, 0);
});
