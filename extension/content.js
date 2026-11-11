/* GlideVid v0.1 – intentionally dependency-free and isolated from page code. */
(() => {
  'use strict';
  if (globalThis.__glideVidInjected) return;
  globalThis.__glideVidInjected = true;

  const M = globalThis.GlideVidMath;
  const DEFAULTS = Object.freeze({
    enabled: true,
    doubleTapSeconds: 15,
    seekSecondsPer40px: 20,
    holdSpeed: 2,
    rightSpeed: 3,
    leftSpeed: 1.5,
    rememberSpeed: true,
    rememberProgress: true,
    showCamera: true,
    autoHideMs: 3500
  });
  const CONFIG_KEY = 'tv.config';
  const PROGRESS_KEY = 'tv.progress';
  const SPEED_KEY = 'tv.speeds';
  const MAX_HISTORY = 100;
  const api = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  const storage = api?.storage?.local;
  const icons = {
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    back: '<path d="m11 8-4 4 4 4M18 8l-4 4 4 4"/>',
    next: '<path d="m13 8 4 4-4 4M6 8l4 4-4 4"/>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4V7Z"/><circle cx="12" cy="13" r="3.5"/>',
    fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    pip: '<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="11" y="11" width="8" height="6" rx="1"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>'
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true">${icons[name] || ''}</svg>`;
  const read = async (keys) => {
    if (!storage) return {};
    try {
      const result = storage.get(keys);
      if (result && typeof result.then === 'function') return await result;
    } catch (_) {}
    return await new Promise(resolve => {
      try { storage.get(keys, result => resolve(result || {})); } catch (_) { resolve({}); }
    });
  };
  const write = async (data) => {
    if (!storage) return;
    try {
      const result = storage.set(data);
      if (result?.then) await result;
    } catch (_) {}
  };
  let config = { ...DEFAULTS };
  let controller = null;
  let rescanTimer = 0;
  let scanInterval = 0;
  const isVisible = (video) => {
    if (!video?.isConnected) return false;
    const r = video.getBoundingClientRect();
    const css = getComputedStyle(video);
    return r.width >= 240 && r.height >= 135 && css.display !== 'none' && css.visibility !== 'hidden';
  };
  const pickVideo = () => {
    let best = null, area = 0;
    for (const video of document.querySelectorAll('video')) {
      if (!isVisible(video)) continue;
      const r = video.getBoundingClientRect();
      if (r.width * r.height > area) { area = r.width * r.height; best = video; }
    }
    return best;
  };
  const scheduleScan = () => {
    if (rescanTimer) return;
    rescanTimer = setTimeout(() => { rescanTimer = 0; scan(); }, 450);
  };
  function scan() {
    if (!config.enabled) { if (controller) { controller.destroy(); controller = null; } return; }
    const video = pickVideo();
    if (controller && (!video || controller.video !== video)) {
      controller.destroy(); controller = null;
    }
    if (video && !controller) controller = new VideoController(video);
    controller?.align();
  }
  class VideoController {
    constructor(video) {
      this.video = video;
      this.parent = video.parentElement;
      this.previousControls = video.controls;
      this.previousPosition = this.parent.style.position;
      this.previousInline = video.getAttribute('playsinline');
      this.holdActive = false;
      this.locked = false;
      this.isVisible = true;
      this.saveAt = 0;
      this.lastRate = video.playbackRate || 1;
      this.lastPage = location.origin + location.pathname + location.search;
      this.pointer = null;
      this.hideTimer = 0;
      this.holdTimer = 0;
      this.tapTimer = 0;
      this.lastTap = null;
      this.pendingTarget = null;
      this.originalRate = null;
      this.cleanup = [];
      this.initUI();
      this.bindVideo();
      this.loadSaved();
      this.align();
      this.showControls();
    }
    on(el, type, handler, opts) {
      el.addEventListener(type, handler, opts);
      this.cleanup.push(() => el.removeEventListener(type, handler, opts));
    }
    initUI() {
      const style = getComputedStyle(this.parent);
      if (style.position === 'static') this.parent.style.position = 'relative';
      this.video.controls = false;
      this.video.setAttribute('playsinline', '');
      this.host = document.createElement('div');
      this.host.dataset.glideVid = 'true';
      this.host.style.cssText = 'position:absolute;z-index:2147483646;pointer-events:none;box-sizing:border-box;';
      this.shadow = this.host.attachShadow({mode:'closed'});
      this.shadow.innerHTML = `<style>
        :host{font:14px -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
        *{box-sizing:border-box}button,input{font:inherit}
        .layer{position:relative;width:100%;height:100%;isolation:isolate;overflow:hidden}
        .gesture{position:absolute;inset:0;touch-action:pan-y;pointer-events:auto;-webkit-tap-highlight-color:transparent}
        .controls{position:absolute;inset:0;pointer-events:none;opacity:1;transition:opacity .2s ease}
        .controls.hidden{opacity:0;visibility:hidden}
        .scrim{position:absolute;bottom:0;left:0;right:0;height:112px;background:linear-gradient(transparent,rgba(0,0,0,.8));pointer-events:none}
        .bottom{position:absolute;bottom:3px;left:7px;right:7px;pointer-events:auto;display:flex;flex-direction:column;gap:7px;}
        .track{display:flex;align-items:center;gap:8px;font-size:11px;font-variant-numeric:tabular-nums}
        .track span{white-space:nowrap;text-shadow:0 1px 3px #000}
        .seek{flex:1;width:10px;height:16px;accent-color:#fff;cursor:pointer;background:none;touch-action:none}
        .actions{display:flex;align-items:center;gap:4px;justify-content:space-between}
        .group{display:flex;align-items:center;gap:4px}
        .btn{pointer-events:auto;border:0;border-radius:7px;padding:7px;background:transparent;color:#fff;min-width:33px;min-height:32px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-shadow:0 1px 3px #000}
        .btn svg{width:20px;height:20px}.btn:active{background:rgba(255,255,255,.26)}
        .speed{font-size:13px;font-weight:700;min-width:47px}
        .side{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px;pointer-events:auto}
        .round{border:0;min-width:37px;min-height:37px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.55);color:#fff;pointer-events:auto}
        .round svg{width:19px;height:19px}
        .hint{position:absolute;top:43%;left:50%;transform:translate(-50%,-50%);font-size:15px;font-weight:700;padding:9px 14px;background:rgba(0,0,0,.74);border-radius:12px;max-width:85%;text-align:center;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s}
        .hint.shown{opacity:1}
        .unlock{position:absolute;right:8px;top:8px;display:none;pointer-events:auto}
        .locked .unlock{display:grid}
        .locked .controls{display:none}
        @media(max-width:460px){.btn{min-width:29px;padding:5px}.btn svg{width:18px;height:18px}.side{right:3px}.round{min-width:32px;min-height:32px}.speed{min-width:40px}}
      </style>
      <div class="layer">
        <div class="gesture" aria-label="Video gesture area"></div>
        <div class="controls">
          <div class="scrim"></div>
          <div class="side"><button class="round" data-act="camera" title="Screenshot" aria-label="Save video frame">${svg('camera')}</button></div>
          <div class="bottom">
            <div class="track"><span data-time="current">0:00</span><input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek video"><span data-time="duration">0:00</span></div>
            <div class="actions">
              <div class="group"><button class="btn" data-act="back" title="Back 15 seconds">${svg('back')}</button><button class="btn" data-act="play" title="Play / Pause">${svg('play')}</button><button class="btn" data-act="next" title="Forward 15 seconds">${svg('next')}</button></div>
              <div class="group"><button class="btn speed" data-act="speed" title="Change playback speed">1×</button><button class="btn" data-act="pip" title="Picture in Picture">${svg('pip')}</button><button class="btn" data-act="full" title="Fullscreen">${svg('fullscreen')}</button><button class="btn" data-act="lock" title="Lock gestures">${svg('lock')}</button></div>
            </div>
          </div>
        </div>
        <button class="round unlock" title="Unlock" aria-label="Unlock video controls" data-act="unlock">${svg('unlock')}</button>
        <div class="hint" role="status" aria-live="polite"></div>
      </div>`;
      this.parent.append(this.host);
      this.$ = (s) => this.shadow.querySelector(s);
      this.layer = this.$('.layer');
      this.surface = this.$('.gesture');
      this.controls = this.$('.controls');
      this.hint = this.$('.hint');
      this.seek = this.$('.seek');
      this.on(this.shadow, 'click', e => {
        const button = e.target.closest?.('[data-act]');
        if (!button) return;
        e.stopPropagation();
        this.action(button.dataset.act);
        this.showControls();
      });
      this.on(this.seek, 'pointerdown', e => { e.stopPropagation(); this.scrubbing = true; });
      this.on(this.seek, 'input', e => {
        const max = this.video.duration;
        if (Number.isFinite(max) && max > 0) {
          this.pendingTarget = max * Number(e.target.value) / 1000;
          this.$('[data-time="current"]').textContent = M.formatTime(this.pendingTarget);
        }
      });
      this.on(this.seek, 'change', () => {
        if (this.pendingTarget !== null) this.video.currentTime = this.pendingTarget;
        this.pendingTarget = null; this.scrubbing = false; this.showControls();
      });
      this.on(this.surface, 'pointerdown', e => this.pointerDown(e));
      this.on(this.surface, 'pointermove', e => this.pointerMove(e));
      this.on(this.surface, 'pointerup', e => this.pointerUp(e));
      this.on(this.surface, 'pointercancel', () => this.cancelPointer());
      this.on(document, 'fullscreenchange', () => this.align());
      this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.align()) : null;
      this.resizeObserver?.observe(this.video);
      this.resizeObserver?.observe(this.parent);
      this.on(window, 'resize', () => this.align(), {passive:true});
      this.on(window, 'scroll', () => this.align(), {passive:true});
    }
    bindVideo() {
      this.on(this.video, 'timeupdate', () => { this.updateUI(); this.persistProgress(); });
      this.on(this.video, 'loadedmetadata', () => { this.updateUI(); this.restorePosition(); });
      this.on(this.video, 'durationchange', () => this.updateUI());
      this.on(this.video, 'play', () => { this.updateUI(); this.showControls(); });
      this.on(this.video, 'pause', () => { this.updateUI(); this.showControls(); this.persistProgress(true); });
      this.on(this.video, 'ended', () => { this.persistProgress(true, true); this.showControls(); });
      this.on(this.video, 'ratechange', () => {
        if (!this.holdActive && Date.now() > (this.rateSaveSuspendedUntil || 0) && config.rememberSpeed) { this.lastRate = this.video.playbackRate; this.persistSpeed(); }
        this.updateUI();
      });
      this.on(window, 'pagehide', () => this.persistProgress(true));
      this.updateUI();
    }
    async loadSaved() {
      const result = await read([PROGRESS_KEY, SPEED_KEY]);
      if (this.video !== controller?.video && controller !== null) return;
      this.progressRecords = result[PROGRESS_KEY] || {};
      this.speedRecords = result[SPEED_KEY] || {};
      const savedSpeed = this.speedRecords[location.hostname];
      if (config.rememberSpeed && typeof savedSpeed === 'number' && savedSpeed >= .5 && savedSpeed <= 3) {
        this.video.playbackRate = savedSpeed;
        this.lastRate = savedSpeed;
      }
      this.restorePosition();
      this.updateUI();
    }
    restorePosition() {
      if (!config.rememberProgress || this.didRestore) return;
      const entry = this.progressRecords?.[this.lastPage];
      const duration = this.video.duration;
      if (!entry || !Number.isFinite(duration) || duration <= 0) return;
      this.didRestore = true;
      if (entry.time > 10 && entry.time < duration - 15) {
        try { this.video.currentTime = entry.time; this.flash(`Resumed at ${M.formatTime(entry.time)}`, 1700); } catch (_) {}
      }
    }
    async persistSpeed() {
      const rates = {...(this.speedRecords || {})};
      rates[location.hostname] = this.lastRate;
      this.speedRecords = rates;
      await write({[SPEED_KEY]: rates});
    }
    async persistProgress(force=false, ended=false) {
      if (!config.rememberProgress) return;
      const now = Date.now();
      if (!force && now-this.saveAt < 5000) return;
      const t = this.video.currentTime;
      if (!Number.isFinite(t) || this.video.readyState < 1) return;
      this.saveAt = now;
      const items = {...(this.progressRecords || {})};
      items[this.lastPage] = {time: ended ? 0 : t, updatedAt: now};
      const entries = Object.entries(items).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0, MAX_HISTORY);
      this.progressRecords = Object.fromEntries(entries);
      await write({[PROGRESS_KEY]: this.progressRecords});
    }
    align() {
      if (!this.host?.isConnected || !this.video.isConnected) return;
      const a = this.video.getBoundingClientRect();
      const b = this.parent.getBoundingClientRect();
      this.host.style.left = `${a.left-b.left+this.parent.scrollLeft}px`;
      this.host.style.top = `${a.top-b.top+this.parent.scrollTop}px`;
      this.host.style.width = `${a.width}px`;
      this.host.style.height = `${a.height}px`;
    }
    updateUI() {
      if (!this.seek || !this.video) return;
      this.$('[data-act="play"]').innerHTML = svg(this.video.paused ? 'play' : 'pause');
      this.$('[data-act="speed"]').textContent = `${this.video.playbackRate.toFixed(2).replace(/\.00$/,'').replace(/0$/,'')}×`;
      const duration = this.video.duration;
      this.$('[data-time="duration"]').textContent = M.formatTime(duration);
      if (this.pendingTarget === null) this.$('[data-time="current"]').textContent = M.formatTime(this.video.currentTime);
      this.seek.disabled = !Number.isFinite(duration) || duration <= 0;
      if (this.pendingTarget === null && !this.scrubbing && Number.isFinite(duration) && duration > 0) {
        this.seek.value = String(Math.round(this.video.currentTime / duration * 1000));
      }
      this.$('[data-act="back"]').title = `Back ${config.doubleTapSeconds} seconds`;
      this.$('[data-act="next"]').title = `Forward ${config.doubleTapSeconds} seconds`;
      this.$('.side').style.display = config.showCamera ? 'flex' : 'none';
    }
    showControls() {
      if (this.locked) return;
      this.controls.classList.remove('hidden');
      clearTimeout(this.hideTimer);
      if (!this.video.paused && !this.holdActive) {
        this.hideTimer = setTimeout(() => this.controls?.classList.add('hidden'), config.autoHideMs);
      }
    }
    flash(message, ms=850) {
      if (!this.hint) return;
      this.hint.textContent = message;
      this.hint.classList.add('shown');
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => this.hint?.classList.remove('shown'), ms);
    }
    async action(kind) {
      try {
        switch(kind) {
          case 'play': this.video.paused ? await this.video.play() : this.video.pause(); break;
          case 'back': this.jump(-config.doubleTapSeconds); break;
          case 'next': this.jump(config.doubleTapSeconds); break;
          case 'camera': this.screenshot(); break;
          case 'speed': {
            const values = [.5,.75,1,1.25,1.5,1.75,2,2.5,3];
            const index = values.findIndex(n => n > this.video.playbackRate + .001);
            this.video.playbackRate = index === -1 ? values[0] : values[index];
            this.flash(`Speed ${this.video.playbackRate}×`); break;
          }
          case 'full': {
            if (document.fullscreenElement) { await document.exitFullscreen(); break; }
            if (this.parent.requestFullscreen) { await this.parent.requestFullscreen(); this.align(); }
            else if (this.video.webkitEnterFullscreen) this.video.webkitEnterFullscreen();
            else this.flash('Fullscreen unavailable');
            break;
          }
          case 'pip': {
            if (this.video.webkitSupportsPresentationMode?.('picture-in-picture')) {
              const target = this.video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
              this.video.webkitSetPresentationMode(target);
            } else if (document.pictureInPictureElement) await document.exitPictureInPicture();
            else if (this.video.requestPictureInPicture) await this.video.requestPictureInPicture();
            else this.flash('PiP not supported');
            break;
          }
          case 'lock': this.locked = true; this.layer.classList.add('locked'); this.flash('Controls locked'); break;
          case 'unlock': this.locked = false; this.layer.classList.remove('locked'); this.showControls(); break;
        }
      } catch (err) { this.flash(err?.message?.slice(0,65) || 'Action unavailable', 1800); }
      this.updateUI();
    }
    jump(delta) {
      try {
        this.video.currentTime = M.targetTime(this.video.currentTime, this.video.duration, delta);
        this.flash(`${delta > 0 ? '+' : ''}${delta}s`, 900);
      } catch (_) { this.flash('Seeking unavailable'); }
    }
    screenshot() {
      try {
        if (!this.video.videoWidth || !this.video.videoHeight) throw new Error('Video frame not ready');
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth; canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d', {willReadFrequently:false});
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `video-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
        this.shadow.append(a);
        a.click(); a.remove();
        this.flash('Frame export requested — check Downloads', 1600);
      } catch (err) {
        // Cross-origin or DRM frames must NOT be bypassed; report limitation.
        this.flash(err?.name === 'SecurityError' ? 'Video source blocks screenshots (CORS)' : (err?.message || 'Screenshot unavailable'), 2200);
      }
    }
    pointerDown(e) {
      if (this.locked || e.button !== 0 || this.pointer) return;
      if (!e.isPrimary) return;
      const rect = this.surface.getBoundingClientRect();
      this.pointer = {id:e.pointerId,x:e.clientX,y:e.clientY,t:Date.now(),half:e.clientX < rect.left+rect.width/2 ? 'left':'right',mode:'tap',starting:this.video.currentTime};
      try { this.surface.setPointerCapture(e.pointerId); } catch (_) {}
      this.holdTimer = setTimeout(() => {
        if (!this.pointer || this.pointer.mode !== 'tap') return;
        this.pointer.mode = 'hold';
        this.holdActive = true;
        this.rateSaveSuspendedUntil = Date.now() + 1500;
        this.originalRate = this.video.playbackRate;
        this.video.playbackRate = config.holdSpeed;
        this.flash(`${config.holdSpeed}× (hold)`, 1200);
      }, 350);
    }
    pointerMove(e) {
      if (!this.pointer || e.pointerId !== this.pointer.id) return;
      const dx = e.clientX-this.pointer.x, dy = e.clientY-this.pointer.y;
      if (this.pointer.mode === 'hold') {
        const rate = M.holdSpeed(dx, config);
        if (this.video.playbackRate !== rate) {
          this.video.playbackRate = rate;
          this.flash(`${rate}× (hold)`, 950);
        }
        return;
      }
      if (this.pointer.mode === 'tap' && Math.abs(dx) > 13 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        clearTimeout(this.holdTimer);
        this.pointer.mode = 'seek';
        this.showControls();
      }
      if (this.pointer.mode === 'seek') {
        const delta = M.seekDelta(dx, config.seekSecondsPer40px);
        this.pendingTarget = M.targetTime(this.pointer.starting, this.video.duration, delta);
        this.flash(`${delta >= 0 ? '+' : ''}${Math.round(delta)}s  ·  ${M.formatTime(this.pendingTarget)}`, 500);
        this.updateUI();
      } else if (Math.abs(dy) > 20) clearTimeout(this.holdTimer);
    }
    pointerUp(e) {
      if (!this.pointer || e.pointerId !== this.pointer.id) return;
      clearTimeout(this.holdTimer);
      const p = this.pointer; this.pointer = null;
      if (p.mode === 'hold') {
        this.rateSaveSuspendedUntil = Date.now() + 300;
        this.video.playbackRate = this.originalRate;
        this.originalRate = null; this.holdActive = false;
        this.flash(`Back to ${this.video.playbackRate}×`, 700);
        return;
      }
      if (p.mode === 'seek') {
        if (this.pendingTarget !== null) {
          try { this.video.currentTime = this.pendingTarget; } catch (_) {}
          this.pendingTarget = null;
          this.updateUI();
        }
        this.showControls(); return;
      }
      if (Math.abs(e.clientX-p.x) > 16 || Math.abs(e.clientY-p.y) > 16) return;
      const now=Date.now();
      if (this.lastTap && now-this.lastTap.t < 310 && this.lastTap.half === p.half && Math.abs(e.clientX-this.lastTap.x) < 85) {
        clearTimeout(this.tapTimer);
        this.lastTap = null;
        this.jump(p.half === 'left' ? -config.doubleTapSeconds : config.doubleTapSeconds);
        this.showControls();
      } else {
        this.lastTap = {t:now,half:p.half,x:e.clientX};
        clearTimeout(this.tapTimer);
        this.tapTimer = setTimeout(() => {
          this.lastTap = null;
          if (this.controls.classList.contains('hidden')) this.showControls();
          else { clearTimeout(this.hideTimer); this.controls.classList.add('hidden'); }
        }, 315);
      }
    }
    cancelPointer() {
      clearTimeout(this.holdTimer);
      this.pointer = null;
      this.pendingTarget = null;
      if (this.holdActive) {
        this.rateSaveSuspendedUntil = Date.now() + 300;
        this.video.playbackRate = this.originalRate;
        this.originalRate = null; this.holdActive = false;
      }
    }
    destroy() {
      clearTimeout(this.holdTimer);clearTimeout(this.hideTimer);clearTimeout(this.tapTimer);clearTimeout(this.flashTimer);
      this.cancelPointer();
      this.persistProgress(true);
      for (const fn of this.cleanup) try { fn(); } catch (_) {}
      this.resizeObserver?.disconnect();
      if (this.video.isConnected) {
        this.video.controls = this.previousControls;
        if (this.previousInline === null) this.video.removeAttribute('playsinline');
      }
      if (this.parent.isConnected && this.parent.style.position === 'relative' && this.previousPosition !== 'relative') this.parent.style.position = this.previousPosition;
      this.host.remove();
    }
  }
  async function init() {
    const saved = await read(CONFIG_KEY);
    config = {...DEFAULTS, ...(saved[CONFIG_KEY] || {})};
    scan();
    // Avoid scanning on every subtree change on dynamic sites.
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {childList:true,subtree:true});
    scanInterval = setInterval(scan, 2200);
    if (api?.storage?.onChanged) api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[CONFIG_KEY]) {
        config = {...DEFAULTS,...changes[CONFIG_KEY].newValue};
        scan(); controller?.updateUI();
      }
    });
    window.addEventListener('pagehide', () => { observer.disconnect(); clearInterval(scanInterval); }, {once:true});
  }
  init().catch(()=>{});
})();
