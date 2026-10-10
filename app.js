import * as S from './store.js';
import { DATE_IDEAS, IDEA_CATS, COST, HOME, ACTIVITY_GROUPS } from './catalog.js';

// ---- tiny helpers -----------------------------------------------------------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDay(new Date());
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => (s ? parseDay(s).toLocaleDateString(undefined, o) : 'Date TBD');
const LONG = { weekday: 'long', day: 'numeric', month: 'long' };
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const mapLink = place => `<a href="https://www.google.com/maps/search/${encodeURIComponent(place)}" target="_blank" rel="noopener">📍 ${esc(place)}</a>`;

function ago(t) {
  if (!t) return 'never';
  const s = (Date.now() - t) / 1000;
  return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`;
}
const whenOf = d => { const t = parseDay(d.date); const [h, m] = (d.time || '18:00').split(':').map(Number); t.setHours(h, m); return t.getTime(); };
function until(d) {
  if (!d.time) { // no time set: count whole days, not down to an invented hour
    const days = Math.round((parseDay(d.date) - parseDay(today())) / 864e5);
    return days <= 0 ? 'Today 💖' : days === 1 ? 'Tomorrow' : `in ${days} days`;
  }
  const ms = whenOf(d) - Date.now();
  if (ms <= 0) return ms > -6 * 3600e3 ? 'Happening now 💖' : 'Today';
  const dd = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return dd ? `${plural(dd, 'day')}, ${h}h ${pad(m)}m to go` : `${h}h ${pad(m)}m ${pad(s)}s to go`;
}

// ---- people + data ------------------------------------------------------------
// Defaults are us. Older saves may still hold placeholder names, so treat those as unset.
const US = { a: 'Mika', b: 'Fofo', start: '2021-04-12' };
const people = () => {
  const p = S.get('cfg:people') || {}, real = v => v && !/^(Person|Player) [12]$/.test(v);
  return { a: real(p.a) ? p.a : US.a, b: real(p.b) ? p.b : US.b, start: p.start || US.start };
};
const me = () => S.ls.get('me', 'a');
const nameOf = p => people()[p] || '?';
const other = p => (p === 'a' ? 'b' : 'a');
const isFree = (p, ds) => !!S.get(`free:${p}:${ds}`)?.v;
const daysTogether = () => { const s = people().start; return s ? Math.max(0, Math.floor((Date.now() - parseDay(s)) / 864e5)) : null; };

/** Next day-count or anniversary worth celebrating, e.g. {label: 'Day 700', date: '2027-01-26', inDays: 99}. */
function milestone() {
  const start = people().start; if (!start) return null;
  const s = parseDay(start), now = parseDay(today()), n = Math.round((now - s) / 864e5);
  if (n < 0) return null; // start date in the future: nothing to count yet
  const at = days => { const d = new Date(s); d.setDate(d.getDate() + days); return d; };
  let next100 = (Math.floor(n / 100) + 1) * 100;
  const yrs = now.getFullYear() - s.getFullYear();
  let ann = new Date(s); ann.setFullYear(s.getFullYear() + yrs); if (ann < now) ann.setFullYear(ann.getFullYear() + 1);
  const annYears = ann.getFullYear() - s.getFullYear();
  const cands = [{ label: `Day ${next100}`, d: at(next100) }];
  if (annYears > 0) cands.push({ label: annYears === 1 ? 'First anniversary' : `${annYears}-year anniversary`, d: ann });
  if (n > 0 && n % 100 === 0) cands.push({ label: `Day ${n}`, d: now });
  const m = cands.sort((a, b) => a.d - b.d)[0];
  return { n, label: m.label, date: isoDay(m.d), inDays: Math.round((m.d - now) / 864e5) };
}
const milestoneLine = () => {
  const m = milestone(); if (!m) return '';
  return m.inDays === 0 ? `🎉 Today is your ${m.label.replace(/^Day/, 'day')}! Happy ${m.label.includes('anniversary') ? 'anniversary' : 'milestone'} 💖`
    : `💞 Day ${m.n} together · ${m.label} in ${plural(m.inDays, 'day')} (${fmtDay(m.date)})`;
};

/** Calendar difference: whole years, months, days from start to now. */
function sinceParts(startIso, now = new Date()) {
  const s = parseDay(startIso);
  let y = now.getFullYear() - s.getFullYear(), m = now.getMonth() - s.getMonth(), d = now.getDate() - s.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d, days: Math.round((parseDay(today()) - s) / 864e5) };
}
/** Next monthsary: same day-of-month as the start (clamped for short months). */
function monthsary() {
  const s = parseDay(people().start), now = parseDay(today());
  const on = (y, mo) => new Date(y, mo, Math.min(s.getDate(), new Date(y, mo + 1, 0).getDate()));
  let d = on(now.getFullYear(), now.getMonth()); if (d < now) d = on(now.getFullYear(), now.getMonth() + 1);
  const months = (d.getFullYear() - s.getFullYear()) * 12 + d.getMonth() - s.getMonth();
  return { date: isoDay(d), months, inDays: Math.round((d - now) / 864e5) };
}
const clock = () => { const n = new Date(); return `${n.getHours()}h ${pad(n.getMinutes())}m ${pad(n.getSeconds())}s`; };
const notes = () => S.all('note:').sort((a, b) => b.at - a.at);

// ---- weather -----------------------------------------------------------------------
// Free Open-Meteo forecast for Wangsa Maju, fetched once per visit. Covers the next 16 days.
let wx = null;
const WX_ICON = c => (c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌧️' : '⛈️');
async function loadWeather() {
  if (wx) return; wx = {};
  try {
    const j = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=3.205&longitude=101.735&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Asia%2FKuala_Lumpur&forecast_days=16')).json();
    j.daily.time.forEach((d, i) => { wx[d] = { code: j.daily.weather_code[i], max: Math.round(j.daily.temperature_2m_max[i]), rain: j.daily.precipitation_probability_max[i] ?? 0 }; });
    render();
  } catch { /* offline or blocked: just no forecast */ }
}
const wxLine = date => {
  const w = wx?.[date]; if (!w) return '';
  return `<div class="wx">${WX_ICON(w.code)} ${w.max}° · ${w.rain}% chance of rain${w.rain >= 60 ? ' · bring an umbrella ☂️' : ''}</div>`;
};

function togetherCard() {
  const P = people();
  if (!P.start || P.start > today()) return '';
  const t = sinceParts(P.start), ms = monthsary(), mile = milestone();
  const parts = [t.y && plural(t.y, 'year'), t.m && plural(t.m, 'month'), plural(t.d, 'day')].filter(Boolean).join(', ');
  const extra = ms.inDays === 0 ? `🎉 Happy ${ms.months}-month monthsary!` : mile && mile.inDays === 0 ? `🎉 ${esc(mile.label)} today!`
    : `${ms.months}-month monthsary in ${plural(ms.inDays, 'day')}${mile && mile.inDays <= 60 ? ` · ${esc(mile.label)} in ${plural(mile.inDays, 'day')}` : ''}`;
  const t0 = today(), soon = dates().filter(d => d.status === 'planned' && d.date && d.date >= t0).sort((a, b) => a.date.localeCompare(b.date))[0];
  const soonDays = soon && Math.round((parseDay(soon.date) - parseDay(t0)) / 864e5);
  const next = soon && soonDays <= 7 ? `<div class="tg-next">${esc(soon.emoji || '💖')} ${esc(soon.title)} ${soonDays === 0 ? 'is today!' : soonDays === 1 ? 'is tomorrow' : `in ${soonDays} days`}</div>` : '';
  return `
  <div class="together">
    <div class="tg-top"><span class="who-a">${esc(P.a)}</span> <span class="tg-heart">💞</span> <span class="who-b">${esc(P.b)}</span></div>
    <div class="tg-days"><b>${t.days.toLocaleString()}</b> days together</div>
    <div class="tg-parts">${parts} <span class="tg-clock">and <span data-clock></span></span></div>
    <div class="tg-sub">Since ${fmtDay(P.start, { day: 'numeric', month: 'long', year: 'numeric' })} · ${extra}</div>
    ${next}
  </div>`;
}
function notesCard() {
  const latest = notes().find(n => n.by !== me()) || notes()[0];
  return `
  <div class="notes-card">
    <span class="nc-text">${latest ? `💌 <span class="tg-quote">“${esc(latest.text)}”</span> <span class="muted small">— ${esc(nameOf(latest.by))}</span>` : '<span class="muted">💌 No love notes yet</span>'}</span>
    <span class="tg-note-btns"><button class="btn small primary" data-act="note-new">Write</button>${notes().length ? `<button class="btn small ghost" data-act="note-all">All (${notes().length})</button>` : ''}</span>
  </div>`;
}

function writeNote() {
  const m = openModal(`
    <form class="form" id="noteForm">
      <h2>A note for ${esc(nameOf(other(me())))}</h2>
      <label>Your note<textarea name="text" rows="4" maxlength="280" required placeholder="Thinking of you 💭"></textarea></label>
      <p class="small muted">It shows on the front page of ${esc(nameOf(other(me())))}’s phone.</p>
      <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Send 💌</button></div>
    </form>`);
  const f = $('#noteForm', m); f.text.focus();
  f.onsubmit = e => {
    e.preventDefault();
    const text = f.text.value.trim(); if (!text) return;
    S.put('note:' + S.uid(), { by: me(), text, at: Date.now() }, `feat(notes): a note from ${nameOf(me())} 💌`);
    notify('notes', `💌 ${nameOf(me())} wrote you a note`, 'Open hangouts to read it');
    m.close(); toast('💌 Note sent');
  };
}
function allNotes() {
  const list = notes();
  const m = openModal(`
    <h2>Love notes</h2>
    <ul class="notes-list">${list.map(n => `<li class="from-${n.by}"><p>${esc(n.text)}</p><span class="muted small">${esc(nameOf(n.by))} · ${new Date(n.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>${n.by === me() ? ` <button class="linkish small" data-del="${esc(n.key)}">delete</button>` : ''}</li>`).join('')}</ul>
    <div class="actions"><button class="btn ghost" data-close>Close</button><button class="btn primary" id="noteNew">💌 Write one</button></div>`);
  $('#noteNew', m).onclick = writeNote;
  m.onclick = e => { const k = e.target.closest('[data-del]')?.dataset.del; if (k) { S.remove(k, 'revert(notes): delete a note'); allNotes(); } };
}

const dates = () => S.all('date:');
/** Photo ids for a date, oldest first. Each photo is its own record so two phones adding photos at once never clash. */
const pics = key => [...(S.get(key)?.photos || []), ...S.all('photo:').filter(p => p.date === key).sort((a, b) => a.at - b.at).map(p => p.key.slice(6))];
const nextN = () => dates().reduce((m, d) => Math.max(m, d.n || 0), 0) + 1;
const STATUS = { idea: 'Idea', proposed: 'Asked 💌', planned: 'Booked', done: 'Done' };
const MOODS = ['', '😍 swoon', '😂 so funny', '🥰 cozy', '🤩 core memory', '😌 chill', '🌧️ chaotic but cute'];

// {name} becomes the person being asked. After the last line it keeps shuffling, so No never runs out.
const NO_LINES = ['No', 'Are you sure?', 'Really sure? 🥺', 'Think again', 'Pretty please?', 'Wrong button!', 'You’re breaking my heart 💔',
  'Nope, try the other one', 'This button is shy', 'I’ll wait…', 'Have you tried Yes?', 'Still no? 😢', 'Okay, but what if yes', 'So close to yes',
  '{name}, pls 🥺', 'I’ll buy you bubble tea 🧋', 'And dessert. Any dessert.', 'You can pick the movie 🎬', 'I’ll hold the umbrella ☂️',
  'Not this one, silly', 'Try the pink one 👉', 'My heart says no to no', 'Error: too cute to refuse', 'This button is on holiday 🏝️',
  'Out of order 🚧', 'Have mercy 🙏', 'I already told my mum', 'I’ll be sad forever', 'Okay, I’ll cry a little 😭', 'You can’t catch me!',
  'Too slow 😜', 'Missed me!', 'Catch me if you can 💨', 'Almost had it…', 'Not even close', 'Are you sure sure?',
  'I’ll do the dishes for a week', 'Free hugs included 🤗', 'Persistent, aren’t you?', 'The answer is yes, trust me', 'Loading “No”… ⏳',
  '“No” has left the chat', 'This button is just for decoration', 'Say yes and I’ll stop running', 'Plot twist: there is no “No”',
  'I can do this all day', '{name}, the other button 👀', 'No is not in stock', 'Ask me again in 100 years', 'Still running… 🏃'];
const NO_TALLY = ['', '{name} is thinking about it…', 'Playing hard to get, I see', 'The No button is getting tired', 'You know you want to say yes',
  'Resistance is futile 💕', 'This could go on forever', 'Spoiler: it never works', 'Your thumb must be tired by now', 'Yes is right there 💖',
  'Okay, now you’re just having fun', 'Still going? Impressive'];
let noOrder = [];
/** Line for the n-th dodge: the list in order, then an endless shuffle that never repeats back to back. */
function noLine(n, who) {
  let line;
  if (n < NO_LINES.length) line = NO_LINES[n];
  else {
    if (!noOrder.length) { noOrder = NO_LINES.slice(1).sort(() => Math.random() - 0.5); }
    line = noOrder.pop();
  }
  return line.replace('{name}', who);
}

// ---- UI primitives ------------------------------------------------------------
function toast(msg, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').append(el); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
}
function openModal(html, cls = '') {
  const d = $('#modal'); d.className = 'modal ' + cls; d.innerHTML = html; d.onclick = null; d.onchange = null;
  if (!d.open) d.showModal();
  return d;
}
$('#modal').addEventListener('click', e => {
  if (e.target.closest('[data-close]') || e.target === e.currentTarget) $('#modal').close();
});
const burst = () => {
  if (!window.confetti || reduceMotion) return;
  const shapes = confetti.shapeFromText ? [confetti.shapeFromText({ text: '💖', scalar: 2 }), confetti.shapeFromText({ text: '🌸', scalar: 2 })] : undefined;
  const fire = o => confetti({ particleCount: 60, spread: 80, startVelocity: 42, scalar: 2, ticks: 220, shapes, ...o });
  fire({ origin: { x: 0.2, y: 0.7 }, angle: 60 }); fire({ origin: { x: 0.8, y: 0.7 }, angle: 120 });
  setTimeout(() => fire({ origin: { x: 0.5, y: 0.4 }, spread: 140, particleCount: 80 }), 250);
};

// ---- router -------------------------------------------------------------------
const TABS = ['ask', 'calendar', 'plans', 'ideas', 'week', 'activities', 'memories'];
let tab = 'ask', cleanup = null, painting = false, archiveQuery = '', lastHtml = '';
function route() {
  const h = location.hash.slice(1);
  tab = TABS.includes(h) ? h : h === 'archive' ? 'memories' : 'ask';
  ['#modal', '#lightbox'].forEach(s => $(s).open && $(s).close());
  document.documentElement.classList.toggle('noscroll', tab === 'ask'); // the front page is one fixed screen
  render(true);
  $('#view').focus({ preventScroll: true });
  scrollTo(0, 0);
}
function render(force) {
  if (painting) return; // the calendar re-renders itself when the drag ends
  const html = VIEWS[tab]();
  if (!force && html === lastHtml) return renderSync(); // a sync brought nothing new for this screen
  lastHtml = html;
  cleanup?.(); cleanup = null;
  $$('.tab').forEach(t => { const on = t.dataset.tab === tab; t.setAttribute('aria-selected', on); if (force && on) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  const v = $('#view');
  v.innerHTML = html;
  BIND[tab]?.(v);
  hydratePhotos(v);
  tick();
  renderSync();
}

// ---- install to home screen ------------------------------------------------------
let installEvt = null; // Chrome/Android hands us this when the site can be installed
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; render(); });
addEventListener('appinstalled', () => { installEvt = null; S.ls.set('installHide', true); toast('📲 Added to your home screen'); render(); });
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canInstall = () => !isInstalled() && (!!installEvt || isIOS() || matchMedia('(pointer:coarse)').matches);
const installBar = () => (canInstall() && !S.ls.get('installHide', false) ? `
  <div class="install-bar">
    <span class="ib-icon"><img src="icon-180.png" alt=""></span>
    <span class="ib-text"><b>Get the app</b><span>Add hangouts to your home screen</span></span>
    <button class="btn small primary" data-act="install">Add</button>
    <button class="ib-x" data-act="install-hide" aria-label="Hide">✕</button>
  </div>` : '');
async function install() {
  if (installEvt) {
    const e = installEvt; installEvt = null;
    e.prompt();
    const { outcome } = await e.userChoice.catch(() => ({}));
    if (outcome !== 'accepted') installEvt = e; // still available for next time
    return render();
  }
  const ios = isIOS(), safari = ios && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  openModal(`
    <h2>Add to your home screen</h2>
    <ol class="install-steps">${ios ? `
      <li>Tap the <b>Share</b> button <span class="kbd">⬆︎</span> ${safari ? 'at the bottom of Safari' : 'in your browser’s menu'}.</li>
      <li>Scroll down and tap <b>Add to Home Screen</b> <span class="kbd">＋</span>.</li>
      <li>Tap <b>Add</b>. The pink heart icon appears on your home screen.</li>`
      : `
      <li>Open your browser menu <span class="kbd">⋮</span> (top right in Chrome).</li>
      <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
      <li>Tap <b>Install</b>. The pink heart icon appears on your home screen.</li>`}
    </ol>
    ${ios && !safari ? '<p class="small muted">Don’t see it? Open this page in Safari and try again.</p>' : ''}
    <p class="small muted">It opens full screen like a normal app and always loads the newest version.</p>
    <div class="actions"><button class="btn primary" data-close>Got it</button></div>`, 'center');
}

// ---- Ask ----------------------------------------------------------------------
let noTries = 0, askPlan = null;
function viewAsk() {
  askPlan = dates().filter(d => d.status === 'proposed').sort((a, b) => b.u - a.u)[0] || null;
  return `
  <section class="ask">
    ${installBar()}
    ${togetherCard()}
    <div class="ask-card">
      <div class="ask-hearts" aria-hidden="true"><span>💗</span><span>💕</span><span>💖</span></div>
      <p class="eyebrow">${askPlan ? `${esc(nameOf(askPlan.by))} has a question for ${esc(nameOf(other(askPlan.by)))}` : 'A very important question'}</p>
      <h1 class="ask-q">Will you go on a date with me?</h1>
      ${askPlan ? `
      <div class="ask-plan">
        <div class="ap-emoji">${esc(askPlan.emoji || '💖')}</div>
        <div><b>${esc(askPlan.title)}</b>
        <div class="muted small">${askPlan.date ? `${fmtDay(askPlan.date, LONG)}${askPlan.time ? ' · ' + fmtTime(askPlan.time) : ''}` : 'Date: let’s pick together'}${askPlan.place ? ` · ${esc(askPlan.place)}` : ''}</div></div>
      </div>` : ''}
      <div class="ask-arena">
        <button class="btn yes" id="yesBtn">Yes 💖</button>
        <span class="no-slot"><button class="btn no" id="noBtn">No</button></span>
      </div>
      <p class="tally" id="tally" aria-live="polite"></p>
    </div>
    ${notesCard()}
    <div class="ask-foot">
      <button class="linkish" data-act="tos">Terms of Cuddles</button><span aria-hidden="true">·</span>
      <button class="linkish" data-act="copy-invite">Send link</button><span aria-hidden="true">·</span>
      <a class="linkish" href="#plans">Ask about a plan</a>
    </div>
  </section>`;
}
function bindAsk(v) {
  const no = $('#noBtn', v), yes = $('#yesBtn', v), tally = $('#tally', v), slot = no.parentElement;
  const ac = new AbortController(), sig = { signal: ac.signal };
  cleanup = () => { ac.abort(); if (no.parentElement === document.body) no.remove(); };
  let lastDodge = 0;

  const level = () => {
    yes.style.setProperty('--grow', Math.min(1 + noTries * 0.05, 1.7));
    no.textContent = noLine(noTries, nameOf(askPlan ? other(askPlan.by) : other(me())));
    tally.textContent = noTries ? NO_TALLY[1 + Math.floor((noTries - 1) / 4) % (NO_TALLY.length - 1)].replace('{name}', nameOf(askPlan ? other(askPlan.by) : other(me()))) : '';
  };
  const settle = () => { no.classList.remove('loose'); no.style.translate = ''; slot.append(no); };
  level();

  // Everything the No button must never sit on: every clickable thing on screen, padded.
  const blocked = () => $$('a[href], button, input, select, textarea, label, [data-act], .ask-q, .ask-plan')
    .filter(el => el !== no && !no.contains(el))
    .map(el => { const b = el.getBoundingClientRect(), pad = el === yes ? 34 : 14; return { l: b.left - pad, t: b.top - pad, r: b.right + pad, b: b.bottom + pad, w: b.width }; })
    .filter(b => b.w > 0);

  // Glide away from the pointer: try straight away from it first, then fan out, staying on screen.
  const dodge = (px, py) => {
    noTries++; level();
    lastDodge = performance.now();
    const r = no.getBoundingClientRect();
    if (!no.classList.contains('loose')) {
      // Lift it out of the card at its current spot, without a visual jump. It lives in <body>
      // in page coordinates, so scrolling down to the links below leaves it behind.
      slot.style.width = r.width + 'px'; slot.style.height = r.height + 'px';
      no.style.transition = 'none'; no.classList.add('loose'); document.body.append(no);
      no.style.translate = `${r.left + scrollX}px ${r.top + scrollY}px`;
      void no.offsetWidth; no.style.transition = '';
    }
    const W = innerWidth, H = innerHeight, m = 14, top = 70, bottom = 16, avoid = blocked();
    const fits = (x, y) => x >= m && y >= top && x + r.width <= W - m && y + r.height <= H - bottom
      && avoid.every(b => x > b.r || x + r.width < b.l || y > b.b || y + r.height < b.t);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const away = Math.atan2(cy - py, cx - px) || Math.random() * Math.PI * 2;
    let best = null;
    for (const dist of [140 + Math.random() * 80, 90, 260]) {
      for (const off of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2, -2, Math.PI]) {
        const a = away + off, x = cx + Math.cos(a) * dist - r.width / 2, y = cy + Math.sin(a) * dist - r.height / 2;
        if (fits(x, y)) { best = [x, y]; break; }
      }
      if (best) break;
    }
    for (let i = 0, far = 0; !best && i < 80; i++) { // boxed in: pick the roomiest free spot on screen
      const x = m + Math.random() * Math.max(0, W - r.width - 2 * m), y = top + Math.random() * Math.max(0, H - r.height - top - bottom);
      const d = Math.hypot(x - px, y - py);
      if (fits(x, y) && d > far) { far = d; best = [x, y]; }
    }
    if (!best) return;
    no.style.translate = `${best[0] + scrollX}px ${best[1] + scrollY}px`;
    if (!reduceMotion) no.animate?.([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '5deg' }, { rotate: '0deg' }], { duration: 520, easing: 'ease-out' });
  };

  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || performance.now() - lastDodge < 180) return;
    const r = no.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) < 60) dodge(e.clientX, e.clientY);
  }, sig);
  no.addEventListener('pointerdown', e => { e.preventDefault(); dodge(e.clientX, e.clientY); }, sig);
  no.addEventListener('click', e => {
    e.preventDefault();
    if (performance.now() - lastDodge < 500) return; // the tap's pointerdown already dodged
    const r = no.getBoundingClientRect(); dodge(r.x + r.width / 2, r.y + r.height / 2);
    toast('Nice try 😌');
  }, sig);
  yes.addEventListener('click', sayYes, sig);
  addEventListener('resize', () => { // iOS fires resize while scrolling; only rescue it if it is now off the page
    const r = no.getBoundingClientRect();
    if (no.classList.contains('loose') && r.right + scrollX > document.documentElement.clientWidth) settle();
  }, sig);
}

async function sayYes() {
  const plan = askPlan, n = noTries;
  noTries = 0;
  const steps = ['Telling my heart', 'Counting butterflies', `Ignoring the ${n ? plural(n, '“no” attempt') : 'nerves'}`, 'Saving the date'];
  const d = openModal(`
    <div class="yes-done">
      <div class="big-heart" aria-hidden="true">💖</div>
      <h2>Yay! It’s a date!</h2>
      <ul class="checklist" id="checks">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="muted" id="yesNext" hidden>${plan ? `${esc(plan.emoji || '')} <b>${esc(plan.title)}</b> is booked.` : 'Now let’s pick a day we’re both free.'}</p>
      <div class="actions center" id="yesAct" hidden>
        ${plan && plan.date ? `<a class="btn primary" href="#plans" data-close>See the plan</a>` : `<a class="btn primary" href="#calendar" data-close>Pick a day</a>`}
        <a class="btn ghost" href="#plans" data-close>Plan something</a>
      </div>
    </div>`, 'center');
  burst();
  for (const li of $$('#checks li', d)) { await sleep(reduceMotion ? 0 : 330); li.classList.add('on'); }
  $('#yesNext', d).hidden = false; $('#yesAct', d).hidden = false;
  S.put('yes:' + S.uid(), { by: me(), at: Date.now(), plan: plan?.key || null }, plan ? `feat(rsvp): YES to "${plan.title}" 💖` : 'feat(rsvp): YES 💖', true);
  if (plan && S.get(plan.key)) S.put(plan.key, { ...S.get(plan.key), status: 'planned', answeredAt: Date.now() }, null, true);
  S.note();
}

function showTos() {
  openModal(`
    <h2>Terms of Cuddles</h2>
    <ol class="tos-list">
      <li>Holding hands is mandatory.</li>
      <li>Snacks are shared 50/50. Fries go to whoever is faster.</li>
      <li>“I’m not hungry” means “I’ll eat some of yours”.</li>
      <li>We keep taking photos until at least one is good.</li>
      <li>Hugs can be requested at any time and must be delivered within 3 seconds.</li>
      <li>The No button doesn’t work. Sorry, not sorry.</li>
      <li>This agreement renews after every date, forever.</li>
    </ol>
    <div class="actions"><button class="btn primary" data-close>I agree 💖</button></div>`);
}

// ---- Calendar -----------------------------------------------------------------
let calCursor = new Date(); calCursor.setDate(1);
function viewCalendar() {
  const P = people(), m = me(), y = calCursor.getFullYear(), mo = calCursor.getMonth(), t = today();
  const offset = (new Date(y, mo, 1).getDay() + 6) % 7, n = new Date(y, mo + 1, 0).getDate();
  const byDay = {};
  dates().filter(d => d.date && d.status !== 'done').forEach(d => (byDay[d.date] ||= []).push(d)); // saved events are dated ideas: show them too
  const evs = eventsByDay();
  const matches = [];
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('');
  cells += '<div class="day pad"></div>'.repeat(offset);
  for (let d = 1; d <= n; d++) {
    const ds = `${y}-${pad(mo + 1)}-${pad(d)}`, fa = isFree('a', ds), fb = isFree('b', ds), past = ds < t, ev = byDay[ds], kl = evs[ds]?.length;
    if (!past && fa && fb) matches.push(ds);
    const label = `${fmtDay(ds, LONG)}${fa ? `, ${P.a} free` : ''}${fb ? `, ${P.b} free` : ''}${ev ? `, ${ev.map(e => e.title).join(', ')}` : ''}${kl ? `, ${plural(kl, 'event')} in KL` : ''}`;
    cells += `<button class="day${fa ? ' fa' : ''}${fb ? ' fb' : ''}${fa && fb ? ' match' : ''}${past ? ' past' : ''}${ds === t ? ' today' : ''}" data-day="${ds}"
      ${past ? 'disabled' : ''} aria-pressed="${isFree(m, ds)}" aria-label="${esc(label)}">
      <span class="num">${d}</span>${ev ? `<span class="ev" title="${esc(ev.map(e => e.title).join(', '))}">${esc(ev[0].emoji || '📌')}</span>` : ''}${kl ? `<span class="evn" aria-hidden="true"><i>🎟️</i>${kl}</span><span class="evl" aria-hidden="true">${evs[ds].slice(0, 2).map(e => `<span>${esc(e.emoji)} ${esc(e.name)}</span>`).join('')}${kl > 2 ? `<span class="more">+${kl - 2} more</span>` : ''}</span>` : ''}
      <span class="marks"><i class="ma"></i><i class="mb"></i></span></button>`;
  }
  return `
  <section class="calendar">
    <div class="section-head">
      <div><h1>When are we free?</h1>
      <p class="muted">You’re marking days for <b class="who-${m}">${esc(nameOf(m))}</b>. Tap the days you’re free. <button class="linkish" data-act="whoami">Not you?</button></p></div>
    </div>
    <div class="cal-card">
      <div class="cal-nav">
        <button class="icon-btn" data-act="cal-prev" aria-label="Previous month">‹</button>
        <h2>${calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button class="icon-btn" data-act="cal-next" aria-label="Next month">›</button>
        <button class="btn ghost small" data-act="cal-today">Today</button>
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="legend">
        <span><i class="sw a"></i>${esc(P.a)}</span><span><i class="sw b"></i>${esc(P.b)}</span><span><i class="sw m"></i>Both free</span><span>📌 Plan</span><span><span class="evn">🎟️</span> Events in KL</span>
      </div>
    </div>
    <div class="panel">
      <h3>${matches.length ? `💞 You’re both free on ${plural(matches.length, 'day')} this month` : 'No days in common yet'}</h3>
      ${matches.length ? `<ul class="matches">${matches.map(ds => `
        <li><span>${fmtDay(ds, LONG)}</span>
        <span class="m-acts">${evs[ds] ? `<button class="btn small ghost" data-act="wo-open" data-day="${ds}">🎟️ ${plural(evs[ds].length, 'event')}</button>` : ''}
        ${byDay[ds] ? `<span class="muted small">${esc(byDay[ds][0].emoji || '')} ${esc(byDay[ds][0].title)}</span>` : `<button class="btn small" data-act="plan-on" data-day="${ds}">Plan a date</button>`}</span></li>`).join('')}</ul>`
      : `<p class="muted">Both of you tap the days you’re free. Days that match turn purple and show up here.</p>`}
      <div class="quick">
        <button class="btn ghost small" data-act="weekends">I’m free every weekend</button>
        <button class="btn ghost small" data-act="clear-month">Clear my days this month</button>
      </div>
    </div>
    ${whatsOn(evs)}
  </section>`;
}
function whatsOn(evs) {
  const ym = `${calCursor.getFullYear()}-${pad(calCursor.getMonth() + 1)}`, month = calCursor.toLocaleDateString(undefined, { month: 'long' });
  const days = Object.entries(evs).filter(([ds]) => ds.startsWith(ym)), saved = savedTitles();
  if (!week) return '';
  return `
    <div class="panel whats-on">
      <h3>🎟️ What’s on in KL in ${esc(month)}</h3>
      ${days.length ? days.map(([ds, list]) => `
      <details class="wo-day" id="wo-${ds}" data-day="${ds}" ${woOpen.has(ds) ? 'open' : ''}>
        <summary><span>${ds === today() ? 'Today' : fmtDay(ds, LONG)}</span><span class="muted small">${plural(list.length, 'event')}${isFree('a', ds) && isFree('b', ds) ? ' · 💞 you’re both free' : ''}</span></summary>
        <ul class="wo-list">${list.map(e => `
          <li><span class="wo-time">${evWhen(e, ds)}</span>
            <span class="wo-name"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.emoji)} ${esc(e.name)}</a><span class="muted small">${esc(e.venue || e.area)} · ~${e.km} km</span></span>
            <button class="btn small ghost ${saved.has(evTitle(e).toLowerCase()) ? 'saved' : ''}" data-act="save-ev" data-id="${esc(e.id)}">${saved.has(evTitle(e).toLowerCase()) ? '✓' : '+ Add'}</button></li>`).join('')}</ul>
      </details>`).join('') : `<p class="muted">${ym < today().slice(0, 7) ? 'This month is over.' : `No events found for ${esc(month)} yet. The list covers up to ${fmtDay(isoDay(new Date(parseDay(week.to).getTime() - 864e5)))} and grows every Friday.`}</p>`}
      <a class="linkish small" href="#week">Search and filter them on What’s on →</a>
    </div>`;
}
let woOpen = new Set(); // which What's on days are expanded, kept across re-renders
function bindCalendar(v) {
  if (Date.now() - weekAt > 30 * 6e4) loadWeek();
  $$('.wo-day', v).forEach(el => el.addEventListener('toggle', () => { el.open ? woOpen.add(el.dataset.day) : woOpen.delete(el.dataset.day); }));
  const grid = $('.cal-grid', v);
  let mode = false, touched = new Set(), mouse = false;
  const cls = me() === 'a' ? 'fa' : 'fb';
  const apply = el => {
    const ds = el?.dataset?.day;
    if (!ds || el.disabled || touched.has(ds)) return;
    touched.add(ds);
    S.put(`free:${me()}:${ds}`, { v: mode }, null, true);
    el.classList.toggle(cls, mode);
    el.classList.toggle('match', el.classList.contains('fa') && el.classList.contains('fb'));
    el.setAttribute('aria-pressed', mode);
  };
  const done = () => {
    if (!painting) return; painting = false;
    if (mode && touched.size) {
      const hit = [...touched].filter(ds => isFree(other(me()), ds));
      if (hit.length) toast(`💞 You’re both free on ${hit.map(ds => fmtDay(ds)).join(', ')}!`);
    }
    S.note(`feat(calendar): ${nameOf(me())} is ${mode ? 'free' : 'busy'} on ${plural(touched.size, 'day')}`);
  };
  grid.addEventListener('pointerdown', e => {
    const el = e.target.closest('.day[data-day]');
    if (!el || el.disabled || e.pointerType === 'touch') return;
    e.preventDefault(); mouse = true; painting = true; touched = new Set();
    mode = !isFree(me(), el.dataset.day); apply(el);
  });
  grid.addEventListener('pointermove', e => { if (painting) apply(document.elementFromPoint(e.clientX, e.clientY)?.closest('.day[data-day]')); });
  const ac = new AbortController();
  addEventListener('pointerup', done, { signal: ac.signal });
  addEventListener('pointercancel', done, { signal: ac.signal });
  cleanup = () => ac.abort();
  grid.addEventListener('click', e => {
    if (mouse) { mouse = false; if (e.detail) return; } // detail 0 = keyboard, after a drag that ended outside the grid
    const el = e.target.closest('.day[data-day]'); if (!el || el.disabled) return;
    painting = true; touched = new Set(); mode = !isFree(me(), el.dataset.day); apply(el); done();
  });
}

// ---- Plans ----------------------------------------------------------------------
const thumb = (key, id, i) => `<button class="thumb" data-act="photo" data-key="${esc(key)}" data-i="${i}"><img data-photo="${esc(id)}" alt="Photo ${i + 1}" loading="lazy"></button>`;
function card(d) {
  const past = d.date && d.date < today() && (d.status === 'planned' || d.status === 'proposed');
  const photos = pics(d.key);
  return `
  <article class="card st-${d.status}${past ? ' overdue' : ''}" data-key="${esc(d.key)}">
    <div class="card-top">
      <span class="c-emoji">${esc(d.emoji || '💖')}</span>
      <div class="c-head">
        <h3>${esc(d.title)}</h3>
        <div class="meta">
          <span>${d.date ? fmtDay(d.date) + (d.time ? ' · ' + fmtTime(d.time) : '') : 'No date yet'}</span>
          ${d.place ? mapLink(d.place) : ''}
          ${d.budget ? `<span>💸 RM${esc(d.budget)}</span>` : ''}
        </div>
      </div>
      <span class="pill st">${past ? 'How was it?' : STATUS[d.status]}</span>
    </div>
    ${d.status === 'planned' && d.date && !past ? `<div class="countdown" data-until="${esc(d.key)}">${until(d)}</div>` : ''}
    ${d.date && !past && d.status !== 'done' ? wxLine(d.date) : ''}
    ${d.notes ? `<p class="notes">${esc(d.notes)}</p>` : ''}
    ${photos.length ? `<div class="strip">${photos.slice(0, 6).map((p, i) => thumb(d.key, p, i)).join('')}${photos.length > 6 ? `<span class="more">+${photos.length - 6}</span>` : ''}</div>` : ''}
    <div class="card-actions">
      ${d.status === 'idea' ? `<button class="btn small" data-act="propose">💌 Ask</button>` : ''}
      ${d.status === 'proposed' ? `<a class="btn small" href="#ask">💌 See the question</a>` : ''}
      ${d.status === 'planned' ? `<button class="btn small" data-act="capture">📸 Add photos</button>` : ''}
      ${d.link ? `<a class="btn small ghost" href="${esc(d.link)}" target="_blank" rel="noopener">Open ↗</a>` : ''}
      ${d.status !== 'done' ? `<button class="btn small ghost" data-act="share">📤 Share</button>` : ''}
      ${d.status === 'planned' || past ? `<button class="btn small primary" data-act="ship">We went! ✓</button>` : ''}
      <span class="spacer"></span>
      <button class="btn small ghost" data-act="edit">Edit</button>
      <button class="btn small ghost danger" data-act="delete" aria-label="Delete">🗑</button>
    </div>
  </article>`;
}

function viewPlans() {
  const all = dates(), t = today();
  const planned = all.filter(d => d.status === 'planned').sort((a, b) => (a.date || '9').localeCompare(b.date || '9') || (a.time || '').localeCompare(b.time || ''));
  const retro = planned.filter(d => d.date && d.date < t), upcoming = planned.filter(d => !(d.date && d.date < t));
  const proposed = all.filter(d => d.status === 'proposed'), ideas = all.filter(d => d.status === 'idea').sort((a, b) => b.u - a.u);
  const next = upcoming.find(d => d.date);
  const section = (title, list, empty) => `
    <h2 class="col-title">${title} <span class="count">${list.length}</span></h2>
    ${list.length ? `<div class="cards">${list.map(card).join('')}</div>` : `<p class="empty">${empty}</p>`}`;
  return `
  <section class="plans">
    <div class="section-head">
      <div><h1>Our plans</h1><p class="muted">${plural(all.filter(d => d.status === 'done').length, 'date')} together so far.</p>${milestoneLine() ? `<p class="milestone">${milestoneLine()}</p>` : ''}</div>
      <div class="head-actions">
        <button class="btn ghost" data-act="spin">🎲 Give me an idea</button>
        <button class="btn primary" data-act="new">+ New plan</button>
      </div>
    </div>
    ${next ? `
    <div class="hero" data-key="${esc(next.key)}">
      <div class="hero-emoji">${esc(next.emoji || '💖')}</div>
      <div class="hero-body">
        <div class="eyebrow">Next date</div>
        <h2>${esc(next.title)}</h2>
        <div class="muted">${fmtDay(next.date, LONG)}${next.time ? ' · ' + fmtTime(next.time) : ''}${next.place ? ' · ' + esc(next.place) : ''}</div>
        <div class="countdown big" data-until="${esc(next.key)}">${until(next)}</div>
        ${wxLine(next.date)}
      </div>
    </div>` : ''}
    ${retro.length ? section('How did it go?', retro, '') : ''}
    ${section('Coming up', upcoming, 'Nothing booked yet. Go ask! The No button doesn’t work anyway.')}
    ${proposed.length ? section('Waiting for an answer', proposed, '') : ''}
    ${section('Ideas for later', ideas, 'No ideas saved yet. Tap 🎲 Give me an idea.')}
  </section>`;
}

function openDateForm(d = {}, retroFocus = false) {
  const isNew = !d.key;
  const stars = [5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" id="r${n}" value="${n}" ${d.rating == n ? 'checked' : ''}><label for="r${n}" title="${plural(n, 'star')}">★</label>`).join('');
  const m = openModal(`
  <form class="form" id="dateForm">
    <h2>${isNew ? (d.status === 'done' ? 'Add a past date' : 'New plan') : retroFocus ? 'How did it go?' : 'Edit plan'}</h2>
    <div class="row">
      <label class="emoji-field">Icon<input name="emoji" maxlength="8" value="${esc(d.emoji || '💖')}"></label>
      <label class="grow">What are we doing?<input name="title" required maxlength="80" value="${esc(d.title)}" placeholder="Sushi and sunset"></label>
    </div>
    <div class="row">
      <label>Date<input type="date" name="date" value="${esc(d.date)}"></label>
      <label>Time<input type="time" name="time" value="${esc(d.time)}"></label>
    </div>
    <div class="row">
      <label class="grow">Where<input name="place" maxlength="120" value="${esc(d.place)}" placeholder="Somewhere nice"></label>
      <label>Budget (RM)<input type="number" min="0" step="1" name="budget" value="${esc(d.budget)}"></label>
    </div>
    <label>Status<select name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${(d.status || 'idea') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Notes<textarea name="notes" rows="3" maxlength="2000" placeholder="Bring a jacket, it gets cold.">${esc(d.notes)}</textarea></label>
    ${!isNew && pics(d.key).length ? `<fieldset class="photo-manage">
      <legend>Photos (${pics(d.key).length})</legend>
      <div class="pm-grid">${pics(d.key).map(id => `<button type="button" class="pm-item" data-pid="${esc(id)}" aria-pressed="false" title="Tap to remove"><img data-photo="${esc(id)}" alt=""><span class="pm-x" aria-hidden="true">✕</span></button>`).join('')}</div>
      <div class="pm-foot"><span class="small muted" id="pmNote">Tap a photo to mark it for removal.</span><button type="button" class="btn small ghost" id="pmSave" disabled>Preparing…</button></div>
    </fieldset>` : ''}
    <fieldset class="retro"${retroFocus || d.status === 'done' ? '' : ' hidden'}>
      <legend>Afterwards</legend>
      <div class="row"><div><span class="lbl">Rating</span><div class="stars">${stars}</div></div>
      <label class="grow">Mood<select name="mood">${MOODS.map(x => `<option ${d.mood === x ? 'selected' : ''} value="${esc(x)}">${x || '—'}</option>`).join('')}</select></label></div>
      <label>Best moment<input name="best" maxlength="200" value="${esc(d.best)}" placeholder="When the waiter sang happy birthday to the wrong table"></label>
    </fieldset>
    <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${isNew ? 'Save' : 'Save changes'}</button></div>
  </form>`);
  const f = $('#dateForm', m);
  f.status.addEventListener('change', () => { $('.retro', f).hidden = f.status.value !== 'done'; });
  const removing = new Set();
  if ($('.photo-manage', f)) {
    hydratePhotos(f);
    f.addEventListener('click', e => {
      const it = e.target.closest('.pm-item'); if (!it) return;
      const id = it.dataset.pid, on = !removing.has(id);
      on ? removing.add(id) : removing.delete(id);
      it.setAttribute('aria-pressed', on);
      $('#pmNote', f).textContent = removing.size ? `${plural(removing.size, 'photo')} will be removed when you save.` : 'Tap a photo to mark it for removal.';
    });
    const btn = $('#pmSave', f), list = pics(d.key).map(id => ({ key: d.key, id }));
    let files = null;
    photoFiles(list).then(fl => { files = fl; btn.disabled = false; btn.textContent = `⬇ Save all to phone (${fl.length})`; });
    btn.onclick = () => files && savePhotos(files.filter(x => !removing.has(x.id)));
  }
  f.addEventListener('submit', e => {
    e.preventDefault();
    const x = Object.fromEntries(new FormData(f));
    x.title = x.title.trim(); x.rating = x.rating ? Number(x.rating) : undefined;
    const key = d.key || 'date:' + S.uid();
    const out = { photos: [], by: me(), n: nextN(), ...d, ...S.get(key), ...x }; // fresh copy: keeps photos added on the other phone meanwhile
    if (removing.size) {
      out.photos = (out.photos || []).filter(id => !removing.has(id));
      removing.forEach(id => S.get('photo:' + id) && S.remove('photo:' + id, null));
    }
    const nowDone = x.status === 'done' && (isNew || S.get(key)?.status !== 'done');
    S.put(key, out, `${isNew ? 'feat(plans): add' : 'fix(plans): update'} "${x.title}" ${x.emoji || ''}`.trim());
    m.close();
    toast(isNew ? (x.status === 'done' ? '💾 Added to memories' : '💾 Plan saved') : removing.size ? `Saved · ${plural(removing.size, 'photo')} removed` : 'Saved');
    if (nowDone) burst();
  });
  (retroFocus ? $('.stars input', f) : f.title)?.focus();
}

async function spin() {
  const m = openModal(`
    <div class="spin">
      <h2>Date idea generator</h2>
      <div class="slot" id="slot">🎲</div>
      <p class="muted" id="slotTip"></p>
      <div class="actions center" id="slotAct" hidden><button class="btn ghost" data-act2="again">Another one</button><button class="btn primary" data-act2="add">Save this idea</button></div>
    </div>`, 'center');
  let pick, run = 0;
  const go = async () => {
    const me_ = ++run;
    $('#slotAct', m).hidden = true;
    const slot = $('#slot', m);
    for (let i = 0; i < (reduceMotion ? 1 : 16); i++) {
      if (me_ !== run || !m.open) return;
      pick = DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)];
      slot.textContent = `${pick[0]} ${pick[1]}`;
      $('#slotTip', m).textContent = pick[2] + (pick[6] ? ` · ~${pick[6]} min away` : ' · at home') + ` · ${COST[pick[4]]}`;
      await sleep(50 + i * i * 1.8);
    }
    slot.classList.remove('pop'); void slot.offsetWidth; slot.classList.add('pop');
    $('#slotAct', m).hidden = false;
  };
  m.onclick = e => {
    const a = e.target.closest('[data-act2]')?.dataset.act2;
    if (a === 'again') go();
    if (a === 'add') {
      saveIdea(ideaFromRow(pick));
      m.close();
    }
  };
  go();
}

// ---- Ideas ------------------------------------------------------------------------
const savedTitles = () => new Set(dates().filter(d => d.status !== 'done').map(d => d.title.toLowerCase()));
function saveIdea({ emoji, title, notes, link, place, date, time }) {
  if (savedTitles().has(title.toLowerCase())) return toast('Already in your plans 💕');
  S.put('date:' + S.uid(), { emoji, title, notes, link, place, date, time, status: 'idea', by: me(), n: nextN(), photos: [] }, `feat(ideas): save "${title}" ${emoji}`);
  toast('💡 Saved to Plans › Ideas for later');
}
let ideaCat = 'hot', ideaCost = 'all', ideaDist = 'all';
// Places starting lowercase are map searches ("padel court Kuala Lumpur"), not a specific spot.
const isSearch = place => /^[a-z]/.test(place);
const ideaFromRow = ([emoji, title, tip, , , place]) => ({ emoji, title, notes: tip, place: place && !isSearch(place) ? place : undefined });
let ideaQuery = '';
const distBand = mins => (mins === 0 ? 'home' : mins <= 30 ? 'near' : 'far');
function viewIdeas() {
  const saved = savedTitles();
  const chip = (group, val, label, cur) => `<button class="chip" data-act="${group}" data-v="${val}" aria-pressed="${cur === val}">${label}</button>`;
  return `
  <section class="ideas">
    <div class="section-head">
      <div><h1>Date ideas</h1><p class="muted">${DATE_IDEAS.length} daytime ideas within an hour of ${esc(HOME)}, all under RM150 for the two of you, including ${DATE_IDEAS.filter(r => r[7]).length} 🔥 trending ones. Prices are rough guides with MyKad.</p></div>
      <div class="head-actions"><button class="btn primary" data-act="spin">🎲 Surprise me</button></div>
    </div>
    <div class="filters">
      <input class="search" type="search" id="ideaSearch" placeholder="Search ideas… (matcha, hike, Bangsar)" value="${esc(ideaQuery)}" aria-label="Search ideas">
      <div class="chips" role="group" aria-label="Type">${chip('icat', 'hot', '🔥 Trending', ideaCat)}${chip('icat', 'all', 'All', ideaCat)}${Object.entries(IDEA_CATS).map(([k, l]) => chip('icat', k, l, ideaCat)).join('')}</div>
      <div class="chips" role="group" aria-label="Budget for two">${chip('icost', 'all', 'Any budget', ideaCost)}${COST.map((l, i) => chip('icost', String(i), l, ideaCost)).join('')}</div>
      <div class="chips" role="group" aria-label="Distance">${chip('idist', 'all', 'Any distance', ideaDist)}${chip('idist', 'home', '🏠 At home', ideaDist)}${chip('idist', 'near', '🚗 Up to 30 min', ideaDist)}${chip('idist', 'far', '🚗 30–60 min', ideaDist)}</div>
    </div>
    <div class="idea-grid">${DATE_IDEAS.map(([e, t, tip, cat, cost, place, mins, hot], i) => `
      <article class="idea${hot ? ' hot' : ''}" data-cat="${cat}" data-cost="${cost}" data-dist="${distBand(mins)}" data-hot="${hot ? 1 : 0}" data-text="${esc([t, tip, place, IDEA_CATS[cat]].join(' ').toLowerCase())}">
        <div class="i-emoji">${e}</div>
        <div class="i-body">
          <h3>${esc(t)}</h3>
          <p>${esc(tip)}</p>
          ${place ? `<div class="i-where"><a href="https://www.google.com/maps/search/${encodeURIComponent(place)}" target="_blank" rel="noopener">📍 ${isSearch(place) ? 'Find nearby' : esc(place.replace(/,? Kuala Lumpur$/, ''))}</a> · ~${mins} min drive</div>` : ''}
          <div class="i-tags">${hot ? '<span class="pill hot-pill">🔥 Trending</span>' : ''}<span class="pill">${IDEA_CATS[cat]}</span><span class="pill">${COST[cost]}${cost ? ' for two' : ''}</span></div>
        </div>
        <button class="btn small ${saved.has(t.toLowerCase()) ? 'saved' : ''}" data-act="save-idea" data-i="${i}">${saved.has(t.toLowerCase()) ? '✓ Saved' : '+ Save'}</button>
      </article>`).join('')}</div>
    <p class="empty" id="noIdeas" hidden>Nothing matches. Try another search or loosen a filter.</p>
  </section>`;
}
function bindIdeas(v) {
  const filter = () => {
    const q = ideaQuery.trim().toLowerCase(); let hits = 0;
    $$('.idea', v).forEach(el => {
      const catOk = ideaCat === 'all' || (ideaCat === 'hot' ? el.dataset.hot === '1' : el.dataset.cat === ideaCat);
      const on = catOk && (ideaCost === 'all' || el.dataset.cost === ideaCost) && (ideaDist === 'all' || el.dataset.dist === ideaDist) && (!q || el.dataset.text.includes(q));
      el.hidden = !on; hits += on;
    });
    $('#noIdeas', v).hidden = hits > 0;
  };
  $('#ideaSearch', v).addEventListener('input', e => { ideaQuery = e.target.value; filter(); });
  filter();
}

// ---- What's on (the next month of events) ------------------------------------------------
// events.json lives on the `events` branch. A GitHub Action (scripts/events.py) refreshes it every Friday at 5am,
// and the Find button asks it to run right away.
let week = null, weekAt = 0, weekErr = '', weekBusy = false, weekQuery = '', weekDaytime = false, weekEnd = false, weekWhen = 'all';
const evTitle = e => e.name.slice(0, 80);
async function loadWeek() {
  weekAt = Date.now();
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${S.repo() || guessRepo()}/events/events.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    week = await r.json(); weekErr = '';
  } catch { weekErr = navigator.onLine ? 'Couldn’t load the events.' : 'You’re offline.'; }
  if (tab === 'week' || tab === 'calendar') render();
}
async function findWeek() {
  if (weekBusy) return;
  const before = week?.updated || 0;
  weekBusy = true; render();
  try {
    if (!(await S.findEvents())) { await loadWeek(); return toast('The list refreshes every Friday morning. Connect your phones in ⚙ to search any time.', 5000); }
    toast('🔎 Searching KL… this takes about a minute');
    for (let i = 0; i < 18; i++) { // the Action takes 30–90s; give up after 3 minutes
      await sleep(10000);
      await loadWeek();
      if ((week?.updated || 0) > before) return toast(`🎟️ Found ${plural(week.events.length, 'event')} for the next month`);
    }
    toast('Still searching. Check back in a few minutes.');
  } catch (e) {
    toast(e.status === 403 || e.status === 404 ? 'Your GitHub token can’t start the search. It needs Contents: Read and write.' : 'Couldn’t start the search. Try again?', 5000);
  } finally { weekBusy = false; render(); }
}
/** Events by day, from today on. With `spread`, one that runs several days shows on each of them (the calendar);
 *  without, it shows once, under the day it starts or today if it already has (the list, so month-long shows don't repeat). */
function eventsByDay(spread = true) {
  const t = today(), out = {};
  for (const e of week?.events || []) {
    const first = e.date < t ? t : e.date, last = spread && e.end_date > e.date ? e.end_date : first;
    for (let ds = first; ds <= last && ds < week.to; ds = isoDay(new Date(parseDay(ds).getTime() + 864e5 + 36e5))) (out[ds] ||= []).push(e);
  }
  Object.values(out).forEach(l => l.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
const evWhen = (e, ds) => (e.date < ds ? `On till ${e.end_date === ds ? 'today' : fmtDay(e.end_date)}` : e.time ? fmtTime(e.time) : 'All day');
const isDaytime = e => e.time && e.time >= '07:00' && e.time < '18:00';
const isWeekend = ds => [0, 6].includes(parseDay(ds).getDay());
/** 'this' up to Sunday, 'next' the Monday–Sunday after, 'later' beyond. */
function weekOf(ds) {
  const t = parseDay(today()), sun = new Date(t); sun.setDate(t.getDate() + (7 - t.getDay()) % 7);
  const nextSun = new Date(sun); nextSun.setDate(sun.getDate() + 7);
  const d = parseDay(ds);
  return d <= sun ? 'this' : d <= nextSun ? 'next' : 'later';
}
function viewWeek() {
  const t = today(), saved = savedTitles();
  const days = eventsByDay(false);
  const findBtn = `<button class="btn primary" data-act="week-find" ${weekBusy ? 'disabled' : ''}>${weekBusy ? '🔎 Searching…' : '🔎 Find new events'}</button>`;
  return `
  <section class="week">
    <div class="section-head">
      <div><h1>What’s on in KL</h1><p class="muted">Events for the next month in KL and nearby, within about an hour of ${esc(HOME)}. Refreshed every Friday morning${week ? `, last ${ago(week.updated)}, from ${esc(week.source)}` : ''}.</p></div>
      <div class="head-actions">${findBtn}</div>
    </div>
    ${!week ? `<p class="empty">${weekErr ? `${esc(weekErr)} <button class="linkish" data-act="week-find">Try again</button>` : 'Loading events…'}</p>` : `
    <div class="filters">
      <input class="search" type="search" id="weekSearch" placeholder="Search events… (music, yoga, Bangsar)" value="${esc(weekQuery)}" aria-label="Search events">
      <div class="chips" role="group" aria-label="When">${[['all', 'Next month'], ['this', 'This week'], ['next', 'Next week'], ['later', 'Later']].map(([k, l]) => `<button class="chip" data-act="week-when" data-v="${k}" aria-pressed="${weekWhen === k}">${l}</button>`).join('')}</div>
      <div class="chips"><button class="chip" data-act="week-day" aria-pressed="${weekDaytime}">☀️ Daytime</button><button class="chip" data-act="week-end" aria-pressed="${weekEnd}">🗓️ Weekend</button></div>
    </div>
    ${Object.entries(days).map(([ds, evs]) => `
    <div class="ev-day" data-day="${ds}">
      <h2 class="col-title">${ds === t ? 'Today' : fmtDay(ds, LONG)}</h2>
      ${wxLine(ds)}
      <div class="act-grid">${evs.map(e => `
        <article class="act wk-ev" data-daytime="${isDaytime(e) ? 1 : 0}" data-text="${esc([e.name, e.venue, e.area, e.cat, e.summary].join(' ').toLowerCase())}">
          <div class="a-top"><span class="c-emoji">${esc(e.emoji)}</span><div><h3>${esc(e.name)}</h3>
            <div class="muted small">${evWhen(e, ds)}${e.end_date > e.date && e.date === ds ? ` · until ${fmtDay(e.end_date)}` : ''} · ~${e.km} km away</div></div></div>
          ${e.summary ? `<p>${esc(e.summary)}</p>` : ''}
          ${e.venue || e.area ? `<div class="i-where">${mapLink([e.venue, e.area].filter(Boolean).join(', '))}</div>` : ''}
          ${e.cat ? `<div class="i-tags"><span class="pill">${esc(e.cat)}</span></div>` : ''}
          <div class="card-actions">
            <a class="btn small" href="${esc(e.url)}" target="_blank" rel="noopener">Details ↗</a>
            <button class="btn small ghost ${saved.has(evTitle(e).toLowerCase()) ? 'saved' : ''}" data-act="save-ev" data-id="${esc(e.id)}">${saved.has(evTitle(e).toLowerCase()) ? '✓ In plans' : '+ Add to plans'}</button>
          </div>
        </article>`).join('')}</div>
    </div>`).join('')}
    <p class="empty" id="noEvents" hidden>${Object.keys(days).length ? 'Nothing matches. Try another word or turn off a filter.' : 'No events found yet. Tap Find new events.'}</p>`}
  </section>`;
}
function bindWeek(v) {
  if (Date.now() - weekAt > 30 * 6e4) loadWeek(); // first visit, or the app sat open for a while
  const s = $('#weekSearch', v); if (!s) return;
  const filter = () => {
    const q = weekQuery.trim().toLowerCase(); let hits = 0;
    $$('.ev-day', v).forEach(day => {
      let n = 0;
      const dayOk = (!weekEnd || isWeekend(day.dataset.day)) && (weekWhen === 'all' || weekOf(day.dataset.day) === weekWhen);
      $$('.wk-ev', day).forEach(el => { const on = dayOk && (!weekDaytime || el.dataset.daytime === '1') && (!q || el.dataset.text.includes(q)); el.hidden = !on; n += on; });
      day.hidden = !n; hits += n;
    });
    $('#noEvents', v).hidden = hits > 0;
  };
  s.addEventListener('input', e => { weekQuery = e.target.value; filter(); });
  filter();
}

// ---- Activities -------------------------------------------------------------------
let actQuery = '', actFree = false;
function viewActivities() {
  const saved = savedTitles();
  return `
  <section class="activities">
    <div class="section-head">
      <div><h1>Things to do together</h1><p class="muted">${ACTIVITY_GROUPS.reduce((n, g) => n + g.items.length, 0)} ways to watch shows in sync, play games and get closer, in the same room or miles apart.</p></div>
    </div>
    <div class="filters">
      <input class="search" type="search" id="actSearch" placeholder="Search… (drawing, Netflix, puzzle)" value="${esc(actQuery)}" aria-label="Search activities">
      <div class="chips"><button class="chip" data-act="act-free" aria-pressed="${actFree}">🆓 Free only</button>${ACTIVITY_GROUPS.map(g => `<button class="chip" data-act="jump" data-id="${g.id}">${g.title}</button>`).join('')}</div>
    </div>
    ${ACTIVITY_GROUPS.map((g, gi) => `
    <div class="act-group" id="grp-${g.id}">
      <h2 class="col-title">${g.title}</h2>
      <p class="muted group-blurb">${esc(g.blurb)}</p>
      <div class="act-grid">${g.items.map((a, ii) => `
        <article class="act" data-free="${/^free/i.test(a.cost) ? 1 : 0}" data-text="${esc([a.name, a.what, a.on, a.cost, g.title].join(' ').toLowerCase())}">
          <div class="a-top"><span class="c-emoji">${a.e}</span><div><h3>${esc(a.name)}</h3><div class="muted small">${esc(a.cost)} · ${esc(a.on)}</div></div></div>
          <p>${esc(a.what)}</p>
          <div class="card-actions">
            <a class="btn small" href="${esc(a.url)}" target="_blank" rel="noopener">Open ↗</a>
            <button class="btn small ghost ${saved.has(a.name.toLowerCase()) ? 'saved' : ''}" data-act="save-act" data-g="${gi}" data-i="${ii}">${saved.has(a.name.toLowerCase()) ? '✓ In plans' : '+ Add to plans'}</button>
          </div>
        </article>`).join('')}</div>
    </div>`).join('')}
    <p class="empty" id="noActs" hidden>Nothing matches. Try another word.</p>
  </section>`;
}
function bindActivities(v) {
  const filter = () => {
    const q = actQuery.trim().toLowerCase(); let hits = 0;
    $$('.act-group', v).forEach(grp => {
      let n = 0;
      $$('.act', grp).forEach(el => { const on = (!actFree || el.dataset.free === '1') && (!q || el.dataset.text.includes(q)); el.hidden = !on; n += on; });
      grp.hidden = !n; hits += n;
    });
    $('#noActs', v).hidden = hits > 0;
  };
  $('#actSearch', v).addEventListener('input', e => { actQuery = e.target.value; filter(); });
  filter();
}

// ---- Memories ---------------------------------------------------------------------
function viewMemories() {
  const done = dates().filter(d => d.status === 'done').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const photos = done.reduce((s, d) => s + pics(d.key).length, 0);
  const rated = done.filter(d => d.rating), avg = rated.length ? (rated.reduce((s, d) => s + d.rating, 0) / rated.length).toFixed(1) : '–';
  const together = daysTogether(), spent = done.reduce((t, d) => t + (Number(d.budget) || 0), 0);
  let lastMonth = '';
  return `
  <section class="memories">
    <div class="section-head">
      <div><h1>Our memories</h1><p class="muted">Every date we’ve been on, with the photos.</p></div>
      <div class="head-actions">${photos ? '<button class="btn primary" data-act="slideshow">▶ Slideshow</button>' : ''}<button class="btn ghost" data-act="log-past">+ Add a past date</button></div>
    </div>
    <div class="stats">
      <div><b>${done.length}</b><span>dates</span></div>
      <div><b>${photos}</b><span>photos</span></div>
      <div><b>${avg}${rated.length ? '<small>★</small>' : ''}</b><span>average rating</span></div>
      <div><b>${together ?? '–'}</b><span>${together != null ? 'days together' : '<button class="linkish" data-act="settings">set your date</button>'}</span></div>
      ${spent ? `<div><b>RM${spent.toLocaleString()}</b><span>spent on dates</span></div>` : ''}
    </div>
    ${done.length ? `<input class="search" type="search" id="memSearch" placeholder="Search memories…" value="${esc(archiveQuery)}" aria-label="Search memories">
    <ol class="timeline">${done.map((d, i) => {
      const month = d.date ? parseDay(d.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Sometime';
      const head = month !== lastMonth ? `<li class="month" aria-hidden="true">${esc(month)}</li>` : ''; lastMonth = month;
      return `${head}
      <li class="memory" data-key="${esc(d.key)}" data-text="${esc([d.title, d.place, d.notes, d.best, d.mood].join(' ').toLowerCase())}">
        <div class="mem-date">${d.date ? fmtDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' }) : ''}${d.time ? ' · ' + fmtTime(d.time) : ''}${i === done.length - 1 && done.length > 1 ? ' · <span class="first">our first one 🥹</span>' : ''}</div>
        <h3>${esc(d.emoji || '💖')} ${esc(d.title)}</h3>
        <div class="mem-meta">${d.rating ? `<span class="stars-ro" aria-label="${plural(d.rating, 'star')}">${'★'.repeat(d.rating)}<span>${'★'.repeat(5 - d.rating)}</span></span>` : ''}${d.mood ? `<span class="pill">${esc(d.mood)}</span>` : ''}${d.place ? mapLink(d.place) : ''}</div>
        ${d.best ? `<p class="best">“${esc(d.best)}”</p>` : ''}
        ${d.notes ? `<p class="notes">${esc(d.notes)}</p>` : ''}
        <div class="gallery">${pics(d.key).map((p, j) => thumb(d.key, p, j)).join('')}
          <button class="thumb add" data-act="capture" aria-label="Add photos">＋<span>photos</span></button></div>
        <div class="card-actions"><span class="spacer"></span><button class="btn small ghost" data-act="retro">Edit</button><button class="btn small ghost danger" data-act="delete" aria-label="Delete">🗑</button></div>
      </li>`;
    }).join('')}</ol>
    <p class="empty" id="noHits" hidden>No memories match that search.</p>`
    : `<div class="empty big"><div>📷</div><p>No memories yet.<br>After a date, tap <b>We went! ✓</b> on its plan, or add one you’ve already been on.</p></div>`}
  </section>`;
}
function bindMemories(v) {
  const s = $('#memSearch', v); if (!s) return;
  const filter = () => {
    archiveQuery = s.value; const q = s.value.trim().toLowerCase(); let hits = 0;
    $$('.memory', v).forEach(c => { const on = !q || c.dataset.text.includes(q); c.hidden = !on; hits += on; });
    $$('.month', v).forEach(mh => { mh.hidden = !!q; });
    $('#noHits', v).hidden = hits > 0;
  };
  s.addEventListener('input', filter); filter();
}

// ---- photos ---------------------------------------------------------------------
function hydratePhotos(root) {
  $$('img[data-photo]', root).forEach(img => S.photoURL(img.dataset.photo)
    .then(src => { img.src = src; }).catch(() => img.closest('.thumb')?.classList.add('missing')));
}
let photoTarget = null;
function capture(key) { photoTarget = key; $('#photoInput').click(); }
/** Decode an image file. createImageBitmap fails on some phone formats that an <img> can still read. */
async function decode(file) {
  try { return await createImageBitmap(file); } catch {}
  const url = URL.createObjectURL(file), img = new Image();
  try { img.src = url; await img.decode(); return img; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
/** Draw any image source (photo, bitmap, live video frame) into a JPEG at most `max` px on the long side. */
function toJpeg(src, w, h, max = 1600) {
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.82));
}
async function shrink(file) {
  const img = await decode(file);
  try { return await toJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height); } finally { img.close?.(); }
}
function todaysDateKey() {
  const t = today(), d = dates().find(x => x.date === t && x.status !== 'idea');
  if (d) return d.key;
  const key = 'date:' + S.uid(), now = new Date();
  S.put(key, { title: 'Spontaneous hangout', emoji: '✨', date: t, time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, status: 'planned', by: me(), n: nextN(), photos: [] },
    'feat: spontaneous hangout ✨', true);
  return key;
}
async function onPhotos(e) {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  const target = photoTarget; photoTarget = null;
  toast(`📸 Saving ${plural(files.length, 'photo')}…`);
  const blobs = [];
  for (const f of files) {
    try { blobs.push(await shrink(f)); }
    catch (err) {
      console.error(err);
      toast(/hei[cf]/i.test(f.type + f.name) ? `Couldn’t open ${f.name}: this browser can’t read HEIC photos. Use the 📸 button, or set your camera to save JPEG.` : `Couldn’t open ${f.name}`, 6000);
    }
  }
  await attachPhotos(blobs, target);
}
async function attachPhotos(blobs, target) {
  const ids = [];
  for (const b of blobs) {
    try { ids.push(await S.addPhoto(b)); } catch (err) { console.error(err); toast('Couldn’t save a photo on this phone. Is storage full?', 5000); }
  }
  if (!ids.length) return;
  const key = (target && S.get(target)) ? target : todaysDateKey(); // only create a hangout once a photo actually worked
  const d = S.get(key);
  const at = Date.now();
  ids.forEach((id, i) => S.put('photo:' + id, { date: key, at: at + i, by: me() }, null, true));
  S.note(`feat(moments): +${plural(ids.length, 'photo')} to "${d.title}" 📸`);
  toast(`💾 ${plural(ids.length, 'photo')} added to “${d.title}”`);
}
$('#photoInput').addEventListener('change', onPhotos);
$('#cameraInput').addEventListener('change', onPhotos);

// ---- in-app camera ----------------------------------------------------------------
// 📸 opens a camera inside the page instead of handing off to the phone's camera app. The handoff failed on
// Fofo's Galaxy S23: Samsung cameras can return HEIC (Chrome on Android can't read it), and a blocked camera
// permission fails silently. Shots here are always JPEG, and a blocked camera says so. No camera API: the label's
// native file input still works.
const hasCamera = () => !!navigator.mediaDevices?.getUserMedia;
async function openCamera() {
  let facing = 'environment', stream = null, busy = false;
  const shots = [];
  const m = openModal(`
    <div class="cam">
      <video id="camVideo" playsinline autoplay muted></video>
      <div class="cam-flash" id="camFlash"></div>
      <p class="cam-msg" id="camMsg" hidden></p>
      <div class="cam-shots" id="camShots" aria-live="polite"></div>
      <div class="cam-bar">
        <button class="cam-btn" data-cam="gallery" aria-label="Pick from gallery">🖼️</button>
        <button class="cam-shutter" data-cam="shoot" aria-label="Take photo" disabled></button>
        <button class="cam-btn" data-cam="flip" aria-label="Switch camera">🔄</button>
      </div>
      <button class="cam-done btn primary" data-cam="done">Done</button>
    </div>`, 'camera');
  const video = $('#camVideo', m), msg = $('#camMsg', m), shutter = $('[data-cam="shoot"]', m);
  const stop = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; };
  const say = t => { msg.hidden = !t; msg.textContent = t || ''; };
  const start = async () => {
    stop(); shutter.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      if (!m.open) return stop(); // closed while the permission prompt was up
      video.srcObject = stream; await video.play().catch(() => {});
      video.classList.toggle('mirror', facing === 'user');
      shutter.disabled = false; say('');
    } catch (e) {
      console.error('camera', e);
      say(e.name === 'NotAllowedError' ? (isInstalled() ? 'The camera is blocked. Long-press the hangouts icon → App info → Permissions → Camera → Allow, then try again. Or pick photos with 🖼️.'
        : 'The camera is blocked. Tap the 🔒 or ⓘ next to the address, set Camera to Allow, and if Android asks, let Chrome use the camera. Or pick photos with 🖼️.')
        : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'No camera found. Pick photos with 🖼️ instead.'
        : e.name === 'NotReadableError' ? 'Another app is using the camera. Close it and try again.' : `Couldn’t start the camera (${e.name}). Pick photos with 🖼️ instead.`);
    }
  };
  const finish = () => { stop(); $$('#camShots img', m).forEach(i => URL.revokeObjectURL(i.src)); const b = shots.splice(0); if (b.length) { toast(`📸 Saving ${plural(b.length, 'photo')}…`); attachPhotos(b, null); } };
  m.addEventListener('close', finish, { once: true }); // closing any way (✕, back button, tapping outside) keeps the shots
  m.onclick = async e => {
    const a = e.target.closest('[data-cam]')?.dataset.cam;
    if (a === 'done') return m.close();
    if (a === 'flip') { facing = facing === 'user' ? 'environment' : 'user'; return start(); }
    if (a === 'gallery') { photoTarget = null; return $('#photoInput').click(); }
    if (a !== 'shoot' || busy || !video.videoWidth) return;
    busy = true;
    try {
      const blob = await toJpeg(video, video.videoWidth, video.videoHeight);
      shots.push(blob);
      const fl = $('#camFlash', m); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      navigator.vibrate?.(15);
      const t = document.createElement('img'); t.src = URL.createObjectURL(blob); t.alt = `Photo ${shots.length}`;
      $('#camShots', m).append(t);
      $('[data-cam="done"]', m).textContent = `Done · ${plural(shots.length, 'photo')}`;
    } catch (err) { console.error(err); toast('Couldn’t take that one. Try again?'); }
    busy = false;
  };
  start();
}
const fab = $('#captureFab');
fab.addEventListener('click', e => { photoTarget = null; if (hasCamera()) { e.preventDefault(); openCamera(); } }); // else the label opens #cameraInput
fab.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoTarget = null; hasCamera() ? openCamera() : $('#cameraInput').click(); } });

// lightbox: a list of {key, id} so it can show one date's photos or a slideshow of all of them
let lb = { list: [], i: 0, timer: null }, lbSwiped = 0;
const photosOf = key => pics(key).map(id => ({ key, id }));
function openLightbox(list, i, play = false) {
  lb = { list, i, timer: null, files: null }; showLb();
  const all = $('#lbSaveAll'); all.hidden = list.length < 2; all.disabled = true; all.textContent = 'Preparing…';
  const mine = lb;
  photoFiles(list).then(files => { if (lb !== mine) return; lb.files = files; all.disabled = false; all.textContent = `Save all (${files.length})`; });
  const d = $('#lightbox'); if (!d.open) d.showModal();
  setPlay(play);
}
function setPlay(on) {
  clearInterval(lb.timer); lb.timer = on ? setInterval(() => { lb.i++; showLb(); }, 3500) : null;
  const b = $('#lbPlay'); b.textContent = on ? '⏸ Pause' : '▶ Play'; b.hidden = lb.list.length < 2;
}
function showLb() {
  lb.list = lb.list.filter(p => pics(p.key).includes(p.id)); // drop photos removed meanwhile
  if (!lb.list.length) return $('#lightbox').close();
  lb.i = (lb.i + lb.list.length) % lb.list.length;
  const { key, id } = lb.list[lb.i], d = S.get(key), img = $('#lbImg');
  img.removeAttribute('src');
  S.photoURL(id).then(src => { if (lb.list[lb.i]?.id === id) img.src = src; }).catch(() => toast('This photo hasn’t reached this phone yet'));
  img.alt = `${d.title}, photo ${lb.i + 1}`;
  $('#lbCap').textContent = `${d.emoji || ''} ${d.title}${d.date ? ' · ' + fmtDay(d.date, { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · ${lb.i + 1} of ${lb.list.length}`;
  $$('.lb-nav').forEach(b => { b.hidden = lb.list.length < 2; });
}
$('#lightbox').addEventListener('close', () => setPlay(false));
$('#lightbox').addEventListener('click', e => {
  const a = e.target.closest('[data-lb]')?.dataset.lb;
  if (a === 'close' || (e.target === e.currentTarget && performance.now() - lbSwiped > 400)) return $('#lightbox').close();
  if (a === 'prev') { lb.i--; showLb(); setPlay(false); }
  if (a === 'next') { lb.i++; showLb(); setPlay(false); }
  if (a === 'play') setPlay(!lb.timer);
  if (a === 'save' || a === 'saveall') {
    if (!lb.files) return toast('One moment, still preparing…');
    if (a === 'saveall') return savePhotos(lb.files.filter(x => lb.list.some(p => p.id === x.id))); // skip ones removed meanwhile
    return savePhotos(lb.files.filter(x => x.id === lb.list[lb.i]?.id));
  }
  if (a === 'delete') {
    const { key, id } = lb.list[lb.i], d = S.get(key);
    if (d.photos?.includes(id)) S.put(key, { ...d, photos: d.photos.filter(p => p !== id) }, `revert(moments): remove a photo from "${d.title}"`);
    else S.remove('photo:' + id, `revert(moments): remove a photo from "${d.title}"`);
    showLb();
  }
});
addEventListener('keydown', e => {
  if (!$('#lightbox').open) return;
  if (e.key === 'ArrowLeft') { lb.i--; showLb(); setPlay(false); }
  if (e.key === 'ArrowRight') { lb.i++; showLb(); setPlay(false); }
});
{ let x0 = null;
  $('#lightbox').addEventListener('pointerdown', e => { x0 = e.target.closest('button') ? null : e.clientX; });
  $('#lightbox').addEventListener('pointerup', e => {
    if (x0 != null && Math.abs(e.clientX - x0) > 50) {
      lb.i += e.clientX < x0 ? 1 : -1; showLb(); setPlay(false);
      lbSwiped = performance.now(); // a mouse swipe ends in a click on the backdrop: don't let it close the lightbox
    }
    x0 = null;
  });
}

// ---- global click actions -------------------------------------------------------
$('#view').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const key = btn.closest('[data-key]')?.dataset.key, d = key && S.get(key) ? { ...S.get(key), key } : null;
  const monthDays = () => { const y = calCursor.getFullYear(), mo = calCursor.getMonth(); return Array.from({ length: new Date(y, mo + 1, 0).getDate() }, (_, i) => new Date(y, mo, i + 1)); };
  ({
    tos: showTos,
    'note-new': writeNote,
    install,
    'install-hide': () => { S.ls.set('installHide', true); render(); toast('You can still add it from ⚙ Settings'); },
    'note-all': allNotes,
    settings: openSettings,
    icat: () => { ideaCat = btn.dataset.v; render(); },
    icost: () => { ideaCost = btn.dataset.v; render(); },
    idist: () => { ideaDist = btn.dataset.v; render(); },
    'save-idea': () => { saveIdea(ideaFromRow(DATE_IDEAS[btn.dataset.i])); render(); },
    'save-act': () => { const a = ACTIVITY_GROUPS[btn.dataset.g].items[btn.dataset.i]; saveIdea({ emoji: a.e, title: a.name, notes: a.what, link: a.url }); render(); },
    'act-free': () => { actFree = !actFree; render(); },
    'week-find': findWeek,
    'wo-open': () => { const el = $('#wo-' + btn.dataset.day); if (el) { el.open = true; el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); } },
    'week-day': () => { weekDaytime = !weekDaytime; render(); },
    'week-when': () => { weekWhen = btn.dataset.v; render(); },
    'week-end': () => { weekEnd = !weekEnd; render(); },
    'save-ev': () => { const e = week?.events.find(x => x.id === btn.dataset.id); if (e) saveIdea({ emoji: e.emoji, title: evTitle(e), notes: e.summary || undefined, link: e.url, place: e.venue || e.area || undefined, date: e.date, time: e.time || undefined }); render(); },
    jump: () => $('#grp-' + btn.dataset.id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }),
    'copy-invite': async () => {
      const url = location.href.split('#')[0] + '#ask';
      try {
        if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ title: 'I have a question for you 💌', url });
        else { await navigator.clipboard.writeText(url); toast('🔗 Link copied'); }
      } catch (err) { if (err?.name !== 'AbortError') toast(url, 6000); }
    },
    'cal-prev': () => { calCursor.setMonth(calCursor.getMonth() - 1); render(); },
    'cal-next': () => { calCursor.setMonth(calCursor.getMonth() + 1); render(); },
    'cal-today': () => { calCursor = new Date(); calCursor.setDate(1); render(); },
    'plan-on': () => {
      const day = btn.dataset.day, undated = dates().filter(x => !x.date && (x.status === 'planned' || x.status === 'proposed'));
      if (!undated.length) return openDateForm({ date: day, status: 'planned' });
      const m = openModal(`
        <h2>${fmtDay(day, LONG)}</h2>
        <p class="muted">Put one of these on this day, or plan something new.</p>
        <div class="share-grid">${undated.map(x => `<button class="btn" data-pick="${esc(x.key)}">${esc(x.emoji || '💖')} ${esc(x.title)}</button>`).join('')}
          <button class="btn ghost" data-pick="">+ Something new</button></div>`);
      m.onclick = e => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        if (!b.dataset.pick) return openDateForm({ date: day, status: 'planned' });
        const x = S.get(b.dataset.pick);
        S.put(b.dataset.pick, { ...x, date: day }, `feat(plans): "${x.title}" on ${day}`); m.close(); toast(`📅 ${x.title} is on ${fmtDay(day)}`);
      };
    },
    weekends: () => {
      const t = today(); let c = 0;
      monthDays().forEach(dt => { const ds = isoDay(dt); if ((dt.getDay() === 0 || dt.getDay() === 6) && ds >= t && !isFree(me(), ds)) { S.put(`free:${me()}:${ds}`, { v: true }, null, true); c++; } });
      if (c) S.note(`feat(calendar): ${nameOf(me())} is free on ${plural(c, 'weekend day')}`); else toast('Your weekends are already marked');
    },
    'clear-month': () => {
      const t = today(); let c = 0;
      monthDays().forEach(dt => { const ds = isoDay(dt); if (ds >= t && isFree(me(), ds)) { S.put(`free:${me()}:${ds}`, { v: false }, null, true); c++; } });
      if (c) S.note(`chore(calendar): ${nameOf(me())} cleared ${calCursor.toLocaleDateString(undefined, { month: 'long' })}`);
    },
    whoami: pickMe,
    new: () => openDateForm({ status: 'idea' }),
    spin,
    edit: () => openDateForm(d),
    retro: () => openDateForm(d, true),
    'log-past': () => openDateForm({ status: 'done', date: today() }, true),
    propose: () => {
      S.put(key, { ...d, status: 'proposed', by: me() }, `feat(rsvp): ${nameOf(me())} asked "${d.title}" 💌`);
      notify('ask', `💌 ${nameOf(me())} has a question for you`, 'Will you go on a date with me?');
      location.hash = '#ask';
    },
    ship: () => { S.put(key, { ...d, status: 'done' }, `feat(memories): "${d.title}" 💖`); burst(); toast('💖 Saved to memories'); openDateForm({ ...S.get(key), key }, true); },
    capture: () => capture(key),
    share: () => openShare(d),
    photo: () => openLightbox(photosOf(key), Number(btn.dataset.i)),
    slideshow: () => {
      const all = dates().filter(x => x.status === 'done').sort((a, b) => (a.date || '').localeCompare(b.date || '')).flatMap(x => photosOf(x.key));
      if (all.length) openLightbox(all, 0, true);
    },
    delete: () => {
      openModal(`<h2>Delete this?</h2><p class="muted">“${esc(d.title)}”${pics(key).length ? ` and its ${plural(pics(key).length, 'photo')}` : ''} will be removed for both of you.</p>
        <div class="actions"><button class="btn ghost" data-close>Keep it</button><button class="btn danger-solid" id="confirmDel">Delete</button></div>`);
      $('#confirmDel').onclick = () => {
        S.all('photo:').filter(p => p.date === key).forEach(p => S.remove(p.key, null));
        S.remove(key, `revert: delete "${d.title}"`); $('#modal').close(); toast('Deleted');
      };
    },
  })[btn.dataset.act]?.();
});


// ---- saving photos to the phone (then Google Photos backs them up) -----------------
/** Load photos as File objects ahead of time: iPhones only allow the share sheet right after a tap. */
async function photoFiles(list) {
  const out = [];
  for (const [i, { key, id }] of list.entries()) {
    try {
      const blob = await (await fetch(await S.photoURL(id))).blob();
      const d = S.get(key), name = `${(d?.title || 'hangout').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'hangout'}-${d?.date || 'photo'}-${i + 1}.jpg`;
      out.push({ id, file: new File([blob], name, { type: 'image/jpeg' }) });
    } catch { /* photo not on this phone yet: skip it */ }
  }
  return out;
}
async function savePhotos(items) {
  const files = items.map(x => x.file);
  if (!files.length) return toast('Those photos haven’t reached this phone yet');
  if (matchMedia('(pointer:coarse)').matches && navigator.canShare?.({ files })) {
    try { await navigator.share({ files }); return; }
    catch (e) { if (e.name === 'AbortError') return; if (e.name === 'NotAllowedError') return toast('Tap Save again'); }
  }
  for (const f of files) { // desktop: plain downloads
    const url = URL.createObjectURL(f);
    Object.assign(document.createElement('a'), { href: url, download: f.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    await sleep(250);
  }
  toast(`⬇ ${plural(files.length, 'photo')} downloaded`);
}

// ---- share + calendar -------------------------------------------------------------
/** Hand a file to the user: share sheet on phones (works in home-screen apps), download elsewhere. */
async function saveFile(name, text, type) {
  const file = new File([text], name, { type });
  if (matchMedia('(pointer:coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stamp = (d, t) => d.replace(/-/g, '') + (t ? 'T' + t.replace(':', '') + '00' : '');
function eventTimes(d) {
  if (!d.time) { const next = isoDay(new Date(parseDay(d.date).getTime() + 864e5)); return [stamp(d.date), stamp(next)]; }
  const end = new Date(whenOf(d) + 2 * 36e5);
  return [stamp(d.date, d.time), stamp(isoDay(end), `${pad(end.getHours())}:${pad(end.getMinutes())}`)];
}
function planText(d) {
  return [`${d.emoji || '💖'} ${d.title}`, d.date ? `📅 ${fmtDay(d.date, LONG)}${d.time ? ', ' + fmtTime(d.time) : ''}` : '📅 Date to be decided',
    d.place && `📍 ${d.place}`, d.notes && `📝 ${d.notes}`, d.link].filter(Boolean).join('\n');
}
function openShare(d) {
  const site = location.href.split('#')[0];
  const msg = `${d.status === 'proposed' ? 'I have a question for you 💌\n\n' : ''}${planText(d)}\n\n${site}${d.status === 'proposed' ? '#ask' : '#plans'}`;
  let cal = '';
  if (d.date) {
    const [a, b] = eventTimes(d);
    const g = new URLSearchParams({ action: 'TEMPLATE', text: `${d.emoji || ''} ${d.title}`.trim(), dates: `${a}/${b}`, details: d.notes || '', location: d.place || '', ctz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    cal = `<a class="btn" href="https://calendar.google.com/calendar/render?${g}" target="_blank" rel="noopener">📅 Google Calendar</a>
      <button class="btn" id="shIcs">🍎 Apple / Outlook calendar</button>`;
  }
  const m = openModal(`
    <h2>Share “${esc(d.title)}”</h2>
    <pre class="share-preview">${esc(msg)}</pre>
    <div class="share-grid">
      <a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 WhatsApp</a>
      <button class="btn" id="shCopy">📋 Copy text</button>
      ${cal || '<p class="muted small">Add a date to this plan to put it in your calendar.</p>'}
    </div>
    <div class="actions"><button class="btn ghost" data-close>Done</button></div>`);
  $('#shCopy', m).onclick = async () => { try { await navigator.clipboard.writeText(msg); toast('📋 Copied'); } catch { toast('Couldn’t copy. Select the text above instead.'); } };
  const ics = $('#shIcs', m);
  if (ics) ics.onclick = () => {
    const [a, b] = eventTimes(d), e = x => String(x || '').replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const dt = d.time ? ['DTSTART:' + a, 'DTEND:' + b] : ['DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + b];
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hangouts//EN', 'BEGIN:VEVENT', `UID:${d.key.replace(':', '-')}@hangouts`, 'DTSTAMP:' + now, ...dt,
      'SUMMARY:' + e(`${d.emoji || ''} ${d.title}`.trim()), d.place && 'LOCATION:' + e(d.place), d.notes && 'DESCRIPTION:' + e(d.notes),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(d.title), 'TRIGGER:-PT2H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    saveFile(`${d.title.replace(/[^\w\- ]+/g, '').trim() || 'date'}.ics`, body, 'text/calendar');
  };
}

// ---- notifications ------------------------------------------------------------------
// Web Push with no server of our own: the sender's phone asks GitHub Actions (notify.yml) to deliver it,
// passing the other person's push subscriptions, which live in the encrypted shared data as push:<person>:<device>.
// The repo is public, so titles stay generic and never include the text of a note.
const VAPID = 'BO1ihzt72rnPOfdwvC-E1JBNykAWJX6Qc02CZeLd3LQjgBOMP9nQjXpaCREPbda-GNoDZ8RZp2hnuXhP4q_3N6Y';
const NOTIFY_TYPES = { love: '💖 I love yous', notes: '💌 Love notes', ask: '💍 Date questions', poop: '💨 Toots' };
const deviceId = () => { let id = S.ls.get('device', null); if (!id) { id = S.uid(); S.ls.set('device', id); } return id; };
const pushKey = (p = me()) => `push:${p}:${deviceId()}`;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const pushOn = () => pushSupported() && Notification.permission === 'granted' && !!S.get(pushKey());
const deviceName = () => (/iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android phone' : 'computer');
async function subscribe() {
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription())
    || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(VAPID.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)) });
}
async function enablePush() {
  if (!S.isSynced()) throw new Error('Connect your phones first (above). Notifications travel through the same sync.');
  if (!pushSupported()) throw new Error(isIOS() && !isInstalled() ? 'On iPhone, add hangouts to your home screen first, then open it from there and turn this on.' : 'This browser can’t show notifications.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your phone’s settings, then try again.');
  const sub = await subscribe();
  S.put(pushKey(), { sub: sub.toJSON(), prefs: S.get(pushKey())?.prefs || { love: true, notes: true, ask: true, poop: true }, device: deviceName(), at: Date.now() }, `feat(notify): ${nameOf(me())} turned on notifications 🔔`);
}
async function disablePush() {
  try { await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription().then(s => s?.unsubscribe()); } catch {}
  if (S.get(pushKey())) S.remove(pushKey(), `chore(notify): ${nameOf(me())} turned off notifications 🔕`);
}
/** Keep this phone's subscription current: browsers rotate them, and "Not you?" moves the phone to the other person. */
async function pushCheck() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const old = S.get(pushKey(other(me()))), rec = S.get(pushKey()) || old;
  if (old) S.remove(pushKey(other(me())), null);
  if (!rec) return;
  try {
    const sub = await subscribe();
    if (sub.endpoint !== S.get(pushKey())?.sub?.endpoint) S.put(pushKey(), { ...rec, sub: sub.toJSON(), at: Date.now() }, 'chore(notify): refresh this phone 🔔');
  } catch (e) { console.warn('push check failed', e); }
}
/** Notify `to` (the other person by default) on every phone where they allow this type. Fire and forget. */
async function notify(type, title, body, url = '#ask', to = other(me())) {
  const subs = S.all(`push:${to}:`).filter(r => r.sub && r.prefs?.[type] !== false).map(r => r.sub);
  if (!subs.length) return false;
  try { return await S.dispatch('notify', { subs, title, body, url, tag: type }); } catch (e) { console.warn('notify failed', e); return false; }
}
navigator.serviceWorker?.addEventListener('message', e => {
  if (e.data?.type === 'push') S.sync();
  if (e.data?.type === 'open') { location.hash = e.data.hash; S.sync(); }
});
function notifyBlock() {
  const them = nameOf(other(me())), theirs = S.all(`push:${other(me())}:`).length;
  const partner = `<p class="small muted">${theirs ? `🔔 ${esc(them)} has notifications on` : `🔕 ${esc(them)} hasn’t turned notifications on yet, so they’ll only see things when they open the app.`}</p>`;
  if (!S.isSynced()) return '<p class="small muted">Connect your phones first. Notifications travel through the same sync.</p>';
  if (!pushSupported() && !(isIOS() && !isInstalled())) return '<p class="small muted">This browser can’t show notifications.</p>';
  const on = pushOn(), prefs = S.get(pushKey())?.prefs || {};
  return `
    <p class="small muted">${on ? '✅ On for this phone.' : `Get a buzz when ${esc(them)} sends you love, a note, or asks you out.`}${isIOS() && !isInstalled() ? ' On iPhone this only works from the home-screen app.' : ''}</p>
    ${on ? `<div class="notif-types">${Object.entries(NOTIFY_TYPES).map(([k, l]) => `<label class="check"><input type="checkbox" data-notif="${k}" ${prefs[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</div>` : ''}
    <div class="actions left">${on ? '<button type="button" class="btn ghost small" data-s="notif-test">Send me a test</button><button type="button" class="btn ghost small danger" data-s="notif-off">Turn off</button>'
      : '<button type="button" class="btn primary small" data-s="notif-on">🔔 Turn on notifications</button>'}</div>
    ${partner}`;
}

// ---- I love you -----------------------------------------------------------------------
// Each tap animates straight away. Taps are batched: 1.8s after the last one (or when the app is hidden),
// one love:<id> {by, n} record is saved and one notification goes out, "I love you ×n".
const LOVE_HEARTS = ['💖', '💗', '💕', '❤️', '💘', '💞', '🩷', '💓'];
const LOVE_COMBO = { 5: 'aww', 10: 'so much ❤️', 20: 'on fire 🔥', 30: 'obsessed', 50: 'unstoppable 🚀', 75: 'down bad 🥹', 100: 'legendary 👑', 200: 'forever and ever ♾️' };
let loveN = 0, loveTimer = null;
const loveTotal = p => S.all('love:').filter(l => l.by === p).reduce((s, l) => s + (l.n || 0), 0);
const rand = (a, b) => a + Math.random() * (b - a);
function floatUp(text, x, y, cls, opts = {}) {
  const el = document.createElement('span'); el.className = cls; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  $('#loveFx').append(el);
  const dx = opts.dx ?? rand(-70, 70), up = opts.up ?? rand(160, 260), rot = rand(-35, 35), s = opts.scale ?? rand(.9, 1.5);
  const a = el.animate([
    { transform: 'translate(-50%, -50%) scale(.2) rotate(0deg)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * .35}px), calc(-50% - ${up * .3}px)) scale(${s * 1.15}) rotate(${rot * .5}deg)`, opacity: 1, offset: .25 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% - ${up}px)) scale(${s * .8}) rotate(${rot}deg)`, opacity: 0 },
  ], { duration: opts.duration ?? rand(1000, 1500), easing: 'cubic-bezier(.2, .7, .3, 1)' });
  a.onfinish = () => el.remove();
}
function loveTap(e) {
  const fab = $('#loveFab'), r = fab.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  loveN++;
  clearTimeout(loveTimer); loveTimer = setTimeout(loveSend, 1800);
  fab.classList.add('busy'); fab.style.setProperty('--heat', Math.min(loveN / 40, 1));
  const c = $('#loveCount'); c.hidden = false; c.textContent = `×${loveN}`;
  navigator.vibrate?.(loveN % 10 ? 8 : [12, 40, 24]);
  if (reduceMotion) return;
  fab.animate([{ transform: 'scale(1)' }, { transform: 'scale(.84)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  c.animate([{ transform: 'scale(1.6) rotate(-8deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  const ring = document.createElement('span'); ring.className = 'love-ring'; ring.style.left = cx + 'px'; ring.style.top = cy + 'px';
  $('#loveFx').append(ring); ring.animate([{ transform: 'translate(-50%, -50%) scale(.6)', opacity: .7 }, { transform: 'translate(-50%, -50%) scale(2.8)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => ring.remove();
  const burst = 1 + Math.min(Math.floor(loveN / 8), 4); // more hearts per tap as the streak grows
  for (let i = 0; i < burst; i++) setTimeout(() => floatUp(LOVE_HEARTS[Math.floor(Math.random() * LOVE_HEARTS.length)], cx + rand(-10, 10), cy - 10, 'love-float'), i * 60);
  if (LOVE_COMBO[loveN]) floatUp(LOVE_COMBO[loveN], cx, cy - 40, 'love-combo', { dx: 0, up: 120, scale: 1, duration: 1600 });
  if (loveN % 10 === 0 && window.confetti) {
    const shapes = confetti.shapeFromText ? LOVE_HEARTS.slice(0, 3).map(t => confetti.shapeFromText({ text: t, scalar: 2 })) : undefined;
    confetti({ particleCount: 24 + Math.min(loveN, 60), spread: 70, startVelocity: 32, scalar: 1.6, ticks: 140, shapes, angle: 75, origin: { x: cx / innerWidth, y: cy / innerHeight } });
  }
}
function loveSend() {
  clearTimeout(loveTimer); loveTimer = null;
  const n = loveN; if (!n) return;
  loveN = 0;
  const fab = $('#loveFab'), c = $('#loveCount');
  S.put('love:' + S.uid(), { by: me(), n, at: Date.now() }, `feat(love): ${nameOf(me())} said I love you ×${n} 💖`);
  notify('love', `💖 ${nameOf(me())} loves you`, n === 1 ? 'I love you!' : `I love you ×${n.toLocaleString()}`);
  toast(`💌 Sent to ${nameOf(other(me()))}: I love you${n > 1 ? ` ×${n}` : ''} · ${loveTotal(me()).toLocaleString()} all time`);
  fab.classList.remove('busy'); fab.style.setProperty('--heat', 0);
  if (reduceMotion) { c.hidden = true; return; }
  c.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: 'translate(0, -16px) scale(1.3)', opacity: 1, offset: .3 }, { transform: 'translate(40px, -60vh) scale(.6)', opacity: 0 }],
    { duration: 900, easing: 'cubic-bezier(.5, 0, .75, 0)' }).onfinish = () => { if (!loveN) c.hidden = true; };
}
addEventListener('pagehide', loveSend);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && loveSend());

// Received love: a full-screen show. Seen keys are remembered per phone, so clock differences between phones don't matter.
const loveSeen = () => new Set(S.ls.get('loveSeen', []));
function loveAlert() {
  const loves = S.all('love:'), seen = loveSeen();
  let since = S.ls.get('loveSince', 0);
  if (!since) S.ls.set('loveSince', since = Date.now() - 6 * 36e5); // a new phone shouldn't replay old history on its first sync
  const fresh = loves.filter(l => l.by !== me() && !seen.has(l.key) && l.at > since);
  if (!fresh.length || $('#lock').hidden === false) return;
  S.ls.set('loveSeen', loves.map(l => l.key)); // only keys that still exist, so the list never grows past the records
  showLove(fresh[0].by, fresh.reduce((s, l) => s + (l.n || 0), 0), fresh.length > 1);
}
function showLove(by, n, away) {
  document.querySelector('.love-show')?.remove();
  const el = document.createElement('div');
  el.className = 'love-show'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${nameOf(by)} loves you, ${n} times`);
  el.innerHTML = `
    <div class="ls-rain" aria-hidden="true"></div>
    <div class="ls-card">
      <div class="ls-heart" aria-hidden="true"><span>💖</span></div>
      <p class="ls-from">${esc(nameOf(by))}</p>
      <h2 class="ls-title">loves you</h2>
      <div class="ls-count">×<b>${reduceMotion ? n.toLocaleString() : 0}</b></div>
      <p class="ls-sub">${away ? 'while you were away · ' : ''}${loveTotal(by).toLocaleString()} I love yous all time</p>
      <button class="btn primary ls-back">💖 Say it back</button>
    </div>`;
  document.body.append(el);
  const onKey = e => e.key === 'Escape' && close();
  const close = () => { if (!el.isConnected) return; clearTimeout(auto); removeEventListener('keydown', onKey); el.classList.add('out'); setTimeout(() => el.remove(), reduceMotion ? 0 : 450); };
  const auto = setTimeout(close, 9000);
  el.addEventListener('click', e => { if (e.target.closest('.ls-back')) { close(); loveTap(); } else close(); });
  addEventListener('keydown', onKey);
  navigator.vibrate?.([60, 80, 60, 80, 200]); ding();
  if (reduceMotion) return;
  // count up with an ease-out, so big numbers rush then settle
  const b = $('.ls-count b', el), dur = Math.min(600 + n * 25, 2200);
  let t0; const step = t => { t0 ??= t; const k = Math.min((t - t0) / dur, 1), v = Math.round(n * (1 - Math.pow(1 - k, 3))); b.textContent = v.toLocaleString(); if (k < 1) requestAnimationFrame(step); else $('.ls-count', el).classList.add('done'); };
  setTimeout(() => requestAnimationFrame(step), 450);
  // heart rain, denser for bigger numbers
  const rain = $('.ls-rain', el);
  for (let i = 0, count = Math.min(14 + n, 60); i < count; i++) {
    const h = document.createElement('span');
    h.textContent = LOVE_HEARTS[i % LOVE_HEARTS.length];
    h.style.cssText = `left:${rand(0, 100)}%;font-size:${rand(18, 46)}px;--drift:${rand(-60, 60)}px;--spin:${rand(-40, 40)}deg;animation-duration:${rand(3.2, 6)}s;animation-delay:${rand(0, 2.5)}s`;
    rain.append(h);
  }
  setTimeout(() => {
    if (!window.confetti || !el.isConnected) return;
    const shapes = confetti.shapeFromText ? LOVE_HEARTS.slice(0, 4).map(t => confetti.shapeFromText({ text: t, scalar: 2.2 })) : undefined;
    confetti({ particleCount: 90, spread: 110, startVelocity: 45, scalar: 2, ticks: 260, shapes, origin: { x: .5, y: .45 }, zIndex: 300 });
  }, 650);
}
$('#loveFab').addEventListener('click', loveTap);

// ---- fart engine ------------------------------------------------------------------------
// Farts are mp3 samples in sounds/. A seed picks the sample and its pitch, so the other phone replays exactly
// the farts that were sent. notify.mp3 is the "you got something" sound for incoming love, notes and toots.
let actx = null, master = null;
const FART_FILES = ['dry', 'perfect'], bufs = {};
function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    // a limiter, so a fast streak of overlapping farts gets louder, not distorted
    master = actx.createDynamicsCompressor(); master.threshold.value = -12; master.knee.value = 0; master.ratio.value = 20; master.attack.value = 0.003; master.release.value = 0.15;
    master.connect(actx.destination);
  }
  if (actx.state !== 'running') actx.resume().catch(() => {});
  return actx;
}
const audioReady = () => !!actx && actx.state === 'running';
// Loaded on first use. A failed load (offline, app opened in the background) is forgotten, so the next tap retries
// instead of staying silent until the app restarts.
const loadSound = name => bufs[name] ??= fetch(`sounds/${name}.mp3`)
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
  .then(b => new Promise((ok, no) => audio().decodeAudioData(b, ok, no)))
  .catch(e => { delete bufs[name]; throw e; });
// warm up on the first touch, so the first fart doesn't wait on the download
addEventListener('pointerdown', () => ['notify', ...FART_FILES].forEach(n => loadSound(n).catch(() => {})), { once: true });
let soundWarned = false;
const soundFailed = e => { console.warn('no audio', e); if (!soundWarned) { soundWarned = true; toast(`🔇 Couldn’t play the sound (${e?.message || e})`); } };
const prng = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const fartFile = seed => FART_FILES[seed % FART_FILES.length];
const newFartSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
/** Play a sample `when` seconds from now. Resolves to its length in seconds. */
async function playSound(name, when = 0, rate = 1) {
  const ctx = audio(), src = ctx.createBufferSource();
  src.buffer = await loadSound(name); src.playbackRate.value = rate;
  src.connect(master); src.start(ctx.currentTime + when);
  return src.buffer.duration / rate;
}
/** Play one fart from its seed. Same seed, same sample and pitch on both phones. */
const fart = (seed, when = 0) => playSound(fartFile(seed), when, 0.8 + prng(seed)() * 0.5);
/** Play a few farts back to back (the received ones). */
async function fartSequence(seeds, at = 0) {
  for (const s of seeds.slice(0, 8)) at += await fart(s, at) + 0.08;
}
/** The incoming-notification sound. Only plays if this page has had a tap, browsers block it otherwise. */
function ding() { audio(); if (audioReady()) playSound('notify').catch(() => {}); }

// ---- 💨 toot button ----------------------------------------------------------------------
// Works like I love you: each tap plays a different fart and puffs, taps are batched into one poop:<id> record
// ({by, n, seeds}) and one notification. The button is small and faded on purpose.
const POOP_COMBO = { 3: 'toot toot', 5: 'pfffft', 10: 'silent but deadly', 15: '🚨 hazmat', 25: 'call a plumber 🪠', 50: 'biohazard ☣️', 100: 'legendary stinker 👑' };
let poopN = 0, poopSeeds = [], poopTimer = null;
const poopTotal = p => S.all('poop:').filter(x => x.by === p).reduce((s, x) => s + (x.n || 0), 0);
function poopTap() {
  const fab = $('#poopFab'), r = fab.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const seed = newFartSeed();
  fart(seed).catch(soundFailed);
  poopN++; if (poopSeeds.length < 20) poopSeeds.push(seed);
  clearTimeout(poopTimer); poopTimer = setTimeout(poopSend, 1800);
  fab.classList.add('busy');
  const c = $('#poopCount'); c.hidden = false; c.textContent = `×${poopN}`;
  navigator.vibrate?.([30, 15, 30, 15, 50]);
  if (reduceMotion) return;
  fab.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-14deg) scale(1.2, .85)' }, { transform: 'rotate(10deg) scale(.9, 1.12)' }, { transform: 'rotate(-5deg) scale(1.05)' }, { transform: 'rotate(0) scale(1)' }],
    { duration: 480, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  c.animate([{ transform: 'scale(1.5) rotate(8deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 300, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  const cloud = document.createElement('span'); cloud.className = 'stink-cloud'; cloud.style.left = cx + 'px'; cloud.style.top = cy + 'px';
  $('#loveFx').append(cloud);
  cloud.animate([{ transform: 'translate(-50%, -50%) scale(.3)', opacity: .8 }, { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => cloud.remove();
  const puffs = 2 + Math.min(Math.floor(poopN / 6), 3);
  for (let i = 0; i < puffs; i++) setTimeout(() => floatUp(i % 3 === 2 ? '💩' : '💨', cx + rand(-8, 8), cy, 'stink-puff', { dx: rand(20, 120), up: rand(70, 170), scale: rand(.8, 1.4), duration: rand(1100, 1700) }), i * 70);
  if (POOP_COMBO[poopN]) floatUp(POOP_COMBO[poopN], cx + 60, cy - 30, 'stink-combo', { dx: 20, up: 110, scale: 1, duration: 1700 });
  if (poopN % 10 === 0 && window.confetti) {
    const shapes = confetti.shapeFromText ? ['💩', '💨'].map(t => confetti.shapeFromText({ text: t, scalar: 2 })) : undefined;
    confetti({ particleCount: 20 + Math.min(poopN, 50), spread: 60, startVelocity: 28, scalar: 1.6, ticks: 150, shapes, angle: 70, origin: { x: cx / innerWidth, y: cy / innerHeight } });
  }
}
function poopSend() {
  clearTimeout(poopTimer); poopTimer = null;
  const n = poopN, seeds = poopSeeds; if (!n) return;
  poopN = 0; poopSeeds = [];
  S.put('poop:' + S.uid(), { by: me(), n, seeds, at: Date.now() }, `feat(toot): ${nameOf(me())} tooted ×${n} 💨`);
  notify('poop', `💨 ${nameOf(me())}`, n === 1 ? 'pfffft 💩' : `pfffft ×${n.toLocaleString()} 💩`);
  toast(`💨 Sent to ${nameOf(other(me()))}${n > 1 ? ` ×${n}` : ''}`);
  $('#poopFab').classList.remove('busy');
  const c = $('#poopCount');
  if (reduceMotion) { c.hidden = true; return; }
  c.animate([{ transform: 'translate(0, 0)', opacity: 1 }, { transform: 'translate(30px, -50vh) rotate(40deg)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.5, 0, .75, 0)' }).onfinish = () => { if (!poopN) c.hidden = true; };
}
addEventListener('pagehide', poopSend);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && poopSend());
$('#poopFab').addEventListener('click', poopTap);

// Received toots: a stink show that plays the sender's exact farts. Browsers only allow sound after a tap on
// this page, so if it's blocked, the show offers a 🔊 button instead.
function poopAlert() {
  const all = S.all('poop:'), seen = new Set(S.ls.get('poopSeen', []));
  let since = S.ls.get('poopSince', 0);
  if (!since) S.ls.set('poopSince', since = Date.now() - 6 * 36e5);
  const fresh = all.filter(x => x.by !== me() && !seen.has(x.key) && x.at > since);
  if (!fresh.length || $('#lock').hidden === false || document.querySelector('.love-show')) return;
  S.ls.set('poopSeen', all.map(x => x.key));
  showPoop(fresh[0].by, fresh.reduce((s, x) => s + (x.n || 0), 0), fresh.flatMap(x => x.seeds || []).slice(-8));
}
function showPoop(by, n, seeds) {
  document.querySelector('.poop-show')?.remove();
  const el = document.createElement('div');
  el.className = 'poop-show'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${nameOf(by)} farted at you, ${n} times`);
  el.innerHTML = `
    <div class="ps-stink" aria-hidden="true"></div>
    <div class="ps-card">
      <div class="ps-poop" aria-hidden="true"><span>💩</span></div>
      <p class="ls-from">${esc(nameOf(by))}</p>
      <h2 class="ls-title">farted at you</h2>
      <div class="ls-count">×<b>${reduceMotion ? n.toLocaleString() : 0}</b></div>
      <p class="ls-sub">${poopTotal(by).toLocaleString()} toots all time</p>
      <div class="ps-btns"><button class="btn ghost ps-play">🔊 Play it</button><button class="btn primary ps-back">💨 Fart back</button></div>
    </div>`;
  document.body.append(el);
  const play = (at = 0) => fartSequence(seeds.length ? seeds : [newFartSeed()], at).catch(() => {});
  const onKey = e => e.key === 'Escape' && close();
  const close = () => { if (!el.isConnected) return; clearTimeout(auto); removeEventListener('keydown', onKey); el.classList.add('out'); setTimeout(() => el.remove(), reduceMotion ? 0 : 450); };
  const auto = setTimeout(close, 10000);
  el.addEventListener('click', e => {
    if (e.target.closest('.ps-play')) return play();
    if (e.target.closest('.ps-back')) { close(); return poopTap(); }
    close();
  });
  addEventListener('keydown', onKey);
  navigator.vibrate?.([40, 20, 40, 20, 60, 20, 30, 20, 140]);
  setTimeout(() => { audio(); if (audioReady()) { ding(); play(1.4); $('.ps-play', el).textContent = '🔊 Again'; } }, 350); // plays now if this page has had a tap
  if (reduceMotion) return;
  const b = $('.ls-count b', el), dur = Math.min(500 + n * 30, 2000);
  let t0; const step = t => { t0 ??= t; const k = Math.min((t - t0) / dur, 1); b.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(step); else $('.ls-count', el).classList.add('done'); };
  setTimeout(() => requestAnimationFrame(step), 450);
  const stink = $('.ps-stink', el);
  for (let i = 0, count = Math.min(10 + n, 36); i < count; i++) {
    const h = document.createElement('span');
    h.textContent = i % 5 === 0 ? '💩' : i % 7 === 0 ? '🤢' : '💨';
    h.style.cssText = `left:${rand(0, 100)}%;font-size:${rand(20, 48)}px;--drift:${rand(-80, 80)}px;--spin:${rand(-60, 60)}deg;animation-duration:${rand(3.5, 6.5)}s;animation-delay:${rand(0, 2.5)}s`;
    stink.append(h);
  }
}

// ---- settings / identity --------------------------------------------------------
function pickMe() {
  const P = people();
  const m = openModal(`
    <h2>Who’s using this phone?</h2>
    <p class="muted">So the calendar knows whose free days you’re marking.</p>
    <div class="who-pick">
      <button class="who a" data-p="a"><span>🙋</span>${esc(P.a)}</button>
      <button class="who b" data-p="b"><span>🙋</span>${esc(P.b)}</button>
    </div>`, 'center');
  m.onclick = e => { const p = e.target.closest('[data-p]')?.dataset.p; if (p) { S.ls.set('me', p); m.close(); render(); toast(`Hi ${nameOf(p)} 👋`); } };
}

const guessRepo = () => (location.hostname.endsWith('.github.io')
  ? `${location.hostname.split('.')[0]}/${location.pathname.split('/')[1]}` : 'MikachuFM2202/hangouts');

async function openSettings() {
  const P = people(), vault = S.isSynced() ? null : await S.fetchVault(guessRepo());
  const syncBlock = S.isSynced() ? `
      <p>✅ Both phones are connected. Last synced ${ago(S.status.last)}.${S.status.state === 'error' ? ` <span class="err">${esc(S.status.error)}</span>` : ''}</p>
      <div class="actions left"><button type="button" class="btn ghost small" data-s="sync">Sync now</button><button type="button" class="btn ghost small danger" data-s="lock">Disconnect this phone</button></div>
      <details${S.status.error.includes('401') ? ' open' : ''}><summary class="small">GitHub token expired or deleted?</summary>
        <p class="small muted">Make a new one with <a href="https://github.com/settings/personal-access-tokens/new?name=hangouts+sync&description=Lets+the+hangouts+site+save+our+plans+and+photos&expires_in=none&contents=write" target="_blank" rel="noopener">this link</a> and paste it here. The other phone picks it up automatically.</p>
        <div class="row"><input id="sNewToken" type="password" placeholder="github_pat_…" autocomplete="off"><button type="button" class="btn small" data-s="retoken">Replace token</button></div>
      </details>`
    : vault ? `
      <p class="muted">Enter your shared passphrase to connect this phone.</p>
      <div class="row"><input type="password" id="sPass" placeholder="Passphrase" autocomplete="current-password"><button type="button" class="btn primary small" data-s="unlock">Connect</button></div>`
    : `
      <p class="muted">Right now everything is saved on this phone only. To share it with your partner’s phone (one-time setup):</p>
      <ol class="small muted steps">
        <li>Open <a href="https://github.com/settings/personal-access-tokens/new?name=hangouts+sync&description=Lets+the+hangouts+site+save+our+plans+and+photos&expires_in=none&contents=write" target="_blank" rel="noopener">this GitHub link</a> (name and permissions are filled in for you).</li>
        <li>Under Repository access pick <b>Only select repositories → ${esc(guessRepo().split('/')[1])}</b>, then Generate token and copy it.</li>
        <li>Paste it below and choose a long passphrase you’ll both remember.</li>
      </ol>
      <label>Repository<input id="sRepo" value="${esc(guessRepo())}"></label>
      <label>Token<input id="sToken" type="password" placeholder="github_pat_…" autocomplete="off"></label>
      <div class="row"><label class="grow">Passphrase<input id="sPass" type="password" minlength="10" autocomplete="new-password"></label><label class="grow">Repeat it<input id="sPass2" type="password" autocomplete="new-password"></label></div>
      <p class="small muted">Everything is encrypted with your passphrase before it leaves the phone. Without it, nobody can see your plans or photos.</p>
      <div class="actions left"><button type="button" class="btn primary small" data-s="create">Connect our phones</button></div>`;
  const m = openModal(`
    <form class="form settings" id="setForm">
      <h2>Settings</h2>
      <fieldset><legend>Us</legend>
        <div class="row"><label class="grow">Name 1<input name="a" value="${esc(P.a)}" maxlength="24"></label><label class="grow">Name 2<input name="b" value="${esc(P.b)}" maxlength="24"></label></div>
        <label>Together since<input type="date" name="start" value="${esc(P.start)}"></label>
        <p class="small">This phone belongs to <b>${esc(nameOf(me()))}</b>. <button type="button" class="linkish" data-s="me">Change</button></p>
      </fieldset>
      <fieldset><legend>Share between phones</legend>${syncBlock}<p class="err" id="sErr" role="alert"></p></fieldset>
      <fieldset><legend>Notifications</legend><div id="notifBlock">${notifyBlock()}</div><p class="err" id="nErr" role="alert"></p></fieldset>
      ${isInstalled() ? '' : `<fieldset><legend>App</legend>
        <p class="small muted">Put hangouts on your home screen so it opens like a normal app.</p>
        <div class="actions left"><button type="button" class="btn small primary" data-s="install">📲 Add to home screen</button></div>
      </fieldset>`}
      <fieldset><legend>Backup</legend>
        <div class="actions left"><button type="button" class="btn ghost small" data-s="export">Download backup</button><label class="btn ghost small file">Restore backup<input type="file" accept="application/json" id="sImport" hidden></label></div>
        <p class="small muted">Backups include plans, free days and notes. Photos aren’t included.</p>
      </fieldset>
      <div class="actions"><button type="button" class="btn ghost" data-close>Close</button><button class="btn primary">Save</button></div>
    </form>`, 'wide');
  const f = $('#setForm', m), err = msg => { $('#sErr', m).textContent = msg; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    S.put('cfg:people', { a: f.a.value.trim() || US.a, b: f.b.value.trim() || US.b, start: f.start.value || US.start }, 'chore(settings): update names');
    m.close(); toast('Saved');
    if (!S.ls.get('me', null)) pickMe();
  });
  m.onchange = e => { // onchange, not addEventListener: the dialog is reused, listeners would pile up
    const k = e.target.dataset?.notif, rec = k && S.get(pushKey()); if (!rec) return;
    S.put(pushKey(), { ...rec, prefs: { ...rec.prefs, [k]: e.target.checked } }, null);
  };
  $('#sImport', m)?.addEventListener('change', async e => {
    try { S.importItems(JSON.parse(await e.target.files[0].text())); toast('Backup restored'); m.close(); } catch { err('That file isn’t a hangouts backup.'); }
  });
  m.onclick = async e => {
    const a = e.target.closest('[data-s]')?.dataset.s; if (!a) return;
    const btn = e.target.closest('button');
    const busy = async fn => { btn.disabled = true; const t = btn.textContent; btn.textContent = 'One moment…'; err(''); try { await fn(); } catch (x) { err(x.message); } finally { btn.disabled = false; btn.textContent = t; } };
    if (a === 'me') { m.close(); pickMe(); }
    const nbusy = async fn => { btn.disabled = true; $('#nErr', m).textContent = ''; try { await fn(); } catch (x) { $('#nErr', m).textContent = x.message; } finally { btn.disabled = false; $('#notifBlock', m).innerHTML = notifyBlock(); } };
    if (a === 'notif-on') nbusy(async () => { await enablePush(); toast('🔔 Notifications on'); });
    if (a === 'notif-off') nbusy(async () => { await disablePush(); toast('🔕 Notifications off on this phone'); });
    if (a === 'notif-test') nbusy(async () => { if (!(await notify('love', '🔔 hangouts', 'Notifications work! 💖', '#ask', me()))) throw new Error('Couldn’t send the test. Check the sync pill says Synced.'); toast('Sent. It arrives in about 20 seconds.'); });
    if (a === 'install') { m.close(); install(); }
    if (a === 'sync') busy(async () => { await S.sync(); m.close(); toast(S.status.state === 'ok' ? '✓ Synced' : 'Couldn’t sync: ' + S.status.error); });
    if (a === 'retoken') busy(async () => {
      const t = $('#sNewToken', m).value.trim(); if (!t) throw new Error('Paste the new token first.');
      await S.replaceToken(t).catch(x => { throw new Error(x.status === 401 ? 'GitHub didn’t accept that token.' : x.status === 403 || x.status === 404 ? 'That token can’t reach the repository. Check its repository access and Contents permission.' : x.message); });
      m.close(); toast('🔐 Token replaced');
    });
    if (a === 'lock') { S.lock(); m.close(); toast('This phone is disconnected'); render(); }
    if (a === 'export') {
      saveFile(`hangouts-backup-${today()}.json`, S.exportItems(), 'application/json');
    }
    if (a === 'unlock') busy(async () => {
      await S.unlock($('#sPass', m).value, vault).catch(() => { throw new Error('That passphrase didn’t work. Try again?'); });
      m.close(); toast('✓ Connected'); render(); if (!S.ls.get('me', null)) pickMe();
    });
    if (a === 'create') busy(async () => {
      const pass = $('#sPass', m).value, token = $('#sToken', m).value.trim(), repo = $('#sRepo', m).value.trim();
      if (pass.length < 10) throw new Error('Use at least 10 characters for the passphrase. A short sentence works well.');
      if (pass !== $('#sPass2', m).value) throw new Error('The two passphrases don’t match.');
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Repository should look like owner/name.');
      if (!token) throw new Error('Paste the GitHub token first.');
      await S.createVault({ pass, token, repo }).catch(x => { throw new Error(x.status === 401 ? 'GitHub didn’t accept that token. Check you copied all of it.' : x.status === 404 ? 'GitHub can’t find that repository with this token. Check the repository access setting.' : x.status === 403 ? 'The token needs Contents: Read and write.' : x.message); });
      m.close(); toast('💞 Phones connected'); burst(); render();
    });
  };
}
$('#settingsBtn').addEventListener('click', openSettings);

// ---- sync indicator + timers ----------------------------------------------------
function renderSync() {
  const st = S.status, el = $('#syncPill');
  const [cls, text] = !S.isSynced() ? ['local', 'This phone only'] : st.state === 'syncing' ? ['busy', 'Saving…']
    : st.state === 'error' ? ['err', st.error === 'offline' ? 'Offline' : 'Can’t sync'] : ['ok', 'Synced'];
  el.className = 'sync-pill ' + cls; el.textContent = text; el.title = st.state === 'error' ? st.error : `Last synced ${ago(st.last)}`;
}
$('#syncPill').addEventListener('click', () => (S.isSynced() && S.status.state !== 'error' ? S.sync() : openSettings()));
function tick() {
  $$('[data-clock]').forEach(el => { el.textContent = clock(); });
  $$('[data-until]').forEach(el => { const d = S.get(el.dataset.until); if (d) el.textContent = until(d); });
}
setInterval(tick, 1000);
setInterval(() => document.visibilityState === 'visible' && S.sync(), 30000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && S.sync());
addEventListener('online', () => S.sync());

// ---- lock screen ------------------------------------------------------------------
async function gate() {
  if (S.isSynced() || S.ls.get('localOnly', false)) return;
  const vault = await S.fetchVault(guessRepo()); if (!vault) return;
  const el = $('#lock'); el.hidden = false; $('#lockPass').focus();
  await new Promise(resolve => {
    $('#lockSkip').onclick = () => { S.ls.set('localOnly', true); el.hidden = true; resolve(); };
    $('#lockForm').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#lockForm button[type=submit]'); btn.disabled = true; btn.textContent = 'Opening…';
      try { await S.unlock($('#lockPass').value, vault); el.hidden = true; resolve(); }
      catch { $('#lockErr').textContent = 'Hmm, that’s not it. Try again?'; $('#lockPass').select(); }
      finally { btn.disabled = false; btn.textContent = 'Open'; }
    };
  });
}

const unseenNotes = () => notes().filter(n => n.by !== me() && n.at > S.ls.get('notesSeen', 0));
function noteAlert() {
  const n = unseenNotes();
  $('.tab[data-tab="ask"]').classList.toggle('has-new', n.length > 0);
  if (n.length && n[0].at > (S.ls.get('notesToasted', 0))) { S.ls.set('notesToasted', n[0].at); toast(`💌 New note from ${nameOf(n[0].by)}`, 4000); ding(); }
  if (tab === 'ask' && n.length) S.ls.set('notesSeen', n[0].at); // seen once the front page shows it
}
S.onChange(what => {
  if (what === 'items') { render(); noteAlert(); loveAlert(); poopAlert(); return; }
  renderSync();
  if (S.status.state === 'ok') $$('.thumb.missing img[data-photo]').forEach(img => { img.closest('.thumb').classList.remove('missing'); hydratePhotos(img.closest('.thumb')); });
});
addEventListener('hashchange', () => setTimeout(noteAlert));
addEventListener('hashchange', route);
const VIEWS = { ask: viewAsk, calendar: viewCalendar, plans: viewPlans, ideas: viewIdeas, week: viewWeek, activities: viewActivities, memories: viewMemories };
const BIND = { ask: bindAsk, calendar: bindCalendar, ideas: bindIdeas, week: bindWeek, activities: bindActivities, memories: bindMemories };

await S.init();
route();
await gate();
route();
if (!S.ls.get('onboarded', false)) { S.ls.set('onboarded', true); if (!S.ls.get('me', null)) pickMe(); }
else if (!S.ls.get('me', null) && S.get('cfg:people')) pickMe();
S.sync().then(pushCheck);
noteAlert();
loveAlert();
poopAlert();
loadWeather();
