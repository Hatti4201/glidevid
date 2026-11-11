(() => {
  'use strict';
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const store = api.storage.local;
  const configKey = 'tv.config';
  const defaults = {
    enabled:true, doubleTapSeconds:15, seekSecondsPer40px:20,
    holdSpeed:2, rightSpeed:3, leftSpeed:1.5,
    rememberSpeed:true, rememberProgress:true, showCamera:true, autoHideMs:3500
  };
  const fields = Object.keys(defaults);
  const read = async (key) => {
    const result = store.get(key);
    if (result?.then) return result;
    return new Promise(r => store.get(key, result => r(result || {})));
  };
  const write = async (value) => {
    const result = store.set(value);
    if (result?.then) await result;
  };
  let saving = false;
  let timer = 0;
  const $ = id => document.getElementById(id);
  function collect() {
    const config = {};
    for (const [id, def] of Object.entries(defaults)) {
      const el = $(id);
      config[id] = typeof def === 'boolean' ? el.checked : Number(el.value);
    }
    return config;
  }
  async function save() {
    if (saving) return;
    saving = true;
    $('status').textContent = 'Saving…';
    try { await write({[configKey]:collect()}); $('status').textContent = 'Saved'; }
    catch (_) { $('status').textContent = 'Save failed'; }
    finally { saving = false; }
  }
  async function init() {
    const data = await read(configKey);
    const config = {...defaults,...(data[configKey] || {})};
    for (const id of fields) {
      const el = $(id);
      if (typeof defaults[id] === 'boolean') el.checked = !!config[id];
      else el.value = String(config[id]);
      el.addEventListener('change', () => { clearTimeout(timer); timer = setTimeout(save, 75); });
    }
    $('reset').addEventListener('click', async () => {
      if (!confirm('Clear all saved video watch progress?')) return;
      await store.remove('tv.progress');
      $('status').textContent = 'History cleared';
    });
  }
  init().catch(()=>{ $('status').textContent = 'Storage unavailable'; });
})();
