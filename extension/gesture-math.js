/* Pure gesture functions shared by the content script and Node tests. */
(function (root) {
  'use strict';
  const clamp = (v, low, high) => Math.min(high, Math.max(low, v));
  function seekDelta(dx, secondsPer40px) {
    return clamp(dx / 40 * secondsPer40px, -240, 240);
  }
  function targetTime(current, duration, delta) {
    const max = Number.isFinite(duration) && duration > 0 ? duration : Number.MAX_SAFE_INTEGER;
    return clamp(current + delta, 0, max);
  }
  function holdSpeed(dx, defaults) {
    if (dx >= 28) return defaults.rightSpeed;
    if (dx <= -28) return defaults.leftSpeed;
    return defaults.holdSpeed;
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const n = Math.floor(seconds);
    const h = Math.floor(n / 3600);
    const m = Math.floor(n % 3600 / 60);
    const s = n % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  const api = { clamp, seekDelta, targetTime, holdSpeed, formatTime };
  root.GlideVidMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
