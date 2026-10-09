// store.js — local state, AES-GCM encryption, and sync to an encrypted `data` branch on GitHub.
//
// Data model: one flat map of key -> {…fields, u}. `u` is a last-modified timestamp; deletes are
// tombstones ({del:true, u}). Two devices merge by keeping the newer `u` per key, so edits on
// both phones at once never clobber each other unless they touch the same item.

const te = new TextEncoder(), td = new TextDecoder();
const BRANCH = 'data';
const PHOTO_CACHE = 'hangouts-photos';
const ITER = 600000;

export const ls = {
  get(k, d) { try { const v = localStorage.getItem('hangouts.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('hangouts.' + k, JSON.stringify(v)); } catch (e) { console.warn('localStorage write failed', e); } },
  del(k) { try { localStorage.removeItem('hangouts.' + k); } catch {} },
};

const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0));
export const uid = () => crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36).padStart(7, '0'), '');

async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(salt), iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
async function seal(bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
}
async function unseal(bytes, k = key) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, k, bytes.subarray(12)));
}

let items = ls.get('items', {});
let cfg = ls.get('sync', null);          // {repo, token}
let key = null;                          // CryptoKey
let pendingPhotos = ls.get('pendingPhotos', []);
let msgs = [];
const listeners = new Set();
export const status = { state: 'local', last: ls.get('lastSync', 0), error: '' };

export async function init() {
  const raw = ls.get('key', null);
  if (cfg && raw) key = await crypto.subtle.importKey('raw', unb64(raw), 'AES-GCM', true, ['encrypt', 'decrypt']);
  else cfg = null;
  status.state = cfg ? 'idle' : 'local';
  try { await navigator.storage?.persist?.(); } catch {}
}

export const isSynced = () => !!(cfg && key);
export const repo = () => cfg?.repo;
export const onChange = fn => listeners.add(fn);
const emit = what => listeners.forEach(f => f(what));
function setStatus(state, error = '') { status.state = state; status.error = error; emit('status'); }

export const get = k => (items[k] && !items[k].del ? items[k] : null);
// Cached per prefix: every plan card asks for all photos, which was a full scan per card.
let byPrefix = {};
export const all = prefix => (byPrefix[prefix] ??= Object.entries(items).filter(([k, v]) => k.startsWith(prefix) && !v.del).map(([k, v]) => ({ ...v, key: k }))).slice();

/** Write one item. `quiet` skips re-rendering (used mid-drag on the calendar); call note() after. */
export function put(k, val, msg, quiet) {
  const { key: _ignored, ...rest } = val;
  items[k] = { ...rest, u: Math.max(Date.now(), (items[k]?.u || 0) + 1) };
  save(msg, quiet);
}
export function remove(k, msg) {
  items[k] = { del: true, u: Math.max(Date.now(), (items[k]?.u || 0) + 1) };
  save(msg);
}
export const note = msg => save(msg);
function save(msg, quiet) {
  byPrefix = {};
  ls.set('items', items);
  if (msg) msgs.push(msg);
  if (!quiet) emit('items');
  schedule();
}

let timer;
function schedule(ms = 1200) { if (!isSynced()) return; clearTimeout(timer); timer = setTimeout(sync, ms); }

export function merge(base, incoming) {
  const out = { ...base };
  for (const [k, v] of Object.entries(incoming)) if (!out[k] || v.u > out[k].u) out[k] = v;
  return out;
}
export const same = (a, b) => { const ka = Object.keys(a); return ka.length === Object.keys(b).length && ka.every(k => b[k] && b[k].u === a[k].u); };

// ---- GitHub ---------------------------------------------------------------
async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}${path ? '/' + path : ''}`, {
    cache: 'no-store', ...opts,
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', ...opts.headers },
  });
  if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; throw e; }
  return r;
}
const raw = async path => new Uint8Array(await (await gh(`contents/${path}?ref=${BRANCH}`, { headers: { Accept: 'application/vnd.github.raw+json' } })).arrayBuffer());
const putFile = (path, content, sha, message, branch = BRANCH) =>
  gh(`contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, content, sha, branch }) });

async function readData() {
  try {
    const j = await (await gh(`contents/data.enc?ref=${BRANCH}&_=${Date.now()}`)).json(); // bust GitHub's 60s s-maxage
    const bytes = j.content ? unb64(j.content) : await raw('data.enc'); // >1MB files come back without content
    return { sha: j.sha, items: JSON.parse(td.decode(await unseal(bytes))) };
  } catch (e) {
    if (e.status === 404) return { sha: undefined, items: {} };
    throw e;
  }
}

function commitMsg() {
  const uniq = [...new Set(msgs)];
  if (!uniq.length) return 'chore: sync ♥';
  return uniq.length === 1 ? uniq[0] : `${uniq[uniq.length - 1]} (+${uniq.length - 1} more)\n\n${uniq.map(m => '- ' + m).join('\n')}`;
}

let running = null, again = false, retried401 = false;
export function sync() {
  if (!isSynced()) return Promise.resolve();
  if (running) { again = true; return running; }
  running = (async () => {
    setStatus('syncing');
    try {
      for (let attempt = 0; ; attempt++) {
        const remote = await readData();
        const merged = merge(remote.items, items);
        if (!same(merged, items)) { items = merged; byPrefix = {}; ls.set('items', items); emit('items'); }
        if (same(merged, remote.items)) break;
        try {
          await putFile('data.enc', b64(await seal(te.encode(JSON.stringify(merged)))), remote.sha, commitMsg());
          msgs = [];
          break;
        } catch (e) {
          if (attempt < 3 && (e.status === 409 || e.status === 422)) continue; // someone else pushed first: re-read, re-merge
          throw e;
        }
      }
      await uploadPhotos();
      status.last = Date.now(); ls.set('lastSync', status.last); retried401 = false;
      setStatus('ok');
    } catch (e) {
      // Token rejected: the other phone may have swapped in a new one. Re-read the vault and retry once.
      if (e.status === 401 && !retried401) {
        const v = await fetchVault(cfg.repo, true);
        try {
          const secret = v && JSON.parse(td.decode(await unseal(unb64(v.ct))));
          if (secret?.token && secret.token !== cfg.token) { cfg = secret; ls.set('sync', cfg); retried401 = true; again = true; }
        } catch {}
      }
      console.error('sync failed', e);
      setStatus('error', e.status === 401 ? 'token rejected (401)' : e.status === 403 ? 'token lacks access (403)'
        : e.name === 'OperationError' ? 'data sealed with another passphrase' : navigator.onLine ? e.message : 'offline');
    }
    running = null;
    if (again) { again = false; sync(); }
  })();
  return running;
}

// ---- Photos (Cache API locally, encrypted blobs in the repo) ----------------
const photoReq = id => new Request(new URL(`__photo/${id}`, location.href));

async function uploadPhotos() {
  if (!pendingPhotos.length) return;
  const c = await caches.open(PHOTO_CACHE);
  for (const id of [...pendingPhotos]) {
    const res = await c.match(photoReq(id));
    if (res) {
      try { await putFile(`photos/${id}.enc`, b64(await seal(new Uint8Array(await res.arrayBuffer()))), undefined, `feat(moments): capture ${id.slice(0, 7)} 📸`); }
      catch (e) { if (e.status !== 422) throw e; } // 422 = already uploaded
    }
    pendingPhotos = pendingPhotos.filter(p => p !== id);
    ls.set('pendingPhotos', pendingPhotos);
  }
}

export async function addPhoto(blob) {
  const id = uid();
  const c = await caches.open(PHOTO_CACHE);
  await c.put(photoReq(id), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
  if (isSynced()) { pendingPhotos.push(id); ls.set('pendingPhotos', pendingPhotos); }
  return id;
}

const urls = {};
export function photoURL(id) {
  return urls[id] ??= (async () => {
    const c = await caches.open(PHOTO_CACHE);
    let res = await c.match(photoReq(id));
    if (!res && isSynced()) {
      const bytes = await unseal(await raw(`photos/${id}.enc`));
      res = new Response(new Blob([bytes], { type: 'image/jpeg' }));
      await c.put(photoReq(id), res.clone());
    }
    if (!res) throw new Error('photo not on this device');
    return URL.createObjectURL(await res.blob());
  })().catch(e => { delete urls[id]; throw e; });
}

// ---- Vault: the GitHub token, sealed with the shared passphrase, lives in vault.json on main --
// The vault is served by GitHub Pages, but Pages takes a minute to publish a new one and caches it for up
// to 10 minutes. Fall back to the public API so a freshly created vault is visible straight away.
export async function fetchVault(repoGuess, fresh = false) {
  if (!fresh) try { const r = await fetch('vault.json', { cache: 'no-store' }); if (r.ok) return await r.json(); } catch {}
  if (!repoGuess) return null;
  try {
    const r = await fetch(`https://api.github.com/repos/${repoGuess}/contents/vault.json?ref=main&_=${Date.now()}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function adopt(k, secret) {
  key = k; cfg = secret;
  ls.set('sync', cfg);
  ls.set('key', b64(new Uint8Array(await crypto.subtle.exportKey('raw', k))));
  // Photos taken before sync was set up still need uploading.
  const c = await caches.open(PHOTO_CACHE);
  const local = (await c.keys()).map(r => r.url.split('/__photo/')[1]).filter(Boolean);
  pendingPhotos = [...new Set([...pendingPhotos, ...local])];
  ls.set('pendingPhotos', pendingPhotos);
}

export async function unlock(pass, vault) {
  const k = await deriveKey(pass, vault.salt);
  let secret;
  try { secret = JSON.parse(td.decode(await unseal(unb64(vault.ct), k))); }
  catch { throw new Error('wrong passphrase'); }
  await adopt(k, secret);
  await sync();
}

export async function createVault({ pass, token, repo }) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const k = await deriveKey(pass, salt);
  const prev = { cfg, key };
  cfg = { repo, token }; key = k;
  try {
    await gh('');                      // token + repo sanity check
    await ensureBranch();
    const vault = { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt, ct: b64(await seal(te.encode(JSON.stringify(cfg)))) };
    // Never overwrite an existing vault: a new salt would make all synced data unreadable.
    const exists = await gh(`contents/vault.json?ref=main&_=${Date.now()}`).then(() => true, e => { if (e.status === 404) return false; throw e; });
    if (exists) { const e = new Error('Sync is already set up for this site. Use your shared passphrase to connect instead.'); e.status = 409; throw e; }
    await putFile('vault.json', b64(te.encode(JSON.stringify(vault, null, 2))), undefined, 'chore(security): seal the vault 🔐', 'main');
  } catch (e) { ({ cfg, key } = prev); throw e; }
  await adopt(k, cfg);
  await sync();
}

/** Swap in a new GitHub token (old one expired or revoked). Same passphrase and key, so all data stays readable. */
export async function replaceToken(token) {
  if (!key || !cfg) throw new Error('Connect this phone first.');
  const next = { ...cfg, token };
  const prev = cfg; cfg = next;
  try {
    await gh('');
    const j = await (await gh(`contents/vault.json?ref=main&_=${Date.now()}`)).json();
    const vault = JSON.parse(td.decode(unb64(j.content)));
    vault.ct = b64(await seal(te.encode(JSON.stringify(next))));
    await putFile('vault.json', b64(te.encode(JSON.stringify(vault, null, 2))), j.sha, 'chore(security): rotate token 🔐', 'main');
  } catch (e) { cfg = prev; throw e; }
  ls.set('sync', cfg);
  await sync();
}

/** Start a workflow (events.yml, notify.yml) with a repository_dispatch. Needs the same Contents: write token as sync. */
export async function dispatch(type, payload = {}) {
  if (!isSynced()) return false;
  await gh('dispatches', { method: 'POST', body: JSON.stringify({ event_type: type, client_payload: payload }) });
  return true;
}
export const findEvents = () => dispatch('events');

async function ensureBranch() {
  try { await gh(`git/ref/heads/${BRANCH}`); return; } catch (e) { if (e.status !== 404) throw e; }
  const main = await (await gh('git/ref/heads/main')).json();
  await gh('git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main.object.sha }) });
}

export function lock() {
  cfg = null; key = null;
  ['sync', 'key'].forEach(ls.del);
  setStatus('local');
}

export const exportItems = () => JSON.stringify(items, null, 2);
/** Restore a backup. Rejects anything that isn't our {key: {…, u}} map, so a wrong file can't corrupt (and sync) junk. */
export function importItems(obj) {
  const isMap = o => o && typeof o === 'object' && !Array.isArray(o);
  const entries = isMap(obj) ? Object.entries(obj) : [];
  if (!entries.length || !entries.every(([k, v]) => k.includes(':') && isMap(v) && Number.isFinite(v.u))) throw new Error('not a hangouts backup');
  items = merge(items, obj); save('chore: restore from backup');
}
