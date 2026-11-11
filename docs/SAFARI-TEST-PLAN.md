# GlideVid Safari QA checklist (manual)

**Current status:** Not yet tested on physical iPad. This document is a checklist, not a claim of compatibility.

## Baseline smoke test

- [ ] Build the Safari extension wrapper using Xcode on a compatible Mac.
- [ ] Enable extension + website permissions in iPad Safari.
- [ ] Open the demo and identify an ordinary HTML5 video.
- [ ] Double tap left/right; verify ±15 seconds.
- [ ] Hold for 350 ms; verify temporary 2×; swipe left/right while holding; release returns to original rate.
- [ ] Swipe horizontally from anywhere on video; verify seek without tapping bottom progress bar.
- [ ] Select speed; reload page; verify speed persisted.
- [ ] Seek to midpoint; reload page; verify progress persisted.
- [ ] Tap camera; verify PNG is available only when CORS permits; check no false success on protected sources.
- [ ] Try fullscreen and PiP; record fallback behavior.
- [ ] Disable extension; verify original controls are restored.

## AGE website test

Target: https://www.agedm.io/play/20260298/1/1

- [ ] Document page player type, iframe origin(s), and video element access.
- [ ] Confirm website host permission as well as permission for iframe playback origin.
- [ ] Verify custom controls do not overlap site-specific selection/navigation.
- [ ] Verify screenshots (or clear CORS warning).
- [ ] Test changing episode and changing playback line.
- [ ] Record original playback behavior when the extension cannot attach.

### Test record

- iPad model/iPadOS:
- Safari version:
- Xcode version:
- AGE line and embed host:
- Results / bugs:

## Scope guardrails

No DRM circumvention. Cross-origin restrictions are respected. Native system fullscreen chrome cannot be replaced by a content script.
