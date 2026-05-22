const NOISE_PARAMS = new Set([
  "_",
  "callback",
  "s",
  "sign",
  "signature",
  "timestamp",
  "token"
]);

export function normalizeSearchParams(input) {
  const sourceParams = input instanceof URL ? input.searchParams : new URLSearchParams(input);
  const normalized = new URLSearchParams();

  ["types", "source", "name", "count", "pages"].forEach((key) => {
    const value = sourceParams.get(key);
    if (value && !NOISE_PARAMS.has(key)) {
      normalized.set(key, value.trim());
    }
  });

  normalized.set("types", "search");
  if (!normalized.get("source")) normalized.set("source", "kuwo");
  if (!normalized.get("count")) normalized.set("count", "12");
  if (!normalized.get("pages")) normalized.set("pages", "1");

  return new URLSearchParams(
    [...normalized.entries()].sort(([left], [right]) => left.localeCompare(right))
  );
}

export function isApiBusyPayload(payload) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload || "");
  return /busy|繁忙|频繁|rate|limit|error|failed/i.test(text);
}

export function isValidSearchPayload(payload) {
  if (!Array.isArray(payload) || payload.length === 0) return false;
  if (isApiBusyPayload(payload)) return false;

  return payload.some((item) => (
    item
    && typeof item === "object"
    && String(item.id || "").trim()
    && String(item.name || "").trim()
    && String(item.source || "").trim()
  ));
}

export function trackKey(track) {
  if (!track) return "";
  return `${track.source || "demo"}:${track.id || track.title || ""}`;
}

export function sanitizeQueue(queue) {
  const tracks = Array.isArray(queue?.tracks) ? queue.tracks.filter(Boolean) : [];

  if (!tracks.length) {
    return {
      tracks: [],
      currentIndex: -1,
      playing: false,
      mode: queue?.mode || "normal"
    };
  }

  const requestedIndex = Number.isInteger(queue?.currentIndex) ? queue.currentIndex : 0;
  const currentIndex = Math.min(Math.max(requestedIndex, 0), tracks.length - 1);

  return {
    tracks,
    currentIndex,
    playing: Boolean(queue?.playing),
    mode: queue?.mode || "normal"
  };
}

export function toggleFavorite(favorites, track) {
  const key = trackKey(track);
  if (!key) return Array.isArray(favorites) ? favorites : [];

  const list = Array.isArray(favorites) ? favorites : [];
  const exists = list.some((item) => trackKey(item) === key);

  if (exists) {
    return list.filter((item) => trackKey(item) !== key);
  }

  return [...list, track];
}

export function lyricIndexForTime(lyrics, time) {
  if (!Array.isArray(lyrics) || !lyrics.length) return 0;

  let activeIndex = 0;
  for (let index = 0; index < lyrics.length; index++) {
    if ((lyrics[index].time || 0) <= time + 0.25) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return activeIndex;
}
