// The time words and the scene strip sums of the video viewer (videoMath.ts).
// Run: node --test client/src/features/share-pages/videoMath.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { boxFrom, cleanScenes, fitSize, formatClock, formatLength, formatSpan, stripLayout, tileAt, timeToX, xToTime } from "./videoMath.ts";

test("times as a clock", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(21.9), "0:21");
  assert.equal(formatClock(129), "2:09");
  assert.equal(formatClock(3723), "1:02:03");
  assert.equal(formatClock(-4), "0:00");
  assert.equal(formatClock(Number.NaN), "0:00");
});

test("lengths: seconds under a minute, a clock from a minute on", () => {
  assert.equal(formatLength(21), "21s");
  assert.equal(formatLength(31.8), "31.8s");
  assert.equal(formatLength(31.84), "31.8s");
  assert.equal(formatLength(45), "45s");
  assert.equal(formatLength(16.0), "16s");
  assert.equal(formatLength(59.96), "1:00");
  assert.equal(formatLength(129), "2:09");
});

test("a stretch of time", () => {
  assert.equal(formatSpan(21), "0:21");
  assert.equal(formatSpan(21, null), "0:21");
  assert.equal(formatSpan(21, 35), "0:21 to 0:35");
});

test("scenes are put in order, ended, and kept inside the video", () => {
  const s = cleanScenes([{ title: "B", start: 30 }, { title: "A", start: 2 }, { title: "Late", start: 200 }], 60);
  assert.deepEqual(s.map((x) => [x.title, x.start, x.end]), [["A", 0, 30], ["B", 30, 60]]);
  assert.deepEqual(cleanScenes([], 45).map((x) => [x.start, x.end]), [[0, 45]]);
});

test("tiles are as wide as their scenes are long", () => {
  const layout = stripLayout([{ title: "A", start: 0 }, { title: "B", start: 20 }, { title: "C", start: 30 }], 60, { perSecond: 3, minWidth: 10, gap: 4 });
  assert.deepEqual(layout.tiles.map((t) => [t.left, t.width]), [[0, 60], [64, 30], [98, 90]]);
  assert.equal(layout.width, 188);
});

test("a short scene still gets the smallest tile", () => {
  const layout = stripLayout([{ title: "A", start: 0 }, { title: "B", start: 1 }], 21, { perSecond: 3, minWidth: 24, gap: 4 });
  assert.equal(layout.tiles[0].width, 24);
  assert.equal(layout.tiles[1].width, 60);
});

test("a short video fills a wide strip", () => {
  const layout = stripLayout([{ title: "A", start: 0 }, { title: "B", start: 15 }], 45, { perSecond: 3, minWidth: 10, gap: 4, fitWidth: 454 });
  assert.equal(layout.width, 454);
  assert.equal(layout.tiles[0].width, 150);
  assert.equal(layout.tiles[1].width, 300);
});

test("a time on the strip and back again", () => {
  const layout = stripLayout([{ title: "A", start: 0 }, { title: "B", start: 20 }, { title: "C", start: 30 }], 60, { perSecond: 3, minWidth: 10, gap: 4 });
  assert.equal(timeToX(layout, 0), 0);
  assert.equal(timeToX(layout, 10), 30);
  assert.equal(timeToX(layout, 25), 79);
  assert.equal(timeToX(layout, 60), 188);
  assert.equal(timeToX(layout, 999), 188);
  for (const t of [0, 7.5, 20, 25, 42, 60]) assert.ok(Math.abs(xToTime(layout, timeToX(layout, t)) - t) < 1e-9, `time ${t}`);
  // (between two tiles: where the next scene starts)
  assert.equal(xToTime(layout, 62), 20);
  assert.equal(xToTime(layout, -5), 0);
  assert.equal(xToTime(layout, 500), 60);
  assert.equal(tileAt(layout, 25).title, "B");
  assert.equal(tileAt(layout, 60).title, "C");
});

test("a box from two corners, kept inside the frame", () => {
  assert.deepEqual(boxFrom(0.6, 0.5, 0.2, 0.1), { x: 0.2, y: 0.1, w: 0.39999999999999997, h: 0.4 });
  assert.deepEqual(boxFrom(-1, 0.5, 2, 0.5), { x: 0, y: 0.5, w: 1, h: 0 });
});

test("the video fits its box", () => {
  assert.deepEqual(fitSize(1000, 1000, 1920, 1080), { width: 1000, height: 562 });
  assert.deepEqual(fitSize(1000, 300, 1920, 1080), { width: 533, height: 300 });
  assert.deepEqual(fitSize(320, 180, 0, 0), { width: 320, height: 180 });
});
