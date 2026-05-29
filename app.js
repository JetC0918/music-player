import {
  buildRadioPlan,
  getRadioVibe,
  lyricIndexForTime as getLyricIndexForTime,
  sanitizeQueue,
  shouldPlayHourlyNews,
  toggleFavorite,
  trackKey
} from "./lib/harmonia-core.js";

const songs = Array.isArray(window.SONGS) ? window.SONGS : [];
const page = document.body.dataset.page;
const audio = document.querySelector("[data-audio]");
const titleNode = document.querySelector("[data-track-title]");
const metaNode = document.querySelector("[data-track-meta]");
const DIRECT_API_BASE_URL = "https://music-api.gdstudio.xyz/api.php";
const API_BASE_URL = window.HARMONIA_API_BASE_URL || "/api";
const DEFAULT_SEARCH = "Taylor Swift";
const DEFAULT_SOURCE = "kuwo";

let lastRandomIndex = -1;

const icons = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h12M4 17h16"/></svg>',
  previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m19 20-10-8 10-8v16Z"/><path d="M5 19V5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7V5Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 4 10 8-10 8V4Z"/><path d="M19 5v14"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 17h2.5c2.5 0 3.7-1.5 5-5s2.5-5 5-5H21M18 21l3-3-3-3M4 7h2.5c1.4 0 2.4.5 3.2 1.7M14.2 15.3c.7 1.7 1.8 2.7 3.3 2.7H21"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9.5a4 4 0 0 1 0 5M19 7a8 8 0 0 1 0 10"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"/></svg>'
};

function setTrack(song, autoplay = false) {
  if (!audio || !titleNode || !metaNode || !song) return;

  titleNode.textContent = song.title;
  metaNode.textContent = `${song.artist} - ${song.mood}`;
  audio.src = song.src || demoTone(song.toneHz || 220);

  if (autoplay) {
    audio.play().catch(() => {
      metaNode.textContent = `${song.artist} - Press play on the audio bar to start.`;
    });
  }
}

function demoTone(frequency) {
  const sampleRate = 8000;
  const duration = 1.25;
  const sampleCount = Math.floor(sampleRate * duration);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const fade = Math.min(index / 800, (sampleCount - index) / 800, 1);
    const wave = Math.sin((index / sampleRate) * frequency * Math.PI * 2);
    view.setInt16(44 + index * 2, wave * fade * 9000, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function randomSong() {
  if (songs.length <= 1) return songs[0];

  let nextIndex = Math.floor(Math.random() * songs.length);
  while (nextIndex === lastRandomIndex) {
    nextIndex = Math.floor(Math.random() * songs.length);
  }

  lastRandomIndex = nextIndex;
  return songs[nextIndex];
}

function initRadio() {
  const root = document.querySelector("[data-radio-root]");
  if (!root) return;

  const state = {
    started: false,
    loading: false,
    vibe: getRadioVibe(),
    plan: [],
    currentIndex: -1,
    currentTrack: null,
    nextTrack: null,
    newsScript: "",
    lastNewsKey: "",
    status: "Ready for the live signal",
    crossfadeSeconds: 8
  };
  const currentAudio = new Audio();
  const nextAudio = new Audio();
  let crossfadeTimer = null;

  currentAudio.preload = "metadata";
  nextAudio.preload = "auto";

  function renderRadio() {
    root.replaceChildren();

    const panel = node("section", "radio-console");
    const header = node("div", "radio-header");
    const copy = node("div", "radio-copy");
    const controls = node("div", "radio-actions");
    const start = node("button", "search-button", state.started ? "Next track" : "Start radio");
    const refresh = node("button", "mini-button", "Refresh vibe");
    const news = node("button", "mini-button", "News now");
    const planner = node("section", "radio-planner");

    copy.append(
      node("p", "track-kicker", state.status),
      node("h1", "", "Harmonia Radio"),
      node("p", "radio-vibe", `${state.vibe.label} · GMT+8`)
    );

    start.type = "button";
    start.disabled = state.loading;
    start.addEventListener("click", () => startRadio(true));
    refresh.type = "button";
    refresh.addEventListener("click", () => loadVibePlan(true));
    news.type = "button";
    news.addEventListener("click", () => playNewsSegment(true));
    controls.append(start, refresh, news);
    header.append(copy, controls);

    const track = state.currentTrack || {
      title: "Signal warming up",
      artist: "Harmonia",
      album: "Live radio"
    };

    planner.append(
      TrackInfo(track, state.started ? "On air" : "Radio idle"),
      node("p", "radio-note", "Automatic vibe selection changes through the day. Hourly news runs at :00 from 8am to 8pm Malaysia time.")
    );

    const list = node("div", "queue-list radio-plan-list");
    state.plan.slice(0, 5).forEach((trackItem, index) => {
      const item = node("article", index === state.currentIndex ? "queue-item is-active" : "queue-item");
      const main = node("div", "queue-main");
      main.append(node("strong", "", trackItem.title), node("span", "", `${trackItem.artist} · starts ${formatTime(trackItem.startsAt)}`));
      item.append(main);
      list.append(item);
    });
    planner.append(list);

    panel.append(header, AlbumArt(track), planner, LyricsPanel(track));
    root.append(panel);
  }

  async function loadVibePlan(force = false) {
    state.vibe = getRadioVibe();
    if (state.loading && !force) return;
    state.loading = true;
    state.status = "Planning tracks";
    renderRadio();

    try {
      const results = await searchTracks(state.vibe.query, DEFAULT_SOURCE, 1);
      const enriched = await Promise.all(results.slice(0, 6).map((track) => enrichTrack(track)));
      state.plan = buildRadioPlan(enriched, { crossfadeSeconds: state.crossfadeSeconds });
      state.status = "Track plan ready";
    } catch (error) {
      state.plan = buildRadioPlan(songs.map(normalizeFallbackTrack), { crossfadeSeconds: state.crossfadeSeconds });
      state.status = "Using fallback radio plan";
    }

    state.loading = false;
    renderRadio();
  }

  async function startRadio(forceNext = false) {
    if (!state.plan.length) {
      await loadVibePlan(true);
    }
    if (!state.plan.length) return;

    state.started = true;
    state.currentIndex = forceNext ? (state.currentIndex + 1) % state.plan.length : Math.max(0, state.currentIndex);
    const track = state.plan[state.currentIndex];
    state.currentTrack = track;
    currentAudio.src = track.src || demoTone(track.toneHz || 220);
    currentAudio.volume = 1;
    await currentAudio.play().catch(() => {
      state.status = "Press start to allow playback";
    });
    state.status = "On air";
    preloadNextTrack();
    renderRadio();
  }

  function preloadNextTrack() {
    if (!state.plan.length) return;
    const nextIndex = (state.currentIndex + 1) % state.plan.length;
    state.nextTrack = state.plan[nextIndex];
    nextAudio.src = state.nextTrack.src || demoTone(state.nextTrack.toneHz || 220);
    nextAudio.volume = 0;
  }

  function beginCrossfade() {
    if (crossfadeTimer || !state.nextTrack) return;
    const steps = 24;
    let step = 0;
    nextAudio.currentTime = 0;
    nextAudio.play().catch(() => {});
    crossfadeTimer = window.setInterval(() => {
      step += 1;
      const ratio = Math.min(1, step / steps);
      currentAudio.volume = 1 - ratio;
      nextAudio.volume = ratio;

      if (ratio >= 1) {
        window.clearInterval(crossfadeTimer);
        crossfadeTimer = null;
        currentAudio.pause();
        currentAudio.src = nextAudio.src;
        currentAudio.currentTime = nextAudio.currentTime;
        currentAudio.volume = 1;
        nextAudio.pause();
        nextAudio.removeAttribute("src");
        currentAudio.play().catch(() => {});
        state.currentIndex = (state.currentIndex + 1) % state.plan.length;
        state.currentTrack = state.plan[state.currentIndex];
        preloadNextTrack();
        renderRadio();
      }
    }, (state.crossfadeSeconds * 1000) / steps);
  }

  async function playNewsSegment(force = false) {
    const now = new Date();
    const newsKey = now.toISOString().slice(0, 13);
    if (!force && (!shouldPlayHourlyNews(now) || state.lastNewsKey === newsKey)) return;
    state.lastNewsKey = newsKey;
    state.status = "News break";
    renderRadio();

    currentAudio.pause();
    try {
      const script = await fetchJson(new URL("/api/news", window.location.origin).toString());
      state.newsScript = script.script || "Here is your Harmonia news break. Malaysia first, then the world.";
    } catch (error) {
      state.newsScript = "Here is your Harmonia news break. Malaysia first, then international headlines. Connect Cloudflare AI to generate live summaries.";
    }

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(state.newsScript);
      utterance.rate = 0.95;
      utterance.onend = () => {
        state.status = "Back to music";
        currentAudio.play().catch(() => {});
        renderRadio();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      window.setTimeout(() => currentAudio.play().catch(() => {}), 90000);
    }
    renderRadio();
  }

  currentAudio.addEventListener("timeupdate", () => {
    const remaining = currentAudio.duration - currentAudio.currentTime;
    if (Number.isFinite(remaining) && remaining <= state.crossfadeSeconds) {
      beginCrossfade();
    }
  });
  currentAudio.addEventListener("ended", () => startRadio(true));

  window.setInterval(() => {
    state.vibe = getRadioVibe();
    playNewsSegment(false);
  }, 60 * 1000);

  loadVibePlan(true);
  renderRadio();
}

function node(tagName, className, content) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (typeof content === "string") element.textContent = content;
  return element;
}

function iconButton(icon, label, className = "") {
  const button = node("button", `icon-button ${className}`.trim());
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.innerHTML = icons[icon];
  return button;
}

function formatTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function AlbumArt(song) {
  const wrap = node("section", `album-art cover-${song.coverTheme || "sunset-valley"}`);
  wrap.setAttribute("aria-label", `${song.album} album artwork`);

  if (song.coverUrl) {
    const image = node("img", "album-image");
    image.src = song.coverUrl;
    image.alt = `${song.album} cover`;
    image.loading = "lazy";
    wrap.append(image);
    return wrap;
  }

  wrap.innerHTML = `
    <div class="cover-sky"></div>
    <div class="cover-sun"></div>
    <div class="cover-mountains cover-mountains-back"></div>
    <div class="cover-mountains cover-mountains-front"></div>
    <div class="cover-water"></div>
    <div class="cover-shore"></div>
  `;
  return wrap;
}

function TrackInfo(song, statusText = "") {
  const wrap = node("section", "track-info");
  const kicker = node("p", "track-kicker", statusText || "Now playing");
  const title = node("h1", "", song.title);
  const artist = node("p", "artist", song.artist);
  const album = node("p", "album", song.album);
  const waveform = node("div", "waveform");

  waveform.setAttribute("aria-hidden", "true");
  Array.from({ length: 58 }, (_, index) => {
    const bar = node("span");
    const height = 18 + Math.round(Math.abs(Math.sin(index * 0.61)) * 34);
    bar.style.setProperty("--bar-height", `${height}px`);
    waveform.append(bar);
    return bar;
  });

  wrap.append(kicker, title, artist, album, waveform);
  return wrap;
}

function SearchPanel(state, actions) {
  const panel = node("section", "api-search");
  const form = node("form", "search-form");
  const input = node("input", "search-input");
  const select = node("select", "source-select");
  const submit = node("button", "search-button", "Search");
  const pager = node("div", "pager-row");
  const prevPage = node("button", "mini-button", "Prev");
  const nextPage = node("button", "mini-button", "Next");
  const importPage = node("button", "mini-button", "Import page");
  const resultList = node("div", "api-results");

  input.type = "search";
  input.name = "query";
  input.value = state.query;
  input.placeholder = "Search songs, artists, or albums";
  input.setAttribute("aria-label", "Search songs, artists, or albums");

  [
    ["netease", "NetEase"],
    ["kuwo", "Kuwo"],
    ["joox", "JOOX"],
    ["bilibili", "Bilibili"]
  ].forEach(([value, label]) => {
    const option = node("option", "", label);
    option.value = value;
    option.selected = state.source === value;
    select.append(option);
  });
  select.setAttribute("aria-label", "Music source");

  submit.type = "submit";
  submit.disabled = state.loading;
  form.append(input, select, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.search(input.value.trim(), select.value, 1);
  });

  prevPage.type = "button";
  prevPage.disabled = state.page <= 1 || state.loading;
  prevPage.addEventListener("click", () => actions.search(state.query, state.source, state.page - 1));

  nextPage.type = "button";
  nextPage.disabled = state.loading;
  nextPage.addEventListener("click", () => actions.search(state.query, state.source, state.page + 1));

  importPage.type = "button";
  importPage.disabled = !state.results.length;
  importPage.addEventListener("click", () => actions.addManyToQueue(state.results));

  pager.append(prevPage, node("span", "page-label", `Page ${state.page}`), nextPage, importPage);

  state.results.slice(0, 6).forEach((track) => {
    const row = node("article", "api-result");
    const button = node("button", "result-main");
    const title = node("strong", "", track.title);
    const artist = node("span", "", track.artist);
    const actionsWrap = node("div", "result-actions");
    const add = node("button", "chip-button", "+");
    const favorite = node("button", "chip-button", state.favoriteKeys.has(trackKey(track)) ? "♥" : "♡");

    button.type = "button";
    button.append(title, artist);
    button.addEventListener("click", () => actions.playSearchResult(track));
    add.type = "button";
    add.setAttribute("aria-label", `Add ${track.title} to queue`);
    add.addEventListener("click", () => actions.addToQueue(track));
    favorite.type = "button";
    favorite.setAttribute("aria-label", `Favorite ${track.title}`);
    favorite.addEventListener("click", () => actions.toggleFavorite(track));
    actionsWrap.append(add, favorite);
    row.append(button, actionsWrap);
    resultList.append(row);
  });

  panel.append(form, pager, resultList);
  return panel;
}

function ProgressBar(state, onSeek) {
  const wrap = node("section", "progress-shell");
  const bar = node("button", "progress-track");
  const fill = node("span", "progress-fill");
  const thumb = node("span", "progress-thumb");
  const times = node("div", "time-row");

  bar.type = "button";
  bar.setAttribute("aria-label", "Seek through track");
  bar.append(fill, thumb);
  times.innerHTML = `<span data-current-time>${formatTime(state.currentTime)}</span><span data-duration-time>${formatTime(state.duration)}</span>`;
  wrap.append(bar, times);

  function paint() {
    const percent = state.duration ? (state.currentTime / state.duration) * 100 : 0;
    wrap.style.setProperty("--progress", `${Math.min(percent, 100)}%`);
    times.querySelector("[data-current-time]").textContent = formatTime(state.currentTime);
    times.querySelector("[data-duration-time]").textContent = formatTime(state.duration);
  }

  bar.addEventListener("click", (event) => {
    const bounds = bar.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    state.currentTime = Math.max(0, Math.min(state.duration, state.duration * ratio));
    paint();
    onSeek(state.currentTime);
  });

  wrap.update = paint;
  paint();
  return wrap;
}

function PlaybackControls(actions) {
  const wrap = node("section", "playback-controls");
  const shuffle = iconButton("shuffle", "Shuffle");
  const previous = iconButton("previous", "Previous track");
  const play = iconButton(actions.isPlaying() ? "pause" : "play", actions.isPlaying() ? "Pause" : "Play", "play-button");
  const next = iconButton("next", "Next track");
  const repeat = iconButton("repeat", "Repeat");

  shuffle.addEventListener("click", actions.shuffle);
  previous.addEventListener("click", actions.previous);
  play.addEventListener("click", () => {
    actions.toggle();
    play.classList.toggle("is-paused", !actions.isPlaying());
    play.setAttribute("aria-label", actions.isPlaying() ? "Pause" : "Play");
    play.innerHTML = icons[actions.isPlaying() ? "pause" : "play"];
  });
  next.addEventListener("click", actions.next);
  repeat.addEventListener("click", actions.repeat);
  wrap.append(shuffle, previous, play, next, repeat);
  return wrap;
}

function VolumeControl(state, onChange) {
  const wrap = node("section", "volume-control");
  const low = node("span", "volume-icon");
  const slider = node("input", "volume-slider");
  const high = node("span", "volume-icon volume-icon-strong");

  low.innerHTML = icons.volume;
  high.innerHTML = icons.volume;
  slider.type = "range";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.01";
  slider.value = state.volume;
  slider.setAttribute("aria-label", "Volume");
  slider.addEventListener("input", () => {
    state.volume = Number(slider.value);
    onChange(state.volume);
  });

  wrap.append(low, slider, high);
  return wrap;
}

function LibraryPanel(state, actions) {
  const panel = node("section", "library-panel");
  const tabs = node("div", "library-tabs");
  const queueTab = node("button", state.activeList === "queue" ? "tab-button is-active" : "tab-button", `Queue ${state.queue.tracks.length}`);
  const favTab = node("button", state.activeList === "favorites" ? "tab-button is-active" : "tab-button", `Favorites ${state.favorites.tracks.length}`);
  const tools = node("div", "batch-row");
  const clear = node("button", "mini-button", state.activeList === "queue" ? "Clear queue" : "Clear favorites");
  const playAll = node("button", "mini-button", "Play list");
  const mode = node("button", "mini-button", `${activeCollection(state).mode}`);
  const list = node("div", "queue-list");
  const collection = activeCollection(state);

  queueTab.type = "button";
  favTab.type = "button";
  queueTab.addEventListener("click", () => actions.switchList("queue"));
  favTab.addEventListener("click", () => actions.switchList("favorites"));
  tabs.append(queueTab, favTab);

  clear.type = "button";
  clear.disabled = !collection.tracks.length;
  clear.addEventListener("click", () => actions.clearActiveList());
  playAll.type = "button";
  playAll.disabled = !collection.tracks.length;
  playAll.addEventListener("click", () => actions.playFromActive(0));
  mode.type = "button";
  mode.addEventListener("click", () => actions.cycleMode());
  tools.append(playAll, mode, clear);

  if (!collection.tracks.length) {
    list.append(node("p", "empty-list", state.activeList === "queue" ? "Queue is empty." : "No favorites yet."));
  }

  collection.tracks.slice(0, 6).forEach((track, index) => {
    const item = node("article", index === collection.currentIndex ? "queue-item is-active" : "queue-item");
    const main = node("button", "queue-main");
    const title = node("strong", "", track.title);
    const meta = node("span", "", track.artist);
    const remove = node("button", "chip-button", "×");
    const favorite = node("button", "chip-button", state.favoriteKeys.has(trackKey(track)) ? "♥" : "♡");

    main.type = "button";
    main.append(title, meta);
    main.addEventListener("click", () => actions.playFromActive(index));
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${track.title}`);
    remove.addEventListener("click", () => actions.removeFromActive(index));
    favorite.type = "button";
    favorite.setAttribute("aria-label", `Favorite ${track.title}`);
    favorite.addEventListener("click", () => actions.toggleFavorite(track));
    item.append(main, favorite, remove);
    list.append(item);
  });

  panel.append(tabs, tools, list);
  return panel;
}

function LyricsPanel(song) {
  const panel = node("aside", "lyrics-panel");
  const header = node("div", "lyrics-header");
  const title = node("h2", "", "Lyrics");
  const expand = iconButton("expand", "Expand lyrics");
  const list = node("ol", "lyrics-list");

  const lines = song.lyrics?.length ? song.lyrics : [{ time: 0, text: "Search for a song to load lyrics." }];
  lines.forEach((line, index) => {
    const item = node("li", index === song.currentLyric ? "is-current" : "", line.text || line);
    item.dataset.lyricIndex = index;
    list.append(item);
  });

  header.append(title, expand);
  panel.append(header, list);
  return panel;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

function apiUrl(params) {
  const baseUrl = window.location.protocol === "file:" && API_BASE_URL.startsWith("/")
    ? DIRECT_API_BASE_URL
    : API_BASE_URL;
  const url = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function directApiUrl(params) {
  const url = new URL(DIRECT_API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function fetchMusicJson(params) {
  try {
    return await fetchJson(apiUrl(params));
  } catch (error) {
    if (API_BASE_URL !== DIRECT_API_BASE_URL) {
      return fetchJson(directApiUrl(params));
    }
    throw error;
  }
}

function parseArtist(value) {
  if (Array.isArray(value)) return value.join(" / ");
  return value || "Unknown Artist";
}

function preferHttps(url = "") {
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

function stripLrcTime(line) {
  return line.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function parseLrcTimestamp(value = "") {
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = Number(`0.${match[3] || "0"}`);
  return minutes * 60 + seconds + fraction;
}

function isLyricCreditLine(text = "") {
  return /^(lyrics|lyricist|composed|composer|produced|producer|arranged)\b/i.test(text)
    || /^(作词|作曲|编曲|制作|监制|演唱)/.test(text);
}

function parseTimedLrc(rawLyric = "") {
  return rawLyric
    .split(/\r?\n/)
    .flatMap((line) => {
      const timestampMatches = [...line.matchAll(/\[([^\]]+)\]/g)];
      const text = stripLrcTime(line).replace(/\[[^\]]+\]/g, "").trim();
      if (!timestampMatches.length || !text || isLyricCreditLine(text)) return [];

      return timestampMatches
        .map((match) => parseLrcTimestamp(match[1]))
        .filter((time) => time !== null)
        .map((time) => ({ time, text }));
    })
    .sort((a, b) => a.time - b.time);
}

function parseLyrics(rawLyric = "", translatedLyric = "") {
  const primary = parseTimedLrc(rawLyric);
  const translated = parseTimedLrc(translatedLyric);

  return translated.length ? translated : primary;
}

function normalizeApiTrack(item) {
  return {
    id: item.id,
    title: item.name || "Untitled Track",
    artist: parseArtist(item.artist),
    album: item.album || "Unknown Album",
    source: item.source || DEFAULT_SOURCE,
    picId: item.pic_id,
    lyricId: item.lyric_id || item.id,
    duration: 0,
    startAt: 0,
    coverTheme: "sunset-valley",
    src: "",
    lyrics: [],
    currentLyric: 0
  };
}

function normalizeFallbackTrack(song) {
  return {
    ...song,
    source: song.source || "demo",
    artist: Array.isArray(song.artist) ? song.artist.join(" / ") : song.artist,
    lyrics: (song.lyrics || []).map((line, index) => (
      typeof line === "string" ? { time: index * 12, text: line } : line
    )),
    currentLyric: song.currentLyric || 0
  };
}

function loadJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isSameTrack(left, right) {
  return trackKey(left) === trackKey(right);
}

function uniqueTracks(tracks) {
  const seen = new Set();
  return tracks.filter((track) => {
    const key = trackKey(track);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function activeCollection(state) {
  return state.activeList === "favorites" ? state.favorites : state.queue;
}

async function searchTracks(query, source, page = 1) {
  const data = await fetchMusicJson({
    types: "search",
    source,
    name: query,
    count: 12,
    pages: page
  });

  if (!Array.isArray(data) || !data.length) {
    throw new Error("No songs found");
  }

  return data.map(normalizeApiTrack);
}

async function enrichTrack(track) {
  if (!track || track.source === "demo") return track;
  const nextTrack = { ...track };

  const [urlData, picData, lyricData] = await Promise.allSettled([
    fetchMusicJson({ types: "url", source: track.source, id: track.id, br: 320 }),
    track.picId ? fetchMusicJson({ types: "pic", source: track.source, id: track.picId, size: 500 }) : Promise.resolve(null),
    track.lyricId ? fetchMusicJson({ types: "lyric", source: track.source, id: track.lyricId }) : Promise.resolve(null)
  ]);

  if (urlData.status === "fulfilled" && urlData.value?.url) {
    nextTrack.src = preferHttps(urlData.value.url);
  }

  if (picData.status === "fulfilled" && picData.value?.url) {
    nextTrack.coverUrl = preferHttps(picData.value.url);
  }

  if (lyricData.status === "fulfilled") {
    const lyrics = parseLyrics(lyricData.value?.lyric, lyricData.value?.tlyric);
    if (lyrics.length) {
      nextTrack.lyrics = lyrics;
      nextTrack.currentLyric = Math.min(4, lyrics.length - 1);
    }
  }

  return nextTrack;
}

function initPlayer() {
  const root = document.querySelector("[data-player-root]");
  if (!root) return;

  const playerAudio = new Audio();
  playerAudio.preload = "metadata";

  const fallbackTracks = songs.map(normalizeFallbackTrack);
  const savedQueue = sanitizeQueue(loadJson("harmonia.queue", {
    tracks: fallbackTracks.slice(0, 1),
    currentIndex: 0,
    playing: false,
    mode: "normal"
  }));
  const savedFavorites = sanitizeQueue(loadJson("harmonia.favorites", {
    tracks: [],
    currentIndex: -1,
    playing: false,
    mode: "normal"
  }));

  const state = {
    results: [],
    queue: savedQueue,
    favorites: savedFavorites,
    activeList: loadJson("harmonia.activeList", "queue"),
    progress: loadJson("harmonia.progress", { queue: {}, favorites: {} }),
    currentTime: 0,
    duration: 0,
    volume: 0.76,
    playing: false,
    repeat: false,
    query: DEFAULT_SEARCH,
    source: DEFAULT_SOURCE,
    page: 1,
    loading: false,
    statusText: "Ready",
    lyricScrollLocked: false,
    lyricUnlockTimer: null,
    favoriteKeys: new Set(savedFavorites.tracks.map(trackKey))
  };
  let progressComponent;
  let lastProgressPersist = 0;

  function persist() {
    state.queue = sanitizeQueue(state.queue);
    state.favorites = sanitizeQueue(state.favorites);
    state.favoriteKeys = new Set(state.favorites.tracks.map(trackKey));
    activeCollection(state).playing = state.playing;
    saveJson("harmonia.queue", state.queue);
    saveJson("harmonia.favorites", state.favorites);
    saveJson("harmonia.activeList", state.activeList);
    saveJson("harmonia.progress", state.progress);
  }

  function ensurePlayableState() {
    const collection = activeCollection(state);
    if (!collection.tracks.length) {
      playerAudio.pause();
      playerAudio.removeAttribute("src");
      state.playing = false;
      state.currentTime = 0;
      state.duration = 0;
    state.statusText = "List is empty";
      persist();
      return false;
    }

    return true;
  }

  function currentSong() {
    const collection = activeCollection(state);
    return collection.tracks[collection.currentIndex] || normalizeFallbackTrack(songs[0] || {
      title: "No track loaded",
      artist: "Harmonia",
      album: "Search to begin",
      lyrics: []
    });
  }

  function paintProgress() {
    if (!state.duration) return;
    root.style.setProperty("--hero-progress", `${(state.currentTime / state.duration) * 100}%`);
    progressComponent?.update();
  }

  function syncLyrics(time, shouldScroll = true) {
    const song = currentSong();
    const nextIndex = getLyricIndexForTime(song.lyrics, time);
    if (song.currentLyric === nextIndex) return;

    song.currentLyric = nextIndex;
    root.querySelectorAll(".lyrics-list li").forEach((item) => {
      item.classList.toggle("is-current", Number(item.dataset.lyricIndex) === nextIndex);
    });

    const activeLine = root.querySelector(`.lyrics-list li[data-lyric-index="${nextIndex}"]`);
    if (shouldScroll && activeLine && !state.lyricScrollLocked) {
      activeLine.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function rememberProgress() {
    const collection = activeCollection(state);
    const song = currentSong();
    const key = trackKey(song);
    if (!key || collection.currentIndex < 0) return;
    state.progress[state.activeList] = state.progress[state.activeList] || {};
    state.progress[state.activeList][key] = state.currentTime;
    persist();
  }

  async function loadTrack(index, keepPlaying = state.playing) {
    const collection = activeCollection(state);
    if (!collection.tracks.length) {
      ensurePlayableState();
      render();
      return;
    }

    rememberProgress();
    collection.currentIndex = (index + collection.tracks.length) % collection.tracks.length;
    const song = currentSong();
    const savedTime = state.progress[state.activeList]?.[trackKey(song)];
    state.currentTime = Number.isFinite(savedTime) ? savedTime : song.startAt || 0;
    state.duration = song.duration || 0;
    state.playing = keepPlaying;
    collection.playing = keepPlaying;
    state.statusText = "Loading song";
    persist();
    render();

    try {
      const enrichedTrack = await enrichTrack(song);
      collection.tracks[collection.currentIndex] = enrichedTrack;
      const playableSrc = enrichedTrack.src || demoTone(enrichedTrack.toneHz || 220);
      playerAudio.src = playableSrc;
      playerAudio.volume = state.volume;
      playerAudio.addEventListener("loadedmetadata", () => {
        if (state.currentTime > 0 && Number.isFinite(playerAudio.duration)) {
          playerAudio.currentTime = Math.min(state.currentTime, playerAudio.duration - 0.25);
        }
      }, { once: true });
      if (keepPlaying) {
        await playerAudio.play().catch(() => {
          state.playing = false;
          collection.playing = false;
          state.statusText = "Press play to start";
        });
      } else {
        playerAudio.pause();
      }
      if (state.statusText !== "Press play to start") {
        state.statusText = enrichedTrack.src ? "Ready to play" : "Demo tone";
      }
    } catch (error) {
      playerAudio.src = demoTone(song.toneHz || 220);
      if (keepPlaying) {
        playerAudio.play().catch(() => {});
      }
      state.statusText = "API fallback";
    }

    collection.tracks[collection.currentIndex].currentLyric = getLyricIndexForTime(collection.tracks[collection.currentIndex].lyrics, state.currentTime);
    persist();
    render();
  }

  async function runSearch(query = state.query, source = state.source, page = state.page) {
    if (!query) return;
    state.query = query;
    state.source = source;
    state.page = Math.max(1, page);
    state.loading = true;
    state.statusText = "Searching";
    render();

    try {
      state.results = await searchTracks(query, source, state.page);
      state.loading = false;
      state.statusText = `Found ${state.results.length} tracks`;
      render();
    } catch (error) {
      state.results = fallbackTracks;
      state.loading = false;
      state.statusText = "Using fallback songs";
      render();
    }
  }

  function addToQueue(track) {
    state.queue.tracks = uniqueTracks([...state.queue.tracks, track]);
    state.queue = sanitizeQueue(state.queue);
    persist();
    render();
  }

  function addManyToQueue(tracks) {
    state.queue.tracks = uniqueTracks([...state.queue.tracks, ...tracks]);
    state.queue = sanitizeQueue(state.queue);
    persist();
    render();
  }

  function toggleFavoriteTrack(track) {
    state.favorites.tracks = toggleFavorite(state.favorites.tracks, track);
    state.favorites = sanitizeQueue(state.favorites);
    persist();
    render();
  }

  function switchList(listName) {
    rememberProgress();
    state.activeList = listName;
    persist();
    loadTrack(activeCollection(state).currentIndex < 0 ? 0 : activeCollection(state).currentIndex, false);
  }

  function clearActiveList() {
    const collection = activeCollection(state);
    state.repeat = collection.mode === "repeat";
    collection.tracks = [];
    collection.currentIndex = -1;
    collection.playing = false;
    ensurePlayableState();
    persist();
    render();
  }

  function removeFromActive(index) {
    const collection = activeCollection(state);
    const removingCurrent = index === collection.currentIndex;
    collection.tracks.splice(index, 1);
    if (!collection.tracks.length) {
      collection.currentIndex = -1;
      ensurePlayableState();
    } else {
      collection.currentIndex = Math.min(collection.currentIndex, collection.tracks.length - 1);
      if (removingCurrent) loadTrack(collection.currentIndex, state.playing);
    }
    persist();
    render();
  }

  function cycleMode() {
    const collection = activeCollection(state);
    const modes = ["normal", "repeat", "shuffle"];
    collection.mode = modes[(modes.indexOf(collection.mode) + 1) % modes.length];
    state.repeat = collection.mode === "repeat";
    persist();
    render();
  }

  function playSearchResult(track) {
    addToQueue(track);
    state.activeList = "queue";
    state.queue.currentIndex = state.queue.tracks.findIndex((item) => isSameTrack(item, track));
    loadTrack(state.queue.currentIndex, true);
  }

  function nextIndex() {
    const collection = activeCollection(state);
    if (!collection.tracks.length) return -1;
    if (collection.mode === "shuffle") {
      return Math.floor(Math.random() * collection.tracks.length);
    }
    return (collection.currentIndex + 1) % collection.tracks.length;
  }

  function setupLyricManualLock() {
    const list = root.querySelector(".lyrics-list");
    if (!list) return;
    const lock = () => {
      if (!state.playing) return;
      state.lyricScrollLocked = true;
      window.clearTimeout(state.lyricUnlockTimer);
      state.lyricUnlockTimer = window.setTimeout(() => {
        state.lyricScrollLocked = false;
        root.querySelector(".lyrics-list .is-current")?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 3000);
    };
    list.addEventListener("wheel", lock, { passive: true });
    list.addEventListener("touchstart", lock, { passive: true });
  }

  function render() {
    const song = currentSong();
    root.replaceChildren();
    paintProgress();

    const menu = iconButton("menu", "Menu", "menu-button");
    const center = node("div", "player-center");
    progressComponent = ProgressBar(state, (time) => {
      state.currentTime = time;
      if (Number.isFinite(playerAudio.duration)) {
        playerAudio.currentTime = time;
      }
      paintProgress();
      syncLyrics(time, true);
    });

    center.append(
      SearchPanel(state, {
        search: runSearch,
        addToQueue,
        addManyToQueue,
        toggleFavorite: toggleFavoriteTrack,
        playSearchResult
      }),
      TrackInfo(song, state.statusText),
      progressComponent,
      PlaybackControls({
        previous: () => loadTrack(activeCollection(state).currentIndex - 1),
        next: () => loadTrack(nextIndex()),
        shuffle: () => loadTrack(Math.floor(Math.random() * activeCollection(state).tracks.length)),
        repeat: () => {
          cycleMode();
        },
        toggle: () => {
          if (!ensurePlayableState()) {
            render();
            return;
          }
          state.playing = !state.playing;
          activeCollection(state).playing = state.playing;
          if (state.playing) {
            playerAudio.play().catch(() => {});
          } else {
            playerAudio.pause();
            rememberProgress();
          }
          persist();
        },
        isPlaying: () => state.playing
      }),
      VolumeControl(state, (volume) => {
        playerAudio.volume = volume;
      }),
      LibraryPanel(state, {
        switchList,
        clearActiveList,
        playFromActive: (index) => loadTrack(index, true),
        removeFromActive,
        toggleFavorite: toggleFavoriteTrack,
        cycleMode
      })
    );

    root.append(menu, AlbumArt(song), center, LyricsPanel(song));
    setupLyricManualLock();
    window.requestAnimationFrame(() => {
      root.querySelector(".lyrics-list .is-current")?.scrollIntoView({ block: "center" });
    });
  }

  render();

  playerAudio.addEventListener("loadedmetadata", () => {
    state.duration = Number.isFinite(playerAudio.duration) ? playerAudio.duration : currentSong().duration || 0;
    paintProgress();
  });
  playerAudio.addEventListener("timeupdate", () => {
    state.currentTime = playerAudio.currentTime;
    paintProgress();
    syncLyrics(state.currentTime, true);
    const now = Date.now();
    if (now - lastProgressPersist > 2500) {
      rememberProgress();
      lastProgressPersist = now;
    }
  });
  playerAudio.addEventListener("ended", () => {
    if (state.repeat) {
      playerAudio.currentTime = 0;
      playerAudio.play().catch(() => {});
      return;
    }
    loadTrack(nextIndex(), true);
  });

  loadTrack(activeCollection(state).currentIndex < 0 ? 0 : activeCollection(state).currentIndex, false);
  runSearch(DEFAULT_SEARCH, DEFAULT_SOURCE);
}

if (page === "radio") initRadio();
if (page === "player") initPlayer();
