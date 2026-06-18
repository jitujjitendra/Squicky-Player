# Squicky Player

Squicky Player is a privacy-first media player foundation for local files and modern browser streaming. It is designed as a reusable SDK first, with a premium Web Component UI and a separate demo application.

The original single-file prototype is preserved at `legacy/standalone-index.html`.

## Current Foundation

- Framework-free TypeScript core
- Native progressive video and audio
- HLS playback through native HLS or `hls.js`
- MPEG-DASH playback through `dash.js`
- Adaptive quality API
- HLS, DASH and browser-native multi-audio track selection
- Typed events and immutable player snapshots
- Plugin lifecycle
- Consent-based local resume plugin
- SRT and WebVTT subtitle importing and track selection
- Chapter markers, chapter selection and chapter navigation
- Media Session controls for supported operating systems and devices
- Capability and codec diagnostics
- Shadow DOM Web Component
- Keyboard, mouse and touch controls
- Fullscreen and Picture-in-Picture
- Timeline preview, buffered progress and captions
- WebVTT image and sprite thumbnail previews
- Capability-driven Remote Playback and AirPlay controls
- Responsive mobile, desktop and large-screen UI
- Separate demo application
- Self-contained `dist-standalone/index.html` for direct local opening
- Self-hosted WordPress plugin scaffold with shortcode and dynamic block
- Production build, declarations and automated tests

## Development

```bash
npm install
npm run dev
```

The demo runs at `http://127.0.0.1:5173`.

## Quality Gates

```bash
npm run check
```

This runs strict TypeScript validation, unit tests, the SDK library build and the demo build.

## SDK Usage

### Web Component

```html
<script type="module">
  import { defineSquickyPlayer } from "/assets/squicky-player.js";
  defineSquickyPlayer();
</script>

<squicky-player
  src="https://cdn.example.com/movie/master.m3u8"
  media-title="Example movie"
  poster="/poster.jpg">
</squicky-player>
```

Add `thumbnails="/previews/movie.vtt"` when the source has a WebVTT thumbnail track.

### Headless Core

```ts
import { ResumePlugin, SquickyPlayer } from "@squicky/player";

const media = document.querySelector("video");
const player = new SquickyPlayer({
  media,
  plugins: [new ResumePlugin()]
});

await player.load({
  src: "https://cdn.example.com/manifest.mpd",
  title: "Example stream",
  tracks: [{
    src: "/captions/en.vtt",
    label: "English",
    srclang: "en",
    default: true
  }],
  chapters: [
    { id: "intro", title: "Introduction", start: 0 },
    { id: "topic", title: "Main topic", start: 90 }
  ],
  thumbnails: {
    src: "/previews/movie.vtt",
    label: "Timeline previews"
  }
});

player.on("audiotrackschange", (tracks) => {
  console.log("Available audio tracks", tracks);
});
```

The Web Component also exposes `loadSubtitleFile(file)` for local `.srt` and `.vtt` files. SRT content is converted to WebVTT in browser memory and is never uploaded.

Remote Playback and AirPlay buttons are rendered only when the active browser exposes the corresponding API. Remote Playback additionally waits for device availability before showing its control.

## Browser Codec Boundary

HLS and DASH solve adaptive delivery, not arbitrary codec decoding. Browsers still need compatible encoded media. MP4 with H.264/AAC and WebM with VP9/Opus provide the broadest practical coverage.

AVI, many MKV combinations, DTS, AC-3, ProRes and some HEVC files require pre-processing or a separate FFmpeg-backed media service/desktop runtime.

## Architecture

See:

- [Architecture](docs/architecture.md)
- [WordPress integration](docs/wordpress-integration.md)
- [Product roadmap](docs/roadmap.md)

## License

MIT
