import * as S from './store.js';

// ---- tiny helpers -----------------------------------------------------------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDay(new Date());
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => (s ? parseDay(s).toLocaleDateString(undefined, o) : 'TBD');
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hash7 = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7); };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function ago(t) {
  if (!t) return 'never';
  const s = (Date.now() - t) / 1000;
  return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`;
}
function until(d) {
  const ms = whenOf(d) - Date.now();
  if (ms <= 0) return ms > -6 * 3600e3 ? 'happening now 💖' : 'deployed';
  const dd = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return `T-minus ${dd ? dd + 'd ' : ''}${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}
const whenOf = d => { const t = parseDay(d.date); const [h, m] = (d.time || '18:00').split(':').map(Number); t.setHours(h, m); return t.getTime(); };

// ---- people + data ------------------------------------------------------------
const people = () => ({ a: 'Player 1', b: 'Player 2', start: '', ...S.get('cfg:people') });
const me = () => S.ls.get('me', 'a');
const nameOf = p => people()[p] || '?';
const other = p => (p === 'a' ? 'b' : 'a');
const isFree = (p, ds) => !!S.get(`free:${p}:${ds}`)?.v;

const dates = () => S.all('date:');
const nextN = () => dates().reduce((m, d) => Math.max(m, d.n || 0), 0) + 1;
const ticketKey = d => `HANG-${d.n || '?'}`;
const STATUS = { idea: 'Backlog', proposed: 'Awaiting RSVP', planned: 'Scheduled', done: 'Shipped' };
const MOODS = ['', '😍 swoon', '😂 lol', '🥰 cozy', '🤩 core memory', '😴 chill', '🌧️ chaotic but cute'];

const IDEAS = [
  ['🍜', 'Hawker crawl — 3 stalls, 1 shared dessert'], ['🌺', 'Gardens by the Bay light show'], ['🚲', 'East Coast Park cycle + satay'],
  ['🧺', 'Botanic Gardens picnic'], ['🏺', 'Pottery class (ghost scene optional)'], ['🎤', 'Karaoke, terrible song choices only'],
  ['🎲', 'Board game café — loser buys bubble tea'], ['🌉', 'Southern Ridges sunset walk'], ['🦁', 'Night Safari'],
  ['🏝️', 'Pulau Ubin bike day'], ['🖼️', 'Museum + pretend to be art critics'], ['🛼', 'Ice skating at JCube'],
  ['🍳', 'Cook a recipe neither of you has tried'], ['🎬', 'Movie marathon, blanket fort mandatory'], ['🕹️', 'Arcade battle — best of 5'],
  ['📚', 'Bookstore date: pick a book for each other'], ['🌅', 'Sunrise at Marina Barrage'], ['🧋', 'Rate every bubble tea on one street'],
  ['🌿', 'MacRitchie treetop walk'], ['🏖️', 'Sentosa beach + sunset'], ['🛍️', 'Thrift challenge: $10 outfit for each other'],
  ['🔭', 'Stargazing (find at least 1 star)'], ['🎨', 'Paint each other badly'], ['🚇', 'Get off at a random MRT stop and explore'],
  ['🍰', 'Bake something, judge it like a TV show'], ['🧩', '1000-piece puzzle night'], ['✨', 'Jewel Changi rain vortex + late supper'],
  ['🏸', 'Badminton, trash talk encouraged'], ['📸', 'Photo walk: 10 photos of each other'], ['🎡', 'Singapore Flyer at dusk'],
];
const NO_LINES = ['No', 'Are you sure?', 'Really sure?? 🥺', 'Think again', 'Error 418: I’m a teapot', 'Access denied 🔒', 'Segmentation fault',
  'Have you tried “Yes”?', 'git push --force-with-love', 'No (deprecated)', 'Stack overflow of feelings', '404: “No” not found',
  'sudo rm -rf no', 'Undefined is not a function', 'Last chance… 👀'];

// ---- UI primitives ------------------------------------------------------------
function toast(msg, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').append(el); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
}
function openModal(html, cls = '') {
  const d = $('#modal'); d.className = 'modal ' + cls; d.innerHTML = html; d.onclick = null;
  if (!d.open) d.showModal();
  return d;
}
$('#modal').addEventListener('click', e => {
  if (e.target.closest('[data-close]') || e.target === e.currentTarget) $('#modal').close();
});
const burst = () => {
  if (!window.confetti || reduceMotion) return;
  const heart = confetti.shapeFromText ? [confetti.shapeFromText({ text: '💖', scalar: 2 }), confetti.shapeFromText({ text: '✨', scalar: 2 })] : undefined;
  const fire = (o) => confetti({ particleCount: 70, spread: 80, startVelocity: 45, scalar: 2, shapes: heart, ...o });
  fire({ origin: { x: 0.2, y: 0.7 }, angle: 60 }); fire({ origin: { x: 0.8, y: 0.7 }, angle: 120 });
  setTimeout(() => fire({ origin: { x: 0.5, y: 0.4 }, spread: 140, particleCount: 90 }), 250);
};

// ---- router -------------------------------------------------------------------
const TABS = ['ask', 'calendar', 'plans', 'archive'];
let tab = 'ask', cleanup = null, painting = false, deferred = false, archiveQuery = '';
function route() {
  const h = location.hash.slice(1);
  tab = TABS.includes(h) ? h : 'ask';
  ['#modal', '#lightbox'].forEach(s => $(s).open && $(s).close());
  render();
  $('#view').focus({ preventScroll: true });
  scrollTo(0, 0);
}
function render() {
  if (painting) { deferred = true; return; }
  cleanup?.(); cleanup = null;
  $$('.tab').forEach(t => { t.setAttribute('aria-selected', t.dataset.tab === tab); if (t.dataset.tab === tab) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  const v = $('#view');
  v.innerHTML = VIEWS[tab]();
  v.dataset.tab = tab;
  BIND[tab]?.(v);
  hydratePhotos(v);
  tick();
  renderStatus();
}

// ---- ask.tsx ------------------------------------------------------------------
let noTries = 0, askPlan = null;
function viewAsk() {
  askPlan = dates().filter(d => d.status === 'proposed').sort((a, b) => b.u - a.u)[0] || null;
  const P = people(), yeses = S.all('yes:').length;
  const from = askPlan ? nameOf(askPlan.by) : nameOf(me());
  return `
  <section class="ask">
    <div class="window">
      <div class="window-bar"><span class="dots"><i></i><i></i><i></i></span><span class="title">proposal.exe — ${esc(from)} → ${esc(askPlan ? nameOf(other(askPlan.by)) : nameOf(other(me())))}</span></div>
      <div class="window-body">
        <pre class="code-line"><span class="kw">await</span> fetch(<span class="str">'/api/v1/date'</span>, { method: <span class="str">'POST'</span>, body: <span class="str">'💌'</span> })</pre>
        <h1 class="ask-q">Will you go on a date with me?</h1>
        ${askPlan ? `
        <div class="ask-plan">
          <div class="ap-emoji">${esc(askPlan.emoji || '💖')}</div>
          <div><b>${esc(askPlan.title)}</b>
          <div class="muted">${askPlan.date ? `📅 ${fmtDay(askPlan.date, { weekday: 'long', day: 'numeric', month: 'long' })}${askPlan.time ? ' · ' + fmtTime(askPlan.time) : ''}` : '📅 date: let’s pick together'}${askPlan.place ? ` · 📍 ${esc(askPlan.place)}` : ''}</div></div>
        </div>` : `<p class="muted ask-sub">Payload: one (1) cute human. Timeout: never.</p>`}
        <div class="ask-arena">
          <button class="btn yes" id="yesBtn">Yes 💖</button>
          <button class="btn no" id="noBtn">No</button>
        </div>
        <p class="tos">By pressing Yes you accept the <button class="linkish" data-act="tos">Terms of Cuddles</button>.</p>
        <div class="telemetry" id="telemetry"></div>
      </div>
    </div>
    <div class="ask-foot">
      <button class="btn ghost small" data-act="copy-invite">🔗 Copy invite link</button>
      <a class="btn ghost small" href="#plans">💌 Attach a plan</a>
      <span class="muted small">lifetime yeses: <b>${yeses}</b> · uptime ${P.start ? Math.max(0, Math.floor((Date.now() - parseDay(P.start)) / 864e5)) + 'd' : '∞'}</span>
    </div>
  </section>`;
}
function bindAsk(v) {
  const no = $('#noBtn', v), yes = $('#yesBtn', v), tel = $('#telemetry', v);
  const ac = new AbortController(); const sig = { signal: ac.signal };
  cleanup = () => ac.abort();
  const level = () => {
    yes.style.setProperty('--grow', Math.min(1 + noTries * 0.08, 2));
    if (noTries >= NO_LINES.length) { no.textContent = 'Yes 💖'; no.classList.add('yes'); no.dataset.converted = '1'; }
    else no.textContent = NO_LINES[noTries];
    const threat = ['standing by', 'low', 'elevated', 'high', 'severe', 'critical 🥺'][Math.min(5, Math.ceil(noTries / 3))];
    tel.innerHTML = `<span>evasion.ai v3.1.4</span><span>dodges: <b>${noTries}</b></span><span>“No” success rate: <b>0.00%</b></span><span>threat: <b>${threat}</b></span>`;
  };
  level();
  let lastDodge = 0;
  const dodge = (px, py) => {
    if (no.dataset.converted) return;
    noTries++; level();
    if (no.dataset.converted) { no.classList.remove('loose'); no.style.left = no.style.top = ''; return; }
    lastDodge = performance.now();
    const r = no.getBoundingClientRect(), y = yes.getBoundingClientRect();
    const W = innerWidth, H = innerHeight, top = 70, bottom = 56;
    let best = null, bestScore = -1;
    for (let i = 0; i < 40; i++) {
      const x0 = 12 + Math.random() * Math.max(0, W - r.width - 24), y0 = top + Math.random() * Math.max(0, H - r.height - top - bottom);
      if (!(x0 > y.right + 12 || x0 + r.width < y.left - 12 || y0 > y.bottom + 12 || y0 + r.height < y.top - 12)) continue;
      const score = Math.min(Math.hypot(x0 + r.width / 2 - px, y0 + r.height / 2 - py), 380) + Math.random() * 120;
      if (score > bestScore) { bestScore = score; best = [x0, y0]; }
    }
    if (!best) return;
    if (!no.classList.contains('loose')) {
      no.style.left = r.left + 'px'; no.style.top = r.top + 'px';
      no.classList.add('loose'); void no.offsetWidth; // start the transition from where it was
    }
    no.style.left = best[0] + 'px'; no.style.top = best[1] + 'px';
    no.animate?.([{ transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'none' }], { duration: 300 });
  };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || no.dataset.converted || performance.now() - lastDodge < 120) return;
    const r = no.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) < 48) dodge(e.clientX, e.clientY);
  }, sig);
  no.addEventListener('pointerdown', e => { if (!no.dataset.converted) { e.preventDefault(); dodge(e.clientX, e.clientY); } }, sig);
  no.addEventListener('click', e => {
    if (no.dataset.converted) return sayYes();
    e.preventDefault();
    if (performance.now() - lastDodge < 500) return; // the tap's pointerdown already dodged
    const r = no.getBoundingClientRect(); dodge(r.x, r.y);
    toast('Request rejected: 418 I’m a teapot ☕');
  }, sig);
  yes.addEventListener('click', sayYes, sig);
  addEventListener('resize', () => { no.classList.remove('loose'); no.style.left = no.style.top = ''; }, sig);
}

async function sayYes() {
  const plan = askPlan, n = noTries;
  noTries = 0;
  const steps = [['Authenticating cutie', '200 OK'], ['Scanning for butterflies', `${3 + n * 7} found`],
    ['Allocating snacks', 'OK'], ['Resolving calendar merge conflicts', 'none 💞'], ['Deploying date to production', 'LIVE']];
  const d = openModal(`
    <div class="pipeline">
      <pre class="term" id="pipe"><span class="prompt">$</span> curl -X POST /api/v1/date -d '{"answer":"yes"${n ? `,"dodged_no":${n}` : ''}}'\n\n</pre>
      <div class="pipe-done" id="pipeDone" hidden>
        <h2>It’s a date! 💖</h2>
        <p class="muted">${plan ? `${esc(plan.emoji || '')} ${esc(plan.title)} is now <b>scheduled</b>.` : 'Request accepted. Now let’s pick a day.'}</p>
        <div class="actions">
          ${plan && plan.date ? `<a class="btn primary" href="#plans" data-close>View ticket →</a>` : `<a class="btn primary" href="#calendar" data-close>Pick free days →</a>`}
          <a class="btn ghost" href="#plans" data-close>Plan something</a>
        </div>
      </div>
    </div>`, 'wide');
  const pre = $('#pipe', d);
  for (const [label, res] of steps) {
    await sleep(reduceMotion ? 0 : 420);
    pre.insertAdjacentHTML('beforeend', `<span class="ok">✔</span> ${esc(innerWidth < 560 ? label + ' …' : label.padEnd(36, '.'))} <b>${esc(res)}</b>\n`);
  }
  await sleep(reduceMotion ? 0 : 350);
  pre.insertAdjacentHTML('beforeend', `\n<span class="ok">HTTP/1.1 200 OK</span>\nX-Feelings: mutual\nX-Butterflies: ${3 + n * 7}\n{ "status": "it's a date 💖" }`);
  $('#pipeDone', d).hidden = false;
  burst();
  S.put('yes:' + S.uid(), { by: me(), at: Date.now(), plan: plan?.key || null }, plan ? `feat(rsvp): YES to "${plan.title}" 💖` : 'feat(rsvp): she said YES 💖', true);
  if (plan) S.put(plan.key, { ...plan, status: 'planned', answeredAt: Date.now() }, null, true);
  S.note();
}

function showTos() {
  openModal(`
    <h2>Terms of Cuddles <span class="muted small">v2.0.26</span></h2>
    <ol class="tos-list">
      <li>Holding hands is mandatory and non-negotiable.</li>
      <li>Snacks will be shared 50/50. Fries are exempt from this clause and fall under “whoever is faster”.</li>
      <li>“I’m not hungry” will be logged as a warning, not an error.</li>
      <li>Photos must be taken until at least one (1) is good.</li>
      <li>Either party may request a hug at any time. SLA: under 3 seconds.</li>
      <li>The No button is provided “as is”, without warranty of any kind.</li>
      <li>This agreement auto-renews every date, forever.</li>
    </ol>
    <div class="actions"><button class="btn primary" data-close>I agree 💖</button></div>`);
}

// ---- calendar.ts ----------------------------------------------------------------
let calCursor = new Date(); calCursor.setDate(1);
function viewCalendar() {
  const P = people(), m = me(), y = calCursor.getFullYear(), mo = calCursor.getMonth(), t = today();
  const offset = (new Date(y, mo, 1).getDay() + 6) % 7, n = new Date(y, mo + 1, 0).getDate();
  const byDay = {};
  dates().filter(d => d.date && d.status !== 'idea').forEach(d => (byDay[d.date] ||= []).push(d));
  const matches = []; let union = 0;
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('');
  cells += '<div class="day pad"></div>'.repeat(offset);
  for (let d = 1; d <= n; d++) {
    const ds = `${y}-${pad(mo + 1)}-${pad(d)}`, fa = isFree('a', ds), fb = isFree('b', ds), past = ds < t, ev = byDay[ds];
    if (!past && (fa || fb)) union++;
    if (!past && fa && fb) matches.push(ds);
    const label = `${fmtDay(ds, { weekday: 'long', day: 'numeric', month: 'long' })}${fa ? `, ${P.a} free` : ''}${fb ? `, ${P.b} free` : ''}${ev ? `, ${ev.map(e => e.title).join(', ')}` : ''}`;
    cells += `<button class="day${fa ? ' fa' : ''}${fb ? ' fb' : ''}${fa && fb ? ' match' : ''}${past ? ' past' : ''}${ds === t ? ' today' : ''}" data-day="${ds}"
      ${past ? 'disabled' : ''} aria-pressed="${isFree(m, ds)}" aria-label="${esc(label)}">
      <span class="num">${d}</span>${ev ? `<span class="ev" title="${esc(ev.map(e => e.title).join(', '))}">${esc(ev[0].emoji || '📌')}</span>` : ''}
      <span class="marks"><i class="ma"></i><i class="mb"></i></span></button>`;
  }
  const compat = union ? Math.round((matches.length / union) * 100) : 0;
  return `
  <section class="calendar">
    <div class="section-head">
      <div><h1>When are we free?</h1>
      <p class="muted">You are editing as <b class="who-${m}">${esc(nameOf(m))}</b> — tap ${matchMedia('(pointer:fine)').matches ? 'or drag ' : ''}days you’re free. <button class="linkish" data-act="whoami">not you?</button></p></div>
    </div>
    <div class="cal-card">
      <div class="cal-nav">
        <button class="icon-btn" data-act="cal-prev" aria-label="Previous month">‹</button>
        <h2>${calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button class="icon-btn" data-act="cal-next" aria-label="Next month">›</button>
        <button class="btn ghost small" data-act="cal-today">Today</button>
      </div>
      <div class="cal-grid" role="grid">${cells}</div>
      <div class="legend">
        <span><i class="sw a"></i>${esc(P.a)} free</span><span><i class="sw b"></i>${esc(P.b)} free</span><span><i class="sw m"></i>both free = match</span><span>📌 planned date</span>
      </div>
    </div>
    <div class="panel">
      <pre class="code-line"><span class="kw">const</span> slots = scheduler.<span class="fn">findOverlap</span>(${esc(P.a.toLowerCase().replace(/\W+/g, '_') || 'a')}, ${esc(P.b.toLowerCase().replace(/\W+/g, '_') || 'b')}) <span class="cm">// O(n), ran in 0.0002ms</span></pre>
      <h3>⚡ ${plural(matches.length, 'compatible slot')} found <span class="pill">${compat}% compatibility</span></h3>
      ${matches.length ? `<ul class="matches">${matches.map(ds => `
        <li><span>💞 ${fmtDay(ds, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        ${byDay[ds] ? `<span class="muted small">${esc(byDay[ds][0].emoji || '')} ${esc(byDay[ds][0].title)}</span>` : `<button class="btn small" data-act="plan-on" data-day="${ds}">Plan a date →</button>`}</li>`).join('')}</ul>`
      : `<p class="muted">No overlap yet this month. Both of you mark days you’re free — matches light up here.</p>`}
      <div class="quick">
        <button class="btn ghost small" data-act="weekends">Mark my weekends free</button>
        <button class="btn ghost small" data-act="clear-month">Clear my month</button>
      </div>
    </div>
  </section>`;
}
function bindCalendar(v) {
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
    const msg = `feat(calendar): ${nameOf(me())} is ${mode ? 'free' : 'busy'} on ${plural(touched.size, 'day')}`;
    if (mode && touched.size) {
      const hit = [...touched].filter(ds => isFree(other(me()), ds));
      if (hit.length) toast(`💞 It’s a match! ${hit.map(ds => fmtDay(ds)).join(', ')}`);
    }
    deferred = false; S.note(msg);
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
  cleanup = () => { ac.abort(); };
  grid.addEventListener('click', e => {
    if (mouse) { mouse = false; return; }
    const el = e.target.closest('.day[data-day]'); if (!el || el.disabled) return;
    painting = true; touched = new Set(); mode = !isFree(me(), el.dataset.day); apply(el); done();
  });
}

// ---- plans.yml ------------------------------------------------------------------
function ticket(d, opts = {}) {
  const past = d.date && d.date < today() && d.status !== 'done';
  const photos = d.photos || [];
  return `
  <article class="ticket st-${d.status}${past ? ' overdue' : ''}" data-key="${esc(d.key)}">
    <div class="ticket-head">
      <span class="tkey">${ticketKey(d)}</span>
      <span class="pill st">${past ? 'Needs retro' : STATUS[d.status]}</span>
      ${d.budget ? `<span class="pill">💸 $${esc(d.budget)}</span>` : ''}
      <span class="prio" title="Priority">💖 P0</span>
    </div>
    <h3><span class="t-emoji">${esc(d.emoji || '💖')}</span>${esc(d.title)}</h3>
    <div class="meta">
      <span>📅 ${d.date ? fmtDay(d.date) + (d.time ? ' · ' + fmtTime(d.time) : '') : 'unscheduled'}</span>
      ${d.place ? `<a href="https://www.google.com/maps/search/${encodeURIComponent(d.place)}" target="_blank" rel="noopener">📍 ${esc(d.place)}</a>` : ''}
    </div>
    ${d.status === 'planned' && d.date && !past ? `<div class="countdown" data-until="${esc(d.key)}">${until(d)}</div>` : ''}
    ${d.notes ? `<p class="notes">${esc(d.notes)}</p>` : ''}
    ${photos.length ? `<div class="strip">${photos.slice(0, 6).map((p, i) => thumb(d.key, p, i)).join('')}${photos.length > 6 ? `<span class="more">+${photos.length - 6}</span>` : ''}</div>` : ''}
    <div class="ticket-actions">
      ${d.status === 'idea' ? `<button class="btn small" data-act="propose">💌 Ask</button>` : ''}
      ${d.status === 'proposed' ? `<a class="btn small" href="#ask">💌 Open proposal</a>` : ''}
      ${d.status === 'planned' ? `<button class="btn small" data-act="capture">📸 Capture</button>` : ''}
      ${d.status !== 'done' && (d.status === 'planned' || past) ? `<button class="btn small primary" data-act="ship">✅ Ship it</button>` : ''}
      ${opts.extra || ''}
      <button class="btn small ghost" data-act="edit">Edit</button>
      <button class="btn small ghost danger" data-act="delete" aria-label="Delete">🗑</button>
    </div>
  </article>`;
}
const thumb = (key, id, i) => `<button class="thumb" data-act="photo" data-key="${esc(key)}" data-i="${i}"><img data-photo="${esc(id)}" alt="moment ${i + 1}" loading="lazy"></button>`;

function viewPlans() {
  const all = dates(), t = today();
  const planned = all.filter(d => d.status === 'planned').sort((a, b) => (a.date || '9') .localeCompare(b.date || '9') || (a.time || '').localeCompare(b.time || ''));
  const retro = planned.filter(d => d.date && d.date < t), upcoming = planned.filter(d => !(d.date && d.date < t));
  const proposed = all.filter(d => d.status === 'proposed'), ideas = all.filter(d => d.status === 'idea').sort((a, b) => b.u - a.u);
  const next = upcoming.find(d => d.date);
  const section = (title, list, empty) => `
    <h2 class="col-title">${title} <span class="count">${list.length}</span></h2>
    ${list.length ? `<div class="tickets">${list.map(d => ticket(d)).join('')}</div>` : `<p class="empty">${empty}</p>`}`;
  return `
  <section class="plans">
    <div class="section-head">
      <div><h1>Future dates</h1><p class="muted">Sprint board for us. Velocity: ${plural(all.filter(d => d.status === 'done').length, 'date')} shipped.</p></div>
      <div class="head-actions">
        <button class="btn ghost" data-act="spin">🎲 Suggest</button>
        <button class="btn primary" data-act="new">+ New ticket</button>
      </div>
    </div>
    ${next ? `
    <div class="hero" data-key="${esc(next.key)}">
      <div class="hero-emoji">${esc(next.emoji || '💖')}</div>
      <div class="hero-body">
        <div class="muted small">next deploy</div>
        <h2>${esc(next.title)}</h2>
        <div class="muted">${fmtDay(next.date, { weekday: 'long', day: 'numeric', month: 'long' })}${next.time ? ' · ' + fmtTime(next.time) : ''}${next.place ? ' · 📍 ' + esc(next.place) : ''}</div>
        <div class="countdown big" data-until="${esc(next.key)}">${until(next)}</div>
      </div>
    </div>` : ''}
    ${retro.length ? section('🧐 Needs retro', retro, '') : ''}
    ${section('🚀 Scheduled', upcoming, 'Nothing scheduled. Ask them out — the No button is broken anyway.')}
    ${proposed.length ? section('💌 Awaiting RSVP', proposed, '') : ''}
    ${section('🗂️ Backlog', ideas, 'Empty backlog. Hit 🎲 Suggest for ideas from our very real AI.')}
  </section>`;
}

function openDateForm(d = {}, retroFocus = false) {
  const isNew = !d.key;
  const stars = [5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" id="r${n}" value="${n}" ${d.rating == n ? 'checked' : ''}><label for="r${n}" title="${n} star${n > 1 ? 's' : ''}">★</label>`).join('');
  const m = openModal(`
  <form class="form" id="dateForm">
    <h2>${isNew ? 'New ticket' : `<span class="tkey">${ticketKey(d)}</span> ${retroFocus ? 'Retro' : 'Edit'}`}</h2>
    <div class="row">
      <label class="emoji-field">Icon<input name="emoji" maxlength="8" value="${esc(d.emoji || '💖')}"></label>
      <label class="grow">Title<input name="title" required maxlength="80" value="${esc(d.title)}" placeholder="Sushi & sunset"></label>
    </div>
    <div class="row">
      <label>Date<input type="date" name="date" value="${esc(d.date)}"></label>
      <label>Time<input type="time" name="time" value="${esc(d.time)}"></label>
    </div>
    <div class="row">
      <label class="grow">Place<input name="place" maxlength="120" value="${esc(d.place)}" placeholder="Somewhere nice"></label>
      <label>Budget ($)<input type="number" min="0" step="1" name="budget" value="${esc(d.budget)}"></label>
    </div>
    <label>Status<select name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${(d.status || 'idea') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Notes<textarea name="notes" rows="3" maxlength="2000" placeholder="Bring a jacket. She gets cold.">${esc(d.notes)}</textarea></label>
    <fieldset class="retro"${retroFocus || d.status === 'done' ? '' : ' hidden'}>
      <legend>Retro</legend>
      <div class="row"><div><span class="lbl">Rating</span><div class="stars">${stars}</div></div>
      <label class="grow">Mood<select name="mood">${MOODS.map(x => `<option ${d.mood === x ? 'selected' : ''} value="${esc(x)}">${x || '—'}</option>`).join('')}</select></label></div>
      <label>Best moment<input name="best" maxlength="200" value="${esc(d.best)}" placeholder="When the waiter sang happy birthday to the wrong table"></label>
    </fieldset>
    <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${isNew ? 'Create' : 'Save'}</button></div>
  </form>`);
  const f = $('#dateForm', m);
  f.status.addEventListener('change', () => { $('.retro', f).hidden = f.status.value !== 'done'; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const x = Object.fromEntries(new FormData(f));
    x.title = x.title.trim(); x.rating = x.rating ? Number(x.rating) : undefined;
    const key = d.key || 'date:' + S.uid();
    const out = { photos: [], by: me(), n: nextN(), ...d, ...x };
    const verb = isNew ? 'feat(plans): add' : x.status === 'done' && d.status !== 'done' ? 'feat(archive): ship' : 'fix(plans): update';
    S.put(key, out, `${verb} "${x.title}" ${x.emoji || ''}`.trim());
    m.close();
    toast(isNew ? `🎫 ${ticketKey(out)} created` : x.status === 'done' && d.status !== 'done' ? '🚀 Shipped to archive' : 'Saved');
    if (x.status === 'done' && d.status !== 'done') burst();
  });
  (retroFocus ? $('.stars input', f) : f.title)?.focus();
}

async function spin() {
  const m = openModal(`
    <div class="spin">
      <pre class="code-line"><span class="kw">await</span> ai.<span class="fn">recommendDate</span>({ model: <span class="str">'gpt-vibes-9000'</span>, temperature: <span class="str">'warm'</span> })</pre>
      <div class="slot" id="slot">🎲</div>
      <p class="muted small" id="slotSub">running inference on 0 GPUs…</p>
      <div class="actions" id="slotAct" hidden><button class="btn ghost" data-act2="again">Spin again</button><button class="btn primary" data-act2="add">Add to backlog</button></div>
    </div>`);
  let pick;
  const run = async () => {
    $('#slotAct', m).hidden = true;
    const slot = $('#slot', m);
    for (let i = 0; i < (reduceMotion ? 1 : 18); i++) {
      pick = IDEAS[Math.floor(Math.random() * IDEAS.length)];
      slot.textContent = `${pick[0]} ${pick[1]}`;
      await sleep(50 + i * i * 1.6);
    }
    $('#slotSub', m).textContent = `confidence: ${(90 + Math.random() * 9.9).toFixed(1)}% · hallucination risk: cute`;
    $('#slotAct', m).hidden = false;
  };
  m.onclick = e => {
    const a = e.target.closest('[data-act2]')?.dataset.act2;
    if (a === 'again') run();
    if (a === 'add') {
      const d = { emoji: pick[0], title: pick[1], status: 'idea', by: me(), n: nextN(), photos: [] };
      S.put('date:' + S.uid(), d, `feat(backlog): AI suggested "${pick[1]}" 🤖`);
      m.close(); toast(`🎫 ${ticketKey(d)} added to backlog`);
    }
  };
  run();
}

// ---- archive.log ----------------------------------------------------------------
function viewArchive() {
  const done = dates().filter(d => d.status === 'done').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const photos = done.reduce((s, d) => s + (d.photos?.length || 0), 0);
  const rated = done.filter(d => d.rating), avg = rated.length ? (rated.reduce((s, d) => s + d.rating, 0) / rated.length).toFixed(1) : '–';
  const places = {}; done.forEach(d => d.place && (places[d.place] = (places[d.place] || 0) + 1));
  const fav = Object.entries(places).sort((a, b) => b[1] - a[1])[0];
  const first = done[done.length - 1];
  return `
  <section class="archive">
    <div class="section-head">
      <div><h1>Archive</h1><p class="muted"><code>$ git log --all --graph --memories</code></p></div>
      <div class="head-actions"><button class="btn ghost" data-act="log-past">+ Log a past date</button></div>
    </div>
    <div class="stats">
      <div><b>${done.length}</b><span>dates shipped</span></div>
      <div><b>${photos}</b><span>moments</span></div>
      <div><b>${avg}</b><span>avg ★</span></div>
      <div><b>${fav ? esc(fav[0]) : '–'}</b><span>fav place</span></div>
    </div>
    ${done.length ? `<input class="search" type="search" id="archiveSearch" placeholder="grep memories…" value="${esc(archiveQuery)}" aria-label="Search archive">
    <ol class="log">${done.map((d, i) => `
      <li class="commit" data-key="${esc(d.key)}" data-text="${esc([d.title, d.place, d.notes, d.best, d.mood].join(' ').toLowerCase())}">
        <div class="commit-line"><span class="hash">commit ${hash7(d.key)}</span>${i === 0 ? '<span class="ref">(HEAD → us)</span>' : ''}${d === first && done.length > 1 ? '<span class="ref root">(initial commit)</span>' : ''}</div>
        <div class="commit-meta">Date: ${d.date ? fmtDay(d.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown'}${d.time ? ' ' + fmtTime(d.time) : ''}${d.place ? ` · <a href="https://www.google.com/maps/search/${encodeURIComponent(d.place)}" target="_blank" rel="noopener">📍 ${esc(d.place)}</a>` : ''}</div>
        <h3>${esc(d.emoji || '💖')} ${esc(d.title)} ${d.rating ? `<span class="stars-ro" aria-label="${d.rating} stars">${'★'.repeat(d.rating)}<span>${'★'.repeat(5 - d.rating)}</span></span>` : ''}</h3>
        ${d.mood ? `<span class="pill">${esc(d.mood)}</span>` : ''}
        ${d.best ? `<p class="best">“${esc(d.best)}”</p>` : ''}
        ${d.notes ? `<p class="notes">${esc(d.notes)}</p>` : ''}
        <div class="gallery">${(d.photos || []).map((p, j) => thumb(d.key, p, j)).join('')}
          <button class="thumb add" data-act="capture" aria-label="Add photos">＋<span>add</span></button></div>
        <div class="ticket-actions"><button class="btn small ghost" data-act="retro">Edit retro</button><button class="btn small ghost danger" data-act="delete" aria-label="Delete">🗑</button></div>
      </li>`).join('')}</ol>
    <p class="empty" id="noHits" hidden>No memories match. git blame yourself.</p>`
    : `<div class="empty big"><div>📭</div><p>Nothing shipped yet.<br>Finish a date with <b>✅ Ship it</b>, or log one you already had.</p></div>`}
  </section>`;
}
function bindArchive(v) {
  const s = $('#archiveSearch', v); if (!s) return;
  const filter = () => {
    archiveQuery = s.value; const q = s.value.trim().toLowerCase(); let hits = 0;
    $$('.commit', v).forEach(c => { const on = !q || c.dataset.text.includes(q); c.hidden = !on; hits += on; });
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
async function shrink(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.82));
}
function todaysDateKey() {
  const t = today(), d = dates().find(x => x.date === t && x.status !== 'idea');
  if (d) return d.key;
  const key = 'date:' + S.uid(), now = new Date();
  S.put(key, { title: 'Spontaneous hangout', emoji: '✨', date: t, time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, status: 'planned', by: me(), n: nextN(), photos: [] },
    'feat: spontaneous hangout detected ✨', true);
  return key;
}
$('#photoInput').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  const key = photoTarget || todaysDateKey(); photoTarget = null;
  toast(`📸 Developing ${plural(files.length, 'photo')}…`);
  const ids = [];
  for (const f of files) {
    try { ids.push(await S.addPhoto(await shrink(f))); } catch (err) { console.error(err); toast(`Couldn’t read ${f.name}`); }
  }
  if (!ids.length) return;
  const d = S.get(key);
  S.put(key, { ...d, photos: [...(d.photos || []), ...ids] }, `feat(moments): +${plural(ids.length, 'photo')} to "${d.title}" 📸`);
  toast(`💾 ${plural(ids.length, 'moment')} saved to “${d.title}”`);
});
$('#captureFab').addEventListener('click', () => capture(null));

// lightbox
let lb = { key: null, i: 0 };
function openLightbox(key, i) {
  lb = { key, i }; showLb(); const d = $('#lightbox'); if (!d.open) d.showModal();
}
function showLb() {
  const d = S.get(lb.key), list = d?.photos || [];
  if (!list.length) return $('#lightbox').close();
  lb.i = (lb.i + list.length) % list.length;
  const img = $('#lbImg'); img.removeAttribute('src');
  S.photoURL(list[lb.i]).then(src => { img.src = src; }).catch(() => toast('Photo not synced to this device yet'));
  img.alt = `${d.title} — moment ${lb.i + 1}`;
  $('#lbCap').textContent = `${d.emoji || ''} ${d.title} · ${lb.i + 1}/${list.length}`;
}
$('#lightbox').addEventListener('click', e => {
  const a = e.target.closest('[data-lb]')?.dataset.lb;
  if (a === 'close' || e.target === e.currentTarget) return $('#lightbox').close();
  if (a === 'prev') { lb.i--; showLb(); }
  if (a === 'next') { lb.i++; showLb(); }
  if (a === 'delete') {
    const d = S.get(lb.key);
    S.put(lb.key, { ...d, photos: d.photos.filter((_, j) => j !== lb.i) }, `revert(moments): remove a photo from "${d.title}"`);
    showLb();
  }
});
addEventListener('keydown', e => {
  if (!$('#lightbox').open) return;
  if (e.key === 'ArrowLeft') { lb.i--; showLb(); }
  if (e.key === 'ArrowRight') { lb.i++; showLb(); }
});
{ let x0 = null;
  $('#lightbox').addEventListener('pointerdown', e => { x0 = e.clientX; });
  $('#lightbox').addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) { lb.i += e.clientX < x0 ? 1 : -1; showLb(); } x0 = null; });
}

// ---- global click actions -------------------------------------------------------
$('#view').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const key = btn.closest('[data-key]')?.dataset.key, d = key && S.get(key) ? { ...S.get(key), key } : null;
  const act = btn.dataset.act;
  ({
    tos: showTos,
    'copy-invite': async () => {
      const url = location.href.split('#')[0] + '#ask';
      try { if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ title: 'A very important request', url }); else { await navigator.clipboard.writeText(url); toast('🔗 Invite link copied'); } }
      catch { toast(url, 6000); }
    },
    'cal-prev': () => { calCursor.setMonth(calCursor.getMonth() - 1); render(); },
    'cal-next': () => { calCursor.setMonth(calCursor.getMonth() + 1); render(); },
    'cal-today': () => { calCursor = new Date(); calCursor.setDate(1); render(); },
    'plan-on': () => openDateForm({ date: btn.dataset.day, status: 'planned' }),
    weekends: () => {
      const y = calCursor.getFullYear(), mo = calCursor.getMonth(), t = today(); let c = 0;
      for (let i = 1; i <= new Date(y, mo + 1, 0).getDate(); i++) {
        const dt = new Date(y, mo, i), ds = isoDay(dt);
        if ((dt.getDay() === 0 || dt.getDay() === 6) && ds >= t && !isFree(me(), ds)) { S.put(`free:${me()}:${ds}`, { v: true }, null, true); c++; }
      }
      S.note(`feat(calendar): ${nameOf(me())} is free on ${plural(c, 'weekend day')}`);
    },
    'clear-month': () => {
      const y = calCursor.getFullYear(), mo = calCursor.getMonth(), t = today();
      for (let i = 1; i <= new Date(y, mo + 1, 0).getDate(); i++) { const ds = isoDay(new Date(y, mo, i)); if (ds >= t && isFree(me(), ds)) S.put(`free:${me()}:${ds}`, { v: false }, null, true); }
      S.note(`chore(calendar): ${nameOf(me())} cleared ${calCursor.toLocaleDateString(undefined, { month: 'long' })}`);
    },
    whoami: pickMe,
    new: () => openDateForm({ status: 'idea' }),
    spin,
    edit: () => openDateForm(d),
    retro: () => openDateForm(d, true),
    'log-past': () => openDateForm({ status: 'done', date: today() }, true),
    propose: () => {
      S.put(key, { ...d, status: 'proposed', by: me() }, `feat(rsvp): ${nameOf(me())} asked "${d.title}" 💌`);
      location.hash = '#ask';
    },
    ship: () => { S.put(key, { ...d, status: 'done' }, `feat(archive): ship "${d.title}" 🚀`); burst(); openDateForm({ ...d, status: 'done' }, true); },
    capture: () => capture(key),
    photo: () => openLightbox(key, Number(btn.dataset.i)),
    delete: () => {
      openModal(`<h2>Delete ${esc(ticketKey(d))}?</h2><p class="muted">“${esc(d.title)}”${d.photos?.length ? ` and its ${plural(d.photos.length, 'photo')}` : ''} will be removed for both of you.</p>
        <div class="actions"><button class="btn ghost" data-close>Keep it</button><button class="btn danger-solid" id="confirmDel">Delete</button></div>`);
      $('#confirmDel').onclick = () => { S.remove(key, `revert: delete "${d.title}"`); $('#modal').close(); toast('Deleted'); };
    },
  })[act]?.();
});

// ---- settings / identity --------------------------------------------------------
function pickMe() {
  const P = people();
  const m = openModal(`
    <h2>Who’s holding this phone?</h2>
    <p class="muted">Used for the calendar and for “who asked whom”.</p>
    <div class="who-pick">
      <button class="who a" data-p="a"><span>🙋</span>${esc(P.a)}</button>
      <button class="who b" data-p="b"><span>🙋</span>${esc(P.b)}</button>
    </div>`);
  m.onclick = e => { const p = e.target.closest('[data-p]')?.dataset.p; if (p) { S.ls.set('me', p); m.close(); render(); toast(`Hi ${nameOf(p)} 👋`); } };
}

const guessRepo = () => {
  if (location.hostname.endsWith('.github.io')) return `${location.hostname.split('.')[0]}/${location.pathname.split('/')[1]}`;
  return 'MikachuFM2202/hangouts';
};

async function openSettings() {
  const P = people(), vault = S.isSynced() ? null : await S.fetchVault();
  const syncBlock = S.isSynced() ? `
      <p>✅ Synced &amp; encrypted to <code>${esc(S.repo())}</code> · last sync ${ago(S.status.last)}${S.status.state === 'error' ? ` · <span class="err">${esc(S.status.error)}</span>` : ''}</p>
      <div class="actions left"><button type="button" class="btn ghost small" data-s="sync">Sync now</button><button type="button" class="btn ghost small danger" data-s="lock">Forget on this device</button></div>`
    : vault ? `
      <p class="muted">A vault exists. Enter your shared passphrase to sync this device.</p>
      <div class="row"><input type="password" id="sPass" placeholder="passphrase" autocomplete="current-password"><button type="button" class="btn primary small" data-s="unlock">Unlock</button></div>`
    : `
      <p class="muted">Right now everything lives only on this device. To share between both phones, create a vault (one time):</p>
      <ol class="small muted steps">
        <li>GitHub → Settings → Developer settings → <b>Fine-grained tokens</b> → Generate.</li>
        <li>Repository access: <b>only ${esc(guessRepo())}</b>. Permissions: <b>Contents → Read and write</b>.</li>
        <li>Paste it below with a long passphrase you’ll both remember.</li>
      </ol>
      <label>Repo<input id="sRepo" value="${esc(guessRepo())}"></label>
      <label>Fine-grained token<input id="sToken" type="password" placeholder="github_pat_…" autocomplete="off"></label>
      <div class="row"><label class="grow">Passphrase<input id="sPass" type="password" minlength="10" autocomplete="new-password"></label><label class="grow">Again<input id="sPass2" type="password" autocomplete="new-password"></label></div>
      <p class="small muted">Your token is encrypted with the passphrase (AES-256-GCM, PBKDF2 600k) before it’s committed. Nothing readable ever touches the repo.</p>
      <div class="actions left"><button type="button" class="btn primary small" data-s="create">Create vault &amp; sync</button></div>`;
  const m = openModal(`
    <form class="form settings" id="setForm">
      <h2>config.json</h2>
      <fieldset><legend>people</legend>
        <div class="row"><label class="grow">Person A<input name="a" value="${esc(P.a)}" maxlength="24"></label><label class="grow">Person B<input name="b" value="${esc(P.b)}" maxlength="24"></label></div>
        <label>Together since<input type="date" name="start" value="${esc(P.start)}"></label>
        <p class="small">This device is <b>${esc(nameOf(me()))}</b> · <button type="button" class="linkish" data-s="me">switch</button></p>
      </fieldset>
      <fieldset><legend>sync</legend>${syncBlock}<p class="err" id="sErr" role="alert"></p></fieldset>
      <fieldset><legend>backup</legend>
        <div class="actions left"><button type="button" class="btn ghost small" data-s="export">Export JSON</button><label class="btn ghost small file">Import JSON<input type="file" accept="application/json" id="sImport" hidden></label></div>
        <p class="small muted">Backups hold plans, calendar, and retros. Photos stay in the encrypted repo.</p>
      </fieldset>
      <div class="actions"><button type="button" class="btn ghost" data-close>Close</button><button class="btn primary">Save</button></div>
    </form>`, 'wide');
  const f = $('#setForm', m), err = msg => { $('#sErr', m).textContent = msg; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    S.put('cfg:people', { a: f.a.value.trim() || 'Player 1', b: f.b.value.trim() || 'Player 2', start: f.start.value }, 'chore(config): update people.json');
    m.close(); toast('config.json saved');
  });
  $('#sImport', m)?.addEventListener('change', async e => {
    try { S.importItems(JSON.parse(await e.target.files[0].text())); toast('Backup restored'); m.close(); } catch { err('That file isn’t a hangouts backup.'); }
  });
  m.onclick = async e => {
    const a = e.target.closest('[data-s]')?.dataset.s; if (!a) return;
    const btn = e.target.closest('button');
    const busy = async fn => { btn.disabled = true; const t = btn.textContent; btn.textContent = 'working…'; try { await fn(); } catch (x) { err(x.message); } finally { btn.disabled = false; btn.textContent = t; } };
    if (a === 'me') { m.close(); pickMe(); }
    if (a === 'sync') busy(async () => { await S.sync(); m.close(); toast(S.status.state === 'ok' ? '✓ Synced' : '⚠ ' + S.status.error); });
    if (a === 'lock') { S.lock(); m.close(); toast('This device is now local-only'); render(); }
    if (a === 'export') {
      const url = URL.createObjectURL(new Blob([S.exportItems()], { type: 'application/json' }));
      Object.assign(document.createElement('a'), { href: url, download: `hangouts-backup-${today()}.json` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (a === 'unlock') busy(async () => { await S.unlock($('#sPass', m).value, vault); m.close(); toast('🔓 Synced'); render(); });
    if (a === 'create') busy(async () => {
      const pass = $('#sPass', m).value, token = $('#sToken', m).value.trim(), repo = $('#sRepo', m).value.trim();
      if (pass.length < 10) throw new Error('Passphrase needs at least 10 characters — it guards your token.');
      if (pass !== $('#sPass2', m).value) throw new Error('Passphrases don’t match.');
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Repo should look like owner/name.');
      if (!token) throw new Error('Paste the fine-grained token.');
      await S.createVault({ pass, token, repo }).catch(x => { throw new Error(x.status === 401 ? 'GitHub rejected that token (401).' : x.status === 404 ? 'Repo not found, or the token can’t see it (404).' : x.status === 403 ? 'Token lacks Contents: Read and write (403).' : x.message); });
      m.close(); toast('🔐 Vault sealed — sync is on'); burst(); render();
    });
  };
}
$('#settingsBtn').addEventListener('click', openSettings);

// ---- status bar + timers ----------------------------------------------------------
function renderStatus() {
  const P = people(), st = S.status;
  const sync = !S.isSynced() ? '<span title="Only on this device">◌ local-only</span>'
    : st.state === 'syncing' ? '<span>⟳ syncing…</span>'
    : st.state === 'error' ? `<span class="warn">⚠ ${esc(st.error)}</span>` : `<span>✓ synced ${ago(st.last)}</span>`;
  const up = P.start ? `${Math.max(0, Math.floor((Date.now() - parseDay(P.start)) / 864e5))}d` : '—';
  const shipped = dates().filter(d => d.status === 'done').length;
  $('#statusbar').innerHTML = `<span class="sb-branch">⎇ main</span><span>♥ ${esc(P.a)} &amp; ${esc(P.b)}</span><span class="hide-sm">uptime ${up} · SLA 100%</span>
    <span class="grow"></span><span class="hide-sm">${shipped} shipped</span><span class="hide-sm">0 errors, ∞ butterflies</span><button class="sb-sync" id="sbSync">${sync}</button>`;
}
$('#statusbar').addEventListener('click', e => { if (e.target.closest('#sbSync')) S.isSynced() ? S.sync() : openSettings(); });
function tick() {
  $$('[data-until]').forEach(el => { const d = S.get(el.dataset.until); if (d) el.textContent = until(d); });
}
setInterval(tick, 1000);
setInterval(renderStatus, 20000);
setInterval(() => document.visibilityState === 'visible' && S.sync(), 30000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && S.sync());
addEventListener('online', () => S.sync());

// ---- boot sequence + lock ----------------------------------------------------------
async function boot() {
  if (sessionStorage.getItem('booted') || reduceMotion) return;
  sessionStorage.setItem('booted', '1');
  const el = $('#boot'), log = $('#bootLog'), bar = $('#bootBar');
  el.hidden = false;
  let skip = false; el.onclick = () => { skip = true; };
  const lines = ['$ npm run love', '> hangouts@2.0.26 love', '> vite --host your-heart', '',
    'resolving dependencies… ❤@latest, 🦋@^3.0.0, snacks@*', 'compiling feelings… <span class="warn">3 warnings (butterflies)</span>',
    'running test suite… <span class="ok">42 passed</span>, 0 failed', 'linting excuses… <span class="ok">none found</span>',
    'establishing secure connection to ' + esc(nameOf(other(me()))) + '… <span class="ok">ok</span>', '', '<span class="ok">✓ ready in 0.143s</span>'];
  for (let i = 0; i < lines.length && !skip; i++) {
    log.innerHTML += lines[i] + '\n'; bar.style.width = `${((i + 1) / lines.length) * 100}%`;
    await sleep(lines[i] ? 160 : 60);
  }
  if (!skip) await sleep(350);
  el.classList.add('out'); await sleep(300); el.hidden = true;
}

async function gate() {
  if (S.isSynced() || S.ls.get('localOnly', false)) return;
  const vault = await S.fetchVault(); if (!vault) return;
  const el = $('#lock'); el.hidden = false; $('#lockPass').focus();
  await new Promise(resolve => {
    $('#lockSkip').onclick = () => { S.ls.set('localOnly', true); el.hidden = true; resolve(); };
    $('#lockForm').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#lockForm button[type=submit]'); btn.disabled = true; btn.textContent = 'deriving key…';
      try { await S.unlock($('#lockPass').value, vault); el.hidden = true; resolve(); }
      catch { $('#lockErr').textContent = '403 Forbidden — wrong passphrase. This incident will be reported to your partner.'; $('#lockPass').select(); }
      finally { btn.disabled = false; btn.textContent = 'Unlock'; }
    };
  });
}

S.onChange(what => (what === 'items' ? render() : renderStatus()));
addEventListener('hashchange', route);
const VIEWS = { ask: viewAsk, calendar: viewCalendar, plans: viewPlans, archive: viewArchive };
const BIND = { ask: bindAsk, calendar: bindCalendar, archive: bindArchive };

await S.init();
route();
await boot();
await gate();
route();
if (!S.ls.get('onboarded', false)) { S.ls.set('onboarded', true); if (!S.get('cfg:people')) openSettings(); else if (!S.ls.get('me', null)) pickMe(); }
S.sync();
