const songs = Array.isArray(window.SONGS) ? window.SONGS : [];
const page = document.body.dataset.page;
const audio = document.querySelector("[data-audio]");
const titleNode = document.querySelector("[data-track-title]");
const metaNode = document.querySelector("[data-track-meta]");

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

function TrackInfo(song) {
  const wrap = node("section", "track-info");
  wrap.innerHTML = `
    <p class="track-kicker">Now playing</p>
    <h1>${song.title}</h1>
    <p class="artist">${song.artist}</p>
    <p class="album">${song.album}</p>
    <div class="waveform" aria-hidden="true">
      ${Array.from({ length: 58 }, (_, index) => {
        const height = 18 + Math.round(Math.abs(Math.sin(index * 0.61)) * 34);
        return `<span style="--bar-height:${height}px"></span>`;
      }).join("")}
    </div>
  `;
  return wrap;
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
  times.innerHTML = `<span data-current-time>${formatTime(state.currentTime)}</span><span>${formatTime(state.duration)}</span>`;
  wrap.append(bar, times);

  function paint() {
    const percent = state.duration ? (state.currentTime / state.duration) * 100 : 0;
    wrap.style.setProperty("--progress", `${Math.min(percent, 100)}%`);
    times.querySelector("[data-current-time]").textContent = formatTime(state.currentTime);
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
  const play = iconButton("pause", "Pause", "play-button");
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

function VolumeControl(state) {
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

  song.lyrics.forEach((line, index) => {
    const item = node("li", index === song.currentLyric ? "is-current" : "", line);
    list.append(item);
  });

  header.append(title, expand);
  panel.append(header, list);
  return panel;
}

function initPlayer() {
  const root = document.querySelector("[data-player-root]");
  if (!root) return;

  const state = {
    trackIndex: 0,
    currentTime: songs[0]?.startAt || 0,
    duration: songs[0]?.duration || 0,
    volume: 0.76,
    playing: true,
    repeat: false
  };
  let progressComponent;

  function currentSong() {
    return songs[state.trackIndex] || songs[0];
  }

  function paintProgress() {
    if (!state.duration) return;
    root.style.setProperty("--hero-progress", `${(state.currentTime / state.duration) * 100}%`);
    progressComponent?.update();
  }

  function loadTrack(index, keepPlaying = state.playing) {
    state.trackIndex = (index + songs.length) % songs.length;
    const song = currentSong();
    state.currentTime = song.startAt || 0;
    state.duration = song.duration || 0;
    state.playing = keepPlaying;
    render();
  }

  function render() {
    const song = currentSong();
    root.replaceChildren();
    paintProgress();

    const menu = iconButton("menu", "Menu", "menu-button");
    const center = node("div", "player-center");
    progressComponent = ProgressBar(state, (time) => {
      state.currentTime = time;
      paintProgress();
    });

    center.append(
      TrackInfo(song),
      progressComponent,
      PlaybackControls({
        previous: () => loadTrack(state.trackIndex - 1),
        next: () => loadTrack(state.trackIndex + 1),
        shuffle: () => loadTrack(Math.floor(Math.random() * songs.length)),
        repeat: () => {
          state.repeat = !state.repeat;
          root.classList.toggle("is-repeat", state.repeat);
        },
        toggle: () => {
          state.playing = !state.playing;
        },
        isPlaying: () => state.playing
      }),
      VolumeControl(state)
    );

    root.append(menu, AlbumArt(song), center, LyricsPanel(song));
  }

  render();
  window.setInterval(() => {
    if (!state.playing || !state.duration) return;
    state.currentTime += 1;
    if (state.currentTime >= state.duration) {
      if (state.repeat) {
        state.currentTime = 0;
      } else {
        loadTrack(state.trackIndex + 1, true);
        return;
      }
    }
    paintProgress();
  }, 1000);
}

if (page === "radio") initRadio();
if (page === "player") initPlayer();
