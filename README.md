# GlideVid

**Your video. Your gestures.**

GlideVid is an experimental, gesture-first Safari web extension focused on iPad video watching. It aims to provide a consistent overlay on supported HTML5 video websites, with AGE (`agedm.io`) as the first site to validate.

> **Prototype v0.1.0:** Source code and gesture-math unit tests exist, but Safari packaging, physical iPad testing, and AGE-specific compatibility have **not** been verified.

## Implemented in source

- Double-tap left/right for **−15s / +15s**.
- Long press for temporary **2×**, swipe while holding for **1.5× / 3×**, release to restore rate.
- Swipe horizontally over the video to seek, default **20s per 40px**.
- Playback speed **0.5×–3×**, playback position and speed memory in local extension storage.
- Custom overlay with play/pause, seek bar, lock, fullscreen/PiP attempts, and one-tap PNG frame export where CORS allows.
- Lightweight, dependency-free content script and extension preferences.

## Boundaries and limitations

- Supports accessible **HTML5 video**, not arbitrary encrypted playback systems. Embedded iframes require matching host permission; some sites cannot be controlled.
- Safari's **native** fullscreen player is not replaceable by a content script; overlay fullscreen only works where the HTML container supports it.
- Frame export is blocked when the video is cross-origin without appropriate CORS or protected by DRM.
- Site-specific features such as AGE automatic episode switching, quality selection, subtitles, animated GIF capture, and cross-device history sync are **not implemented yet**.
- Development builds do **not** automatically install across devices just because Safari's extension-sharing preference is enabled.

## Development

Requires Node.js 18+ for tests and a Mac with Xcode for iPad packaging.

```bash
npm test
npm run check

xcrun safari-web-extension-packager ./extension \
  --app-name "GlideVid" \
  --bundle-identifier "com.example.glidevid"
```

Replace the example bundle identifier with one unique to your Apple developer team. Open the generated project in Xcode, choose a signing team, then run the iOS/iPadOS target on a connected iPad. Enable the extension for Safari and grant access to the playback website *and* any third-party iframe player host.

See [中文快速开始](./快速开始.md) and [Safari test plan](docs/SAFARI-TEST-PLAN.md).

## Repository layout

- `extension/`: browser extension code, assets and manifest
- `tests/`: gesture math unit tests
- `demo/`: manual HTML5 test page
- `docs/`: Safari QA checklist
- `PRIVACY.md`: current local-storage and permission behavior

## Release plan

1. Validate iPad Safari on plain HTML5 video and fix pointer/touch issues.
2. Validate AGE page/iframe hosts and keep original player as fallback on unsupported lines.
3. Improve CORS-aware screenshots and save/share experience.
4. Add subtitle styling, PiP refinements, playlist/next-episode adapters, and other site profiles.

License and public-release terms have not yet been chosen. Keep the repository private while validating the prototype.
