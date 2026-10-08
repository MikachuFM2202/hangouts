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
  const ms = whenOf(d) - Date.now();
  if (ms <= 0) return ms > -6 * 3600e3 ? 'Happening now 💖' : 'Today';
  const dd = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return dd ? `${plural(dd, 'day')}, ${h}h ${pad(m)}m to go` : `${h}h ${pad(m)}m ${pad(s)}s to go`;
}

// ---- people + data ------------------------------------------------------------
const people = () => ({ a: 'Person 1', b: 'Person 2', start: '', ...S.get('cfg:people') });
const me = () => S.ls.get('me', 'a');
const nameOf = p => people()[p] || '?';
const other = p => (p === 'a' ? 'b' : 'a');
const isFree = (p, ds) => !!S.get(`free:${p}:${ds}`)?.v;
const daysTogether = () => { const s = people().start; return s ? Math.max(0, Math.floor((Date.now() - parseDay(s)) / 864e5)) : null; };

/** Next day-count or anniversary worth celebrating, e.g. {label: 'Day 700', date: '2027-01-26', inDays: 99}. */
function milestone() {
  const start = people().start; if (!start) return null;
  const s = parseDay(start), now = parseDay(today()), n = Math.round((now - s) / 864e5);
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

const dates = () => S.all('date:');
const nextN = () => dates().reduce((m, d) => Math.max(m, d.n || 0), 0) + 1;
const STATUS = { idea: 'Idea', proposed: 'Asked 💌', planned: 'Booked', done: 'Done' };
const MOODS = ['', '😍 swoon', '😂 so funny', '🥰 cozy', '🤩 core memory', '😌 chill', '🌧️ chaotic but cute'];

const NO_LINES = ['No', 'Are you sure?', 'Really sure? 🥺', 'Think again', 'Pretty please?', 'Wrong button!', 'You’re breaking my heart 💔',
  'Nope, try the other one', 'This button is shy', 'I’ll wait…', 'Have you tried Yes?', 'Still no? 😢', 'Okay, but what if yes', 'So close to yes',
  'Last chance 👀'];
const NO_TALLY = ['', 'She’s thinking about it…', 'Playing hard to get, I see', 'The No button is getting tired', 'You know you want to say yes', 'Resistance is futile 💕'];

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
  const shapes = confetti.shapeFromText ? [confetti.shapeFromText({ text: '💖', scalar: 2 }), confetti.shapeFromText({ text: '🌸', scalar: 2 })] : undefined;
  const fire = o => confetti({ particleCount: 60, spread: 80, startVelocity: 42, scalar: 2, ticks: 220, shapes, ...o });
  fire({ origin: { x: 0.2, y: 0.7 }, angle: 60 }); fire({ origin: { x: 0.8, y: 0.7 }, angle: 120 });
  setTimeout(() => fire({ origin: { x: 0.5, y: 0.4 }, spread: 140, particleCount: 80 }), 250);
};

// ---- router -------------------------------------------------------------------
const TABS = ['ask', 'calendar', 'plans', 'ideas', 'activities', 'memories'];
let tab = 'ask', cleanup = null, painting = false, archiveQuery = '', lastHtml = '';
function route() {
  const h = location.hash.slice(1);
  tab = TABS.includes(h) ? h : h === 'archive' ? 'memories' : 'ask';
  ['#modal', '#lightbox'].forEach(s => $(s).open && $(s).close());
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

// ---- Ask ----------------------------------------------------------------------
let noTries = 0, askPlan = null;
function viewAsk() {
  askPlan = dates().filter(d => d.status === 'proposed').sort((a, b) => b.u - a.u)[0] || null;
  return `
  <section class="ask">
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
    <div class="ask-foot">
      <p class="tos">By saying yes you agree to the <button class="linkish" data-act="tos">Terms of Cuddles</button>.</p>
      <button class="btn ghost small" data-act="copy-invite">🔗 Send this page</button>
      <a class="btn ghost small" href="#plans">💌 Ask about a specific plan</a>
    </div>
  </section>`;
}
function bindAsk(v) {
  const no = $('#noBtn', v), yes = $('#yesBtn', v), tally = $('#tally', v), slot = no.parentElement;
  const ac = new AbortController(), sig = { signal: ac.signal };
  cleanup = () => { ac.abort(); if (no.parentElement === document.body) no.remove(); };
  let lastDodge = 0;

  const level = () => {
    yes.style.setProperty('--grow', Math.min(1 + noTries * 0.07, 1.9));
    if (noTries >= NO_LINES.length) { no.textContent = 'Yes 💖'; no.classList.add('yes'); no.dataset.converted = '1'; }
    else no.textContent = NO_LINES[noTries];
    tally.textContent = NO_TALLY[Math.min(NO_TALLY.length - 1, Math.ceil(noTries / 3))];
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
    if (no.dataset.converted) return;
    noTries++; level();
    if (no.dataset.converted) return settle();
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
    if (e.pointerType !== 'mouse' || no.dataset.converted || performance.now() - lastDodge < 180) return;
    const r = no.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) < 60) dodge(e.clientX, e.clientY);
  }, sig);
  no.addEventListener('pointerdown', e => { if (!no.dataset.converted) { e.preventDefault(); dodge(e.clientX, e.clientY); } }, sig);
  no.addEventListener('click', e => {
    if (no.dataset.converted) return sayYes();
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
  if (plan) S.put(plan.key, { ...plan, status: 'planned', answeredAt: Date.now() }, null, true);
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
  dates().filter(d => d.date && d.status !== 'idea').forEach(d => (byDay[d.date] ||= []).push(d));
  const matches = [];
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('');
  cells += '<div class="day pad"></div>'.repeat(offset);
  for (let d = 1; d <= n; d++) {
    const ds = `${y}-${pad(mo + 1)}-${pad(d)}`, fa = isFree('a', ds), fb = isFree('b', ds), past = ds < t, ev = byDay[ds];
    if (!past && fa && fb) matches.push(ds);
    const label = `${fmtDay(ds, LONG)}${fa ? `, ${P.a} free` : ''}${fb ? `, ${P.b} free` : ''}${ev ? `, ${ev.map(e => e.title).join(', ')}` : ''}`;
    cells += `<button class="day${fa ? ' fa' : ''}${fb ? ' fb' : ''}${fa && fb ? ' match' : ''}${past ? ' past' : ''}${ds === t ? ' today' : ''}" data-day="${ds}"
      ${past ? 'disabled' : ''} aria-pressed="${isFree(m, ds)}" aria-label="${esc(label)}">
      <span class="num">${d}</span>${ev ? `<span class="ev" title="${esc(ev.map(e => e.title).join(', '))}">${esc(ev[0].emoji || '📌')}</span>` : ''}
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
        <span><i class="sw a"></i>${esc(P.a)}</span><span><i class="sw b"></i>${esc(P.b)}</span><span><i class="sw m"></i>Both free</span><span>📌 Date planned</span>
      </div>
    </div>
    <div class="panel">
      <h3>${matches.length ? `💞 You’re both free on ${plural(matches.length, 'day')} this month` : 'No days in common yet'}</h3>
      ${matches.length ? `<ul class="matches">${matches.map(ds => `
        <li><span>${fmtDay(ds, LONG)}</span>
        ${byDay[ds] ? `<span class="muted small">${esc(byDay[ds][0].emoji || '')} ${esc(byDay[ds][0].title)}</span>` : `<button class="btn small" data-act="plan-on" data-day="${ds}">Plan a date</button>`}</li>`).join('')}</ul>`
      : `<p class="muted">Both of you tap the days you’re free. Days that match turn purple and show up here.</p>`}
      <div class="quick">
        <button class="btn ghost small" data-act="weekends">I’m free every weekend</button>
        <button class="btn ghost small" data-act="clear-month">Clear my days this month</button>
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
    if (mouse) { mouse = false; return; }
    const el = e.target.closest('.day[data-day]'); if (!el || el.disabled) return;
    painting = true; touched = new Set(); mode = !isFree(me(), el.dataset.day); apply(el); done();
  });
}

// ---- Plans ----------------------------------------------------------------------
const thumb = (key, id, i) => `<button class="thumb" data-act="photo" data-key="${esc(key)}" data-i="${i}"><img data-photo="${esc(id)}" alt="Photo ${i + 1}" loading="lazy"></button>`;
function card(d) {
  const past = d.date && d.date < today() && d.status !== 'done';
  const photos = d.photos || [];
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
  f.addEventListener('submit', e => {
    e.preventDefault();
    const x = Object.fromEntries(new FormData(f));
    x.title = x.title.trim(); x.rating = x.rating ? Number(x.rating) : undefined;
    const key = d.key || 'date:' + S.uid();
    const out = { photos: [], by: me(), n: nextN(), ...d, ...x };
    const nowDone = x.status === 'done' && (isNew || S.get(key)?.status !== 'done');
    S.put(key, out, `${isNew ? 'feat(plans): add' : 'fix(plans): update'} "${x.title}" ${x.emoji || ''}`.trim());
    m.close();
    toast(isNew ? (x.status === 'done' ? '💾 Added to memories' : '💾 Plan saved') : 'Saved');
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
function saveIdea({ emoji, title, notes, link, place }) {
  if (savedTitles().has(title.toLowerCase())) return toast('Already in your plans 💕');
  S.put('date:' + S.uid(), { emoji, title, notes, link, place, status: 'idea', by: me(), n: nextN(), photos: [] }, `feat(ideas): save "${title}" ${emoji}`);
  toast('💡 Saved to Plans › Ideas for later');
}
let ideaCat = 'all', ideaCost = 'all', ideaDist = 'all';
const ideaFromRow = ([emoji, title, tip, , , place]) => ({ emoji, title, notes: tip, place: place && !/ (workshop|shop|court|gym|room|arcade|bowling|cinema|reflexology|house) /.test(` ${place} `) ? place : undefined });
const distBand = mins => (mins === 0 ? 'home' : mins <= 30 ? 'near' : 'far');
function viewIdeas() {
  const saved = savedTitles();
  const chip = (group, val, label, cur) => `<button class="chip" data-act="${group}" data-v="${val}" aria-pressed="${cur === val}">${label}</button>`;
  return `
  <section class="ideas">
    <div class="section-head">
      <div><h1>Date ideas</h1><p class="muted">${DATE_IDEAS.length} daytime ideas within an hour of ${esc(HOME)}, all under RM150 for the two of you. Prices are rough guides with MyKad.</p></div>
      <div class="head-actions"><button class="btn primary" data-act="spin">🎲 Surprise me</button></div>
    </div>
    <div class="filters">
      <div class="chips" role="group" aria-label="Type">${chip('icat', 'all', 'All', ideaCat)}${Object.entries(IDEA_CATS).map(([k, l]) => chip('icat', k, l, ideaCat)).join('')}</div>
      <div class="chips" role="group" aria-label="Budget for two">${chip('icost', 'all', 'Any budget', ideaCost)}${COST.map((l, i) => chip('icost', String(i), l, ideaCost)).join('')}</div>
      <div class="chips" role="group" aria-label="Distance">${chip('idist', 'all', 'Any distance', ideaDist)}${chip('idist', 'home', '🏠 At home', ideaDist)}${chip('idist', 'near', '🚗 Up to 30 min', ideaDist)}${chip('idist', 'far', '🚗 30–60 min', ideaDist)}</div>
    </div>
    <div class="idea-grid">${DATE_IDEAS.map(([e, t, tip, cat, cost, place, mins], i) => `
      <article class="idea" data-cat="${cat}" data-cost="${cost}" data-dist="${distBand(mins)}">
        <div class="i-emoji">${e}</div>
        <div class="i-body">
          <h3>${esc(t)}</h3>
          <p>${esc(tip)}</p>
          ${place ? `<div class="i-where"><a href="https://www.google.com/maps/search/${encodeURIComponent(place)}" target="_blank" rel="noopener">📍 ${esc(place.replace(/,? Kuala Lumpur$/, ''))}</a> · ~${mins} min drive</div>` : ''}
          <div class="i-tags"><span class="pill">${IDEA_CATS[cat]}</span><span class="pill">${COST[cost]}${cost ? ' for two' : ''}</span></div>
        </div>
        <button class="btn small ${saved.has(t.toLowerCase()) ? 'saved' : ''}" data-act="save-idea" data-i="${i}">${saved.has(t.toLowerCase()) ? '✓ Saved' : '+ Save'}</button>
      </article>`).join('')}</div>
    <p class="empty" id="noIdeas" hidden>Nothing matches all three filters. Try loosening one.</p>
  </section>`;
}
function bindIdeas(v) {
  let hits = 0;
  $$('.idea', v).forEach(el => {
    const on = (ideaCat === 'all' || el.dataset.cat === ideaCat) && (ideaCost === 'all' || el.dataset.cost === ideaCost) && (ideaDist === 'all' || el.dataset.dist === ideaDist);
    el.hidden = !on; hits += on;
  });
  $('#noIdeas', v).hidden = hits > 0;
}

// ---- Activities -------------------------------------------------------------------
function viewActivities() {
  const saved = savedTitles();
  return `
  <section class="activities">
    <div class="section-head">
      <div><h1>Things to do together</h1><p class="muted">Watch shows in sync, play games and get closer, in the same room or miles apart.</p></div>
    </div>
    <div class="chips">${ACTIVITY_GROUPS.map(g => `<button class="chip" data-act="jump" data-id="${g.id}">${g.title}</button>`).join('')}</div>
    ${ACTIVITY_GROUPS.map((g, gi) => `
    <div class="act-group" id="grp-${g.id}">
      <h2 class="col-title">${g.title}</h2>
      <p class="muted group-blurb">${esc(g.blurb)}</p>
      <div class="act-grid">${g.items.map((a, ii) => `
        <article class="act">
          <div class="a-top"><span class="c-emoji">${a.e}</span><div><h3>${esc(a.name)}</h3><div class="muted small">${esc(a.cost)} · ${esc(a.on)}</div></div></div>
          <p>${esc(a.what)}</p>
          <div class="card-actions">
            <a class="btn small" href="${esc(a.url)}" target="_blank" rel="noopener">Open ↗</a>
            <button class="btn small ghost ${saved.has(a.name.toLowerCase()) ? 'saved' : ''}" data-act="save-act" data-g="${gi}" data-i="${ii}">${saved.has(a.name.toLowerCase()) ? '✓ In plans' : '+ Add to plans'}</button>
          </div>
        </article>`).join('')}</div>
    </div>`).join('')}
  </section>`;
}

// ---- Memories ---------------------------------------------------------------------
function viewMemories() {
  const done = dates().filter(d => d.status === 'done').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const photos = done.reduce((s, d) => s + (d.photos?.length || 0), 0);
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
        <div class="gallery">${(d.photos || []).map((p, j) => thumb(d.key, p, j)).join('')}
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
    'feat: spontaneous hangout ✨', true);
  return key;
}
$('#photoInput').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  const target = photoTarget; photoTarget = null;
  toast(`📸 Saving ${plural(files.length, 'photo')}…`);
  const ids = [];
  for (const f of files) {
    try { ids.push(await S.addPhoto(await shrink(f))); } catch (err) { console.error(err); toast(`Couldn’t open ${f.name}`); }
  }
  if (!ids.length) return;
  const key = (target && S.get(target)) ? target : todaysDateKey(); // only create a hangout once a photo actually worked
  const d = S.get(key);
  S.put(key, { ...d, photos: [...(d.photos || []), ...ids] }, `feat(moments): +${plural(ids.length, 'photo')} to "${d.title}" 📸`);
  toast(`💾 ${plural(ids.length, 'photo')} added to “${d.title}”`);
});
$('#captureFab').addEventListener('click', () => capture(null));

// lightbox: a list of {key, id} so it can show one date's photos or a slideshow of all of them
let lb = { list: [], i: 0, timer: null };
const photosOf = key => (S.get(key)?.photos || []).map(id => ({ key, id }));
function openLightbox(list, i, play = false) {
  lb = { list, i, timer: null }; showLb();
  const d = $('#lightbox'); if (!d.open) d.showModal();
  setPlay(play);
}
function setPlay(on) {
  clearInterval(lb.timer); lb.timer = on ? setInterval(() => { lb.i++; showLb(); }, 3500) : null;
  const b = $('#lbPlay'); b.textContent = on ? '⏸ Pause' : '▶ Play'; b.hidden = lb.list.length < 2;
}
function showLb() {
  lb.list = lb.list.filter(p => S.get(p.key)?.photos?.includes(p.id)); // drop photos removed meanwhile
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
  if (a === 'close' || e.target === e.currentTarget) return $('#lightbox').close();
  if (a === 'prev') { lb.i--; showLb(); setPlay(false); }
  if (a === 'next') { lb.i++; showLb(); setPlay(false); }
  if (a === 'play') setPlay(!lb.timer);
  if (a === 'delete') {
    const { key, id } = lb.list[lb.i], d = S.get(key);
    S.put(key, { ...d, photos: d.photos.filter(p => p !== id) }, `revert(moments): remove a photo from "${d.title}"`);
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
  $('#lightbox').addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) { lb.i += e.clientX < x0 ? 1 : -1; showLb(); setPlay(false); } x0 = null; });
}

// ---- global click actions -------------------------------------------------------
$('#view').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const key = btn.closest('[data-key]')?.dataset.key, d = key && S.get(key) ? { ...S.get(key), key } : null;
  const monthDays = () => { const y = calCursor.getFullYear(), mo = calCursor.getMonth(); return Array.from({ length: new Date(y, mo + 1, 0).getDate() }, (_, i) => new Date(y, mo, i + 1)); };
  ({
    tos: showTos,
    settings: openSettings,
    icat: () => { ideaCat = btn.dataset.v; render(); },
    icost: () => { ideaCost = btn.dataset.v; render(); },
    idist: () => { ideaDist = btn.dataset.v; render(); },
    'save-idea': () => { saveIdea(ideaFromRow(DATE_IDEAS[btn.dataset.i])); render(); },
    'save-act': () => { const a = ACTIVITY_GROUPS[btn.dataset.g].items[btn.dataset.i]; saveIdea({ emoji: a.e, title: a.name, notes: a.what, link: a.url }); render(); },
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
      openModal(`<h2>Delete this?</h2><p class="muted">“${esc(d.title)}”${d.photos?.length ? ` and its ${plural(d.photos.length, 'photo')}` : ''} will be removed for both of you.</p>
        <div class="actions"><button class="btn ghost" data-close>Keep it</button><button class="btn danger-solid" id="confirmDel">Delete</button></div>`);
      $('#confirmDel').onclick = () => { S.remove(key, `revert: delete "${d.title}"`); $('#modal').close(); toast('Deleted'); };
    },
  })[btn.dataset.act]?.();
});


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
    const [a, b] = eventTimes(d), e = x => String(x || '').replace(/[\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const dt = d.time ? ['DTSTART:' + a, 'DTEND:' + b] : ['DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + b];
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hangouts//EN', 'BEGIN:VEVENT', `UID:${d.key.replace(':', '-')}@hangouts`, 'DTSTAMP:' + now, ...dt,
      'SUMMARY:' + e(`${d.emoji || ''} ${d.title}`.trim()), d.place && 'LOCATION:' + e(d.place), d.notes && 'DESCRIPTION:' + e(d.notes),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(d.title), 'TRIGGER:-PT2H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    saveFile(`${d.title.replace(/[^\w\- ]+/g, '').trim() || 'date'}.ics`, body, 'text/calendar');
  };
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
      <fieldset><legend>Backup</legend>
        <div class="actions left"><button type="button" class="btn ghost small" data-s="export">Download backup</button><label class="btn ghost small file">Restore backup<input type="file" accept="application/json" id="sImport" hidden></label></div>
        <p class="small muted">Backups include plans, free days and notes. Photos aren’t included.</p>
      </fieldset>
      <div class="actions"><button type="button" class="btn ghost" data-close>Close</button><button class="btn primary">Save</button></div>
    </form>`, 'wide');
  const f = $('#setForm', m), err = msg => { $('#sErr', m).textContent = msg; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    S.put('cfg:people', { a: f.a.value.trim() || 'Person 1', b: f.b.value.trim() || 'Person 2', start: f.start.value }, 'chore(settings): update names');
    m.close(); toast('Saved');
    if (!S.ls.get('me', null)) pickMe();
  });
  $('#sImport', m)?.addEventListener('change', async e => {
    try { S.importItems(JSON.parse(await e.target.files[0].text())); toast('Backup restored'); m.close(); } catch { err('That file isn’t a hangouts backup.'); }
  });
  m.onclick = async e => {
    const a = e.target.closest('[data-s]')?.dataset.s; if (!a) return;
    const btn = e.target.closest('button');
    const busy = async fn => { btn.disabled = true; const t = btn.textContent; btn.textContent = 'One moment…'; err(''); try { await fn(); } catch (x) { err(x.message); } finally { btn.disabled = false; btn.textContent = t; } };
    if (a === 'me') { m.close(); pickMe(); }
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

S.onChange(what => (what === 'items' ? render() : renderSync()));
addEventListener('hashchange', route);
const VIEWS = { ask: viewAsk, calendar: viewCalendar, plans: viewPlans, ideas: viewIdeas, activities: viewActivities, memories: viewMemories };
const BIND = { ask: bindAsk, calendar: bindCalendar, ideas: bindIdeas, memories: bindMemories };

await S.init();
route();
await gate();
route();
if (!S.ls.get('onboarded', false)) { S.ls.set('onboarded', true); if (!S.get('cfg:people')) openSettings(); else if (!S.ls.get('me', null)) pickMe(); }
else if (!S.ls.get('me', null) && S.get('cfg:people')) pickMe();
S.sync();
