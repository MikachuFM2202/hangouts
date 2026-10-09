#!/usr/bin/env python3
"""Find events in and around KL for the next 7 days and print them as JSON (the "This week" tab).

Sources, merged and de-duplicated. Any one may fail; the run only fails if all of them do.
- Eventbrite's KL listing pages. Its firewall blocks GitHub's servers, so this only works from a home connection.
- Meetup's KL search page (its results are embedded as JSON). No map pins, so distance comes from the town name.
- allevents.in's listing API (needs the client token from its page). Big gigs, expos and festivals.
Run by .github/workflows/events.yml, which saves the output to events.json on the `events` branch.
`python3 scripts/events.py --check` runs the self-check instead.
"""
import html, http.cookiejar, json, math, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HOME = (3.205, 101.735)            # Altris Residence, Wangsa Maju
MAX_KM = 60                        # roughly an hour's drive
MYT = timezone(timedelta(hours=8))
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36'
SKIP = re.compile(r'webinar|training course|hrd[fc]|recruitment|networking|conference|summit|seminar|congress|forum|\bmba\b|online|atas talian|kursus|open day', re.I)
EMOJI = {'Music': '🎵', 'Food & Drink': '🍜', 'Performing & Visual Arts': '🎨', 'Health & Wellness': '💆', 'Sports & Fitness': '🏃',
         'Community & Culture': '🏮', 'Film, Media & Entertainment': '🎬', 'Hobbies & Special Interest': '🧶', 'Science & Technology': '🔬',
         'Family & Education': '📚', 'Travel & Outdoor': '🌿', 'Charity & Causes': '💗', 'Fashion & Beauty': '👗', 'Seasonal & Holiday': '🎉',
         'Spirituality': '🕯️', 'Home & Lifestyle': '🏡', 'Auto, Boat & Air': '🚗', 'Meetup': '🤝'}
# allevents categories are loose words; first match wins
WORDS = [(r'concert|music|gigs?\b|dj\b', '🎵', 'Music'), ('food|drink|coffee', '🍜', 'Food & Drink'), (r'arts?\b|theat|comedy|danc|film', '🎨', 'Arts'),
         ('run|fitness|sport|yoga|hik', '🏃', 'Sports & Fitness'), ('festival|party|holiday', '🎉', 'Festival'), ('expo|exhibition|fair', '🏛️', 'Expo'),
         ('workshop|class|craft', '🧶', 'Workshop')]
# Meetup gives a town, not a map pin
TOWNS = {'kuala lumpur': (3.148, 101.694), 'petaling jaya': (3.107, 101.607), 'subang jaya': (3.05, 101.585), 'shah alam': (3.073, 101.518),
         'puchong': (3.025, 101.616), 'cheras': (3.106, 101.726), 'ampang': (3.149, 101.761), 'cyberjaya': (2.922, 101.65), 'putrajaya': (2.926, 101.696),
         'kajang': (2.993, 101.788), 'selayang': (3.254, 101.65), 'rawang': (3.32, 101.575), 'klang': (3.044, 101.445), 'seri kembangan': (3.02, 101.705),
         'bangi': (2.962, 101.776), 'setapak': (3.199, 101.711), 'gombak': (3.253, 101.69), 'mont kiara': (3.168, 101.65), 'bangsar': (3.13, 101.67)}


def km(lat, lon):
    la1, lo1, la2, lo2 = map(math.radians, (*HOME, lat, lon))
    a = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def make(start, end, *, id, name, date, time='', end_date='', end_time='', venue='', area='', lat=None, lon=None, cat='', emoji='🎟️', summary='', url=''):
    """Our event dict, or None if it's outside the window, too far, unmappable, or a work thing."""
    name = html.unescape(name or '').strip()
    if not name or not date or not url or not (start <= date < end) or SKIP.search(name) or cat == 'Business & Professional':
        return None
    try:
        dist = round(km(float(lat), float(lon)))
    except (TypeError, ValueError):
        return None  # no location: can't tell if it's nearby
    if dist > MAX_KM:
        return None
    summary = re.sub(r'\s+', ' ', html.unescape(summary or '')).strip()
    if summary.lower().startswith(name.lower()[:40]):
        summary = ''  # many organisers just repeat the title
    if len(summary) > 220:
        summary = summary[:217].rsplit(' ', 1)[0] + '…'
    return {'id': str(id), 'name': name, 'emoji': emoji, 'cat': cat, 'date': date, 'time': time, 'end_date': end_date if end_date > date else '',
            'end_time': end_time, 'venue': html.unescape(venue or '').strip(), 'area': area or '', 'km': dist, 'summary': summary, 'url': url}


# ---- fetching ----------------------------------------------------------------------------
_jar = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def fetch(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', **(headers or {})})
    with _jar.open(req, timeout=30) as f:
        return f.read().decode('utf-8')


# ---- Eventbrite ----------------------------------------------------------------------------
def eventbrite_results(page):
    i = page.find('__SERVER_DATA__ = ')
    if i < 0:
        raise ValueError('no __SERVER_DATA__ (page layout changed or request blocked)')
    data, _ = json.JSONDecoder().raw_decode(page, i + len('__SERVER_DATA__ = '))
    ev = data['search_data']['events']
    return ev['results'], ev['pagination'].get('page_count') or 1


def eventbrite_one(r, start, end):
    if r.get('is_online_event') or r.get('is_cancelled'):
        return None
    v = r.get('primary_venue') or {}
    a = v.get('address') or {}
    cat = next((t['display_name'] for t in r.get('tags', []) if t.get('prefix') == 'EventbriteCategory'), '')
    return make(start, end, id='eb' + str(r.get('id')), name=r.get('name'), date=r.get('start_date'), time=r.get('start_time') or '',
                end_date=r.get('end_date') or '', end_time=r.get('end_time') or '', venue=v.get('name'), area=a.get('city'),
                lat=a.get('latitude'), lon=a.get('longitude'), cat=cat, emoji=EMOJI.get(cat, '🎟️'), summary=r.get('summary'), url=r.get('url'))


def eventbrite(start, end):
    for page in ['this-week', 'next-week']:  # next-week fills in the days after Sunday
        n, total = 1, 1
        while n <= min(total, 5):
            rs, total = eventbrite_results(fetch(f'https://www.eventbrite.com/d/malaysia--kuala-lumpur/events--{page}/?page={n}'))
            yield from (eventbrite_one(r, start, end) for r in rs)
            n += 1
            time.sleep(1)


# ---- Meetup ----------------------------------------------------------------------------------
def meetup_results(page):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', page, re.S)
    if not m:
        raise ValueError('no __NEXT_DATA__ (page layout changed or request blocked)')
    state = json.loads(m.group(1))['props']['pageProps']['__APOLLO_STATE__']
    return [v for k, v in state.items() if k.startswith('Event:')]


def meetup_one(e, start, end):
    if e.get('eventType') != 'PHYSICAL' or not e.get('dateTime'):
        return None
    v = e.get('venue') or {}
    lat, lon = TOWNS.get((v.get('city') or '').strip().lower(), (None, None))
    when = e['dateTime']  # 2026-10-09T19:00:00+08:00
    return make(start, end, id='mu' + str(e.get('id')), name=e.get('title'), date=when[:10], time=when[11:16], venue=v.get('name'), area=v.get('city'),
                lat=lat, lon=lon, cat='Meetup', emoji=EMOJI['Meetup'], summary=(e.get('description') or '').split('\n')[0], url=e.get('eventUrl'))


def meetup(start, end):
    q = f'customStartDate={start}T00%3A00%3A00%2B08%3A00&customEndDate={end}T00%3A00%3A00%2B08%3A00'
    page = fetch(f'https://www.meetup.com/find/?location=my--Kuala%20Lumpur&source=EVENTS&eventType=inPerson&{q}')
    yield from (meetup_one(e, start, end) for e in meetup_results(page))


# ---- allevents.in -----------------------------------------------------------------------------
def allevents_one(x, start, end):
    v = x.get('venue') or {}
    # allevents stores local wall-clock time as if it were UTC
    st = datetime.fromtimestamp(int(x['start_time']), timezone.utc)
    en = datetime.fromtimestamp(int(x.get('end_time') or x['start_time']), timezone.utc)
    timed = ' at ' in (x.get('start_time_display') or '')
    words = ' '.join(x.get('categories') or []).lower()
    emoji, cat = next(((e, c) for pat, e, c in WORDS if re.search(rf'\b({pat})', words)), ('🎟️', ''))
    if 'business' in words and not cat:
        return None
    return make(start, end, id='ae' + str(x.get('event_id')), name=x.get('eventname'), date=st.strftime('%Y-%m-%d'), time=st.strftime('%H:%M') if timed else '',
                end_date=en.strftime('%Y-%m-%d'), venue=x.get('location'), area=v.get('city'), lat=v.get('latitude'), lon=v.get('longitude'),
                cat=cat, emoji=emoji, summary='', url=x.get('event_url'))


def allevents(start, end):
    page = fetch('https://allevents.in/kuala-lumpur/this-week')
    token = re.search(r'window\.__cst = "([^"]+)"', page)
    if not token:
        raise ValueError('no client token on the allevents page')
    hdr = {'Content-Type': 'application/json', 'X-Client-State': token.group(1), 'Origin': 'https://allevents.in', 'Referer': 'https://allevents.in/kuala-lumpur/this-week'}
    for popular in (False, True):
        for n in range(1, 7):
            body = {'city': 'kuala lumpur', 'country': 'malaysia', 'page': n, 'rows': 46, 'popular': popular, 'venue': [], 'keywords': '', 'type': '', 'ids': [], 'sdate': '', 'edate': ''}
            rows = json.loads(fetch('https://allevents.in/api/events/list', json.dumps(body).encode(), hdr)).get('data') or []
            yield from (allevents_one(x, start, end) for x in rows)
            if len(rows) < 46:
                break
            time.sleep(.5)


SOURCES = {'Eventbrite': eventbrite, 'Meetup': meetup, 'allevents': allevents}


def collect(now):
    start, end = now.strftime('%Y-%m-%d'), (now + timedelta(days=7)).strftime('%Y-%m-%d')
    seen, out, used = set(), [], []
    for name, source in SOURCES.items():
        try:
            got = [e for e in source(start, end) if e]
        except Exception as e:  # one site down or blocking us shouldn't lose the others
            print(f'{name}: skipped ({e})', file=sys.stderr)
            continue
        print(f'{name}: {len(got)} events', file=sys.stderr)
        used.append(name)
        for e in got:
            dup = (re.sub(r'\W+', '', e['name'].lower())[:24], e['date'])  # same event on two sites, or one class under two ticket ids
            if e['id'] not in seen and dup not in seen:
                seen.update((e['id'], dup))
                out.append(e)
    if not used:
        raise SystemExit('every source failed; keeping the old list')
    out.sort(key=lambda e: (e['date'], e['time'], e['name']))
    return {'updated': int(now.timestamp() * 1000), 'from': start, 'to': end, 'source': ' + '.join(used), 'events': out}


def check():
    w = ('2026-10-09', '2026-10-16')
    page = 'x __SERVER_DATA__ = ' + json.dumps({'search_data': {'events': {'pagination': {'page_count': 2}, 'results': [
        {'id': 1, 'name': ' Jazz night ', 'start_date': '2026-10-10', 'start_time': '20:00', 'url': 'u',
         'tags': [{'prefix': 'EventbriteCategory', 'display_name': 'Music'}],
         'primary_venue': {'name': 'No Black Tie', 'address': {'latitude': '3.15', 'longitude': '101.71', 'city': 'Kuala Lumpur'}}},
        {'id': 2, 'name': 'Webinar', 'start_date': '2026-10-10', 'is_online_event': True, 'url': 'u'},
        {'id': 3, 'name': 'Penang walk', 'start_date': '2026-10-10', 'url': 'u', 'primary_venue': {'address': {'latitude': '5.41', 'longitude': '100.33'}}},
        {'id': 5, 'name': 'Excel Training Course - HRDF', 'start_date': '2026-10-10', 'url': 'u', 'primary_venue': {'address': {'latitude': '3.15', 'longitude': '101.71'}}},
        {'id': 4, 'name': 'Old', 'start_date': '2026-10-01', 'url': 'u', 'primary_venue': {'address': {'latitude': '3.15', 'longitude': '101.71'}}},
    ]}}}) + ';</script>'
    rs, pages = eventbrite_results(page)
    got = [eventbrite_one(r, *w) for r in rs]
    assert pages == 2
    assert got[0]['name'] == 'Jazz night' and got[0]['emoji'] == '🎵' and got[0]['km'] == 7, got[0]
    assert got[1:] == [None] * 4, got[1:]  # online, too far, work training, already over

    mu = '<script id="__NEXT_DATA__" type="application/json">' + json.dumps({'props': {'pageProps': {'__APOLLO_STATE__': {
        'Event:1': {'id': '1', 'title': 'Board games', 'dateTime': '2026-10-10T15:00:00+08:00', 'eventType': 'PHYSICAL', 'eventUrl': 'm',
                    'venue': {'name': 'Cafe', 'city': 'Petaling Jaya'}, 'description': 'Come play\nmore'},
        'Event:2': {'id': '2', 'title': 'Online', 'dateTime': '2026-10-10T15:00:00+08:00', 'eventType': 'ONLINE', 'eventUrl': 'm'},
        'Event:3': {'id': '3', 'title': 'Unknown town', 'dateTime': '2026-10-10T15:00:00+08:00', 'eventType': 'PHYSICAL', 'eventUrl': 'm', 'venue': {'city': 'Ipoh'}},
    }}}}) + '</script>'
    got = [meetup_one(e, *w) for e in meetup_results(mu)]
    assert got[0]['time'] == '15:00' and got[0]['area'] == 'Petaling Jaya' and got[0]['summary'] == 'Come play', got[0]
    assert got[1:] == [None, None], got[1:]

    sat = int(datetime(2026, 10, 10, 20, 0, tzinfo=timezone.utc).timestamp())
    ae = allevents_one({'event_id': 9, 'eventname': 'Rock &amp; Roll', 'start_time': str(sat), 'end_time': str(sat), 'start_time_display': 'Sat Oct 10 2026 at 08:00 pm',
                        'event_url': 'a', 'location': 'Zepp KL', 'categories': ['Concerts'], 'venue': {'city': 'Kuala Lumpur', 'latitude': '3.139', 'longitude': '101.69'}}, *w)
    assert ae['name'] == 'Rock & Roll' and ae['date'] == '2026-10-10' and ae['time'] == '20:00' and ae['emoji'] == '🎵', ae
    print('events ok')


if __name__ == '__main__':
    if '--check' in sys.argv:
        check()
    else:
        print(json.dumps(collect(datetime.now(MYT)), ensure_ascii=False, indent=1))
