const songs = Array.isArray(window.SONGS) ? window.SONGS : [];
const page = document.body.dataset.page;
const audio = document.querySelector("[data-audio]");
const titleNode = document.querySelector("[data-track-title]");
const metaNode = document.querySelector("[data-track-meta]");
const API_BASE_URL = window.HARMONIA_API_BASE_URL || "https://music-api.gdstudio.xyz/api.php";
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
  const playButton = document.querySelector("[data-radio-play]");
  const nextButton = document.querySelector("[data-radio-next]");
  const statusNode = document.querySelector("[data-radio-status]");
  const lampNode = document.querySelector("[data-radio-lamp]");

  function tuneRandom() {
    const song = randomSong();
    if (!song) return;

    setTrack(song, true);
    statusNode.textContent = "On air";
    lampNode.classList.add("is-live");
    playButton.textContent = "Restart Radio";
  }

  playButton.addEventListener("click", tuneRandom);
  nextButton.addEventListener("click", tuneRandom);
  audio.addEventListener("ended", tuneRandom);
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

function SearchPanel(state, onSearch, onSelect) {
  const panel = node("section", "api-search");
  const form = node("form", "search-form");
  const input = node("input", "search-input");
  const select = node("select", "source-select");
  const submit = node("button", "search-button", "Search");
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
    onSearch(input.value.trim(), select.value);
  });

  state.tracks.slice(0, 4).forEach((track, index) => {
    const button = node("button", index === state.trackIndex ? "api-result is-active" : "api-result");
    const title = node("strong", "", track.title);
    const artist = node("span", "", track.artist);

    button.type = "button";
    button.append(title, artist);
    button.addEventListener("click", () => onSelect(index, true));
    resultList.append(button);
  });

  panel.append(form, resultList);
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
  const url = new URL(API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
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
  return /^(lyrics|lyricist|composed|composer|produced|producer|arranged|作词|作曲|编曲|制作|监制|演唱)\b/i.test(text);
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

async function searchTracks(query, source) {
  const data = await fetchJson(apiUrl({
    types: "search",
    source,
    name: query,
    count: 12,
    pages: 1
  }));

  if (!Array.isArray(data) || !data.length) {
    throw new Error("No songs found");
  }

  return data.map(normalizeApiTrack);
}

async function enrichTrack(track) {
  if (!track || track.source === "demo") return track;
  const nextTrack = { ...track };

  const [urlData, picData, lyricData] = await Promise.allSettled([
    fetchJson(apiUrl({ types: "url", source: track.source, id: track.id, br: 320 })),
    track.picId ? fetchJson(apiUrl({ types: "pic", source: track.source, id: track.picId, size: 500 })) : Promise.resolve(null),
    track.lyricId ? fetchJson(apiUrl({ types: "lyric", source: track.source, id: track.lyricId })) : Promise.resolve(null)
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

  const state = {
    tracks: songs.map(normalizeFallbackTrack),
    trackIndex: 0,
    currentTime: songs[0]?.startAt || 0,
    duration: songs[0]?.duration || 0,
    volume: 0.76,
    playing: false,
    repeat: false,
    query: DEFAULT_SEARCH,
    source: DEFAULT_SOURCE,
    loading: false,
    statusText: "Ready"
  };
  let progressComponent;

  function currentSong() {
    return state.tracks[state.trackIndex] || normalizeFallbackTrack(songs[0] || {
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

  function lyricIndexForTime(song, time) {
    if (!song.lyrics?.length) return 0;

    let activeIndex = 0;
    for (let index = 0; index < song.lyrics.length; index++) {
      if ((song.lyrics[index].time || 0) <= time + 0.25) {
        activeIndex = index;
      } else {
        break;
      }
    }

    return activeIndex;
  }

  function syncLyrics(time, shouldScroll = true) {
    const song = currentSong();
    const nextIndex = lyricIndexForTime(song, time);
    if (song.currentLyric === nextIndex) return;

    song.currentLyric = nextIndex;
    root.querySelectorAll(".lyrics-list li").forEach((item) => {
      item.classList.toggle("is-current", Number(item.dataset.lyricIndex) === nextIndex);
    });

    const activeLine = root.querySelector(`.lyrics-list li[data-lyric-index="${nextIndex}"]`);
    if (shouldScroll && activeLine) {
      activeLine.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  async function loadTrack(index, keepPlaying = state.playing) {
    if (!state.tracks.length) return;
    state.trackIndex = (index + state.tracks.length) % state.tracks.length;
    const song = currentSong();
    state.currentTime = song.startAt || 0;
    state.duration = song.duration || 0;
    state.playing = keepPlaying;
    state.statusText = "Loading song";
    render();

    try {
      const enrichedTrack = await enrichTrack(song);
      state.tracks[state.trackIndex] = enrichedTrack;
      const playableSrc = enrichedTrack.src || demoTone(enrichedTrack.toneHz || 220);
      playerAudio.src = playableSrc;
      playerAudio.volume = state.volume;
      if (keepPlaying) {
        await playerAudio.play().catch(() => {
          state.playing = false;
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

    state.tracks[state.trackIndex].currentLyric = lyricIndexForTime(state.tracks[state.trackIndex], state.currentTime);
    render();
  }

  async function runSearch(query = state.query, source = state.source) {
    if (!query) return;
    state.query = query;
    state.source = source;
    state.loading = true;
    state.statusText = "Searching";
    render();

    try {
      state.tracks = await searchTracks(query, source);
      state.loading = false;
      await loadTrack(0, false);
    } catch (error) {
      state.tracks = songs.map(normalizeFallbackTrack);
      state.loading = false;
      state.trackIndex = 0;
      state.statusText = "Using fallback songs";
      render();
    }
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
      SearchPanel(state, runSearch, loadTrack),
      TrackInfo(song, state.statusText),
      progressComponent,
      PlaybackControls({
        previous: () => loadTrack(state.trackIndex - 1),
        next: () => loadTrack(state.trackIndex + 1),
        shuffle: () => loadTrack(Math.floor(Math.random() * state.tracks.length)),
        repeat: () => {
          state.repeat = !state.repeat;
          root.classList.toggle("is-repeat", state.repeat);
        },
        toggle: () => {
          state.playing = !state.playing;
          if (state.playing) {
            playerAudio.play().catch(() => {});
          } else {
            playerAudio.pause();
          }
        },
        isPlaying: () => state.playing
      }),
      VolumeControl(state, (volume) => {
        playerAudio.volume = volume;
      })
    );

    root.append(menu, AlbumArt(song), center, LyricsPanel(song));
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
  });
  playerAudio.addEventListener("ended", () => {
    if (state.repeat) {
      playerAudio.currentTime = 0;
      playerAudio.play().catch(() => {});
      return;
    }
    loadTrack(state.trackIndex + 1, true);
  });

  runSearch(DEFAULT_SEARCH, DEFAULT_SOURCE);
}

if (page === "radio") initRadio();
if (page === "player") initPlayer();
