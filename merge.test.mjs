// Run: node merge.test.mjs — checks the two-phone merge rule (newer `u` wins per key, tombstones win too).
import { merge, same } from './store.js';
const remote = { 'date:1': { title: 'old', u: 1 }, 'date:2': { title: 'theirs', u: 5 }, 'free:a:2026-10-12': { v: true, u: 3 } };
const local  = { 'date:1': { title: 'new', u: 2 }, 'date:2': { title: 'mine', u: 4 }, 'free:a:2026-10-12': { del: true, u: 9 }, 'date:3': { title: 'added', u: 1 } };
const m = merge(remote, local);
console.assert(m['date:1'].title === 'new', 'newer local edit wins');
console.assert(m['date:2'].title === 'theirs', 'newer remote edit wins');
console.assert(m['free:a:2026-10-12'].del, 'tombstone wins when newer');
console.assert(m['date:3'], 'local-only item kept');
console.assert(same(merge(m, remote), m) && !same(m, remote), 'merge is idempotent');
console.log('merge ok');
