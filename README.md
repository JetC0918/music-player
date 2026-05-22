# Harmonia

Harmonia is a responsive, cinematic music player webpage built with plain HTML, CSS, and JavaScript. The interface is designed to feel calm, premium, and immersive, with a soft gradient backdrop, compact album artwork, custom playback controls, and a frosted lyrics panel.

## Features

- Responsive music player layout for desktop, tablet, and mobile
- Compact premium console inspired by modern desktop music tools
- Generated placeholder album artwork
- Track title, artist, album, waveform, progress bar, timestamps, and volume control
- Frosted-glass lyrics panel with the current lyric highlighted
- Live song search through the GD Studio music API
- API-powered audio URLs, album covers, and timestamped LRC lyrics
- Dynamic lyric highlighting that follows playback and seeking
- Clean reusable JavaScript component functions:
  - `AlbumArt`
  - `TrackInfo`
  - `ProgressBar`
  - `PlaybackControls`
  - `VolumeControl`
  - `LyricsPanel`
- Placeholder song data kept as a fallback if the API is unavailable

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

Harmonia uses the GD Studio API by default:

```text
https://music-api.gdstudio.xyz/api.php
```

The player calls:

- `types=search` to find songs
- `types=url` to get a playable audio URL
- `types=pic` to load album artwork
- `types=lyric` to load LRC lyrics

The API documentation notes a dynamic request limit of about 50 requests per 5 minutes, so avoid aggressive polling.

The default search source is `kuwo` because it returned valid results during testing. The app exposes a config hook if you later need to route requests through your own proxy:

```html
<script>
  window.HARMONIA_API_BASE_URL = "https://your-proxy.example.com/api.php";
</script>
```

Place that script before `app.js` in `player.html`. A proxy may be needed on static hosts if the API blocks direct browser requests with CORS.

You can still edit `songs.js` to change the fallback tracks shown when the API is unavailable.

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
