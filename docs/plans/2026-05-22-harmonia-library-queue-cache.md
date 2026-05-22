# Harmonia Library Queue Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cross-source API search with pagination, Cloudflare edge caching/proxying, dynamic synced lyrics, persistent queue management, and favorites.

**Architecture:** Keep the app static and framework-free. Add small testable helper modules for API/state/lyrics behavior, a Cloudflare Pages Function proxy under `functions/api/[[path]].js`, and wire `app.js` to those helpers while keeping `songs.js` as fallback data.

**Tech Stack:** HTML, CSS, browser JavaScript, Node built-in test runner, Cloudflare Pages Functions.

---

### Task 1: Tests And Helpers

**Files:**
- Create: `lib/harmonia-core.js`
- Create: `tests/harmonia-core.test.mjs`

**Steps:**
1. Write tests for API search URL normalization, valid search result filtering, queue sanitization, favorite toggling, and timed lyric index lookup.
2. Run `node --test tests/harmonia-core.test.mjs` and verify the tests fail because the helper module does not exist yet.
3. Implement `lib/harmonia-core.js`.
4. Run the tests again and verify they pass.

### Task 2: Cloudflare Pages Function Proxy

**Files:**
- Create: `functions/api/[[path]].js`

**Steps:**
1. Use helpers from `lib/harmonia-core.js` where possible.
2. Implement a unified proxy for `search`, `url`, `pic`, and `lyric`.
3. Normalize search cache keys by stripping URL-signature/noise parameters.
4. Cache only valid non-empty search result arrays.
5. Never cache empty arrays, API-busy messages, or error responses.

### Task 3: Frontend Integration

**Files:**
- Modify: `app.js`

**Steps:**
1. Add proxy-first API calls with direct API fallback.
2. Add source switching and pagination.
3. Add queue state with add/remove/clear/import behavior and localStorage persistence.
4. Add favorites state with separate progress/play mode and bulk operation controls.
5. Guard playback so no song plays when active lists are empty.
6. Update dynamic lyrics so manual scrolling locks the view and auto-returns after 3 seconds.

### Task 4: Styling And Docs

**Files:**
- Modify: `styles.css`
- Modify: `README.md`

**Steps:**
1. Style result actions, queue/favorites panels, pagination, and compact batch buttons.
2. Document Cloudflare Pages Function deployment behavior and API rate/caching notes.
3. Run `node --check app.js` and `node --test tests/harmonia-core.test.mjs`.
