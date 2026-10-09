// Sends one push notification to each subscription in the repository_dispatch payload.
// Run by .github/workflows/notify.yml. The payload never holds private text: the app only sends generic titles.
import webpush from 'web-push';

const p = JSON.parse(process.env.PAYLOAD || '{}');
const subs = (Array.isArray(p.subs) ? p.subs : []).filter(s => s?.endpoint?.startsWith('https://') && s.keys?.p256dh && s.keys?.auth).slice(0, 10);
const msg = JSON.stringify({
  title: String(p.title || 'hangouts').slice(0, 80),
  body: String(p.body || '').slice(0, 160),
  tag: /^\w{1,20}$/.test(p.tag || '') ? p.tag : undefined,
  url: /^#\w+$/.test(p.url || '') ? p.url : '#ask',
});
webpush.setVapidDetails('https://mikachufm2202.github.io/hangouts/', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);

let ok = 0;
for (const sub of subs) {
  try { await webpush.sendNotification(sub, msg, { TTL: 86400, urgency: 'high' }); ok++; }
  catch (e) { console.log(`push failed: ${e.statusCode || e.message}${e.statusCode === 404 || e.statusCode === 410 ? ' (that phone turned notifications off)' : ''}`); }
}
console.log(`sent ${ok} of ${subs.length}`);
if (subs.length && !ok) process.exitCode = 1;
