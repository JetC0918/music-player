# Harmonia

Harmonia is a responsive, cinematic music player webpage built with plain HTML, CSS, and JavaScript. The interface is designed to feel calm, premium, and immersive, with a soft gradient backdrop, compact album artwork, custom playback controls, and a frosted lyrics panel.

## Features

- Responsive music player layout for desktop, tablet, and mobile
- Compact premium console inspired by modern desktop music tools
- Generated placeholder album artwork
- Track title, artist, album, waveform, progress bar, timestamps, and volume control
- Frosted-glass lyrics panel with the current lyric highlighted
- Clean reusable JavaScript component functions:
  - `AlbumArt`
  - `TrackInfo`
  - `ProgressBar`
  - `PlaybackControls`
  - `VolumeControl`
  - `LyricsPanel`
- Placeholder song data structured so an API can be connected later

## Project Structure

```text
music-player/
  index.html
  player.html
  radio.html
  styles.css
  app.js
  songs.js
  README.md
```

## Run Locally

Open `player.html` directly in your browser, or serve the folder with a local static server:

```powershell
python -m http.server 4173
```

Then visit:

```text
http://localhost:4173/player.html
```

## Customize Songs

Edit `songs.js` to replace the placeholder tracks with your own music data.

```js
{
  title: "Your Song",
  artist: "Your Artist",
  album: "Your Album",
  src: "music/your-song.mp3",
  duration: 238,
  lyrics: ["First lyric line", "Second lyric line"],
  currentLyric: 0
}
```

If `src` is empty, the demo tone fallback keeps the UI functional for testing.

## Deploy

Harmonia is a static site, so it can be deployed to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static hosting provider.
