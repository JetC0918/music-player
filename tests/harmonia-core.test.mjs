import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidSearchPayload,
  lyricIndexForTime,
  normalizeSearchParams,
  sanitizeQueue,
  toggleFavorite
} from "../lib/harmonia-core.js";

test("normalizes search params and strips signature noise", () => {
  const normalized = normalizeSearchParams(new URL("https://example.com/api?types=search&source=kuwo&name=Taylor%20Swift&count=12&pages=2&s=abc&timestamp=123"));

  assert.equal(normalized.toString(), "count=12&name=Taylor+Swift&pages=2&source=kuwo&types=search");
});

test("accepts only non-empty search payloads with real song records", () => {
  assert.equal(isValidSearchPayload([]), false);
  assert.equal(isValidSearchPayload({ error: "API busy" }), false);
  assert.equal(isValidSearchPayload([{ name: "", id: "" }]), false);
  assert.equal(isValidSearchPayload([{ id: "3493737", name: "Love Story", source: "kuwo" }]), true);
});

test("finds the active lyric line for playback time", () => {
  const lyrics = [
    { time: 0, text: "First" },
    { time: 12.4, text: "Second" },
    { time: 18, text: "Third" }
  ];

  assert.equal(lyricIndexForTime(lyrics, 0), 0);
  assert.equal(lyricIndexForTime(lyrics, 12.5), 1);
  assert.equal(lyricIndexForTime(lyrics, 40), 2);
});

test("sanitizes queue and prevents ghost playback indexes", () => {
  const queue = sanitizeQueue({
    tracks: [{ id: "a" }, null, { id: "b" }],
    currentIndex: 12,
    playing: true
  });

  assert.deepEqual(queue.tracks, [{ id: "a" }, { id: "b" }]);
  assert.equal(queue.currentIndex, 1);
  assert.equal(queue.playing, true);

  const emptyQueue = sanitizeQueue({ tracks: [], currentIndex: 3, playing: true });
  assert.equal(emptyQueue.currentIndex, -1);
  assert.equal(emptyQueue.playing, false);
});

test("toggles favorites without duplicates", () => {
  const track = { id: "3493737", source: "kuwo", title: "Love Story" };
  const first = toggleFavorite([], track);
  const second = toggleFavorite(first, track);

  assert.equal(first.length, 1);
  assert.equal(second.length, 0);
});
