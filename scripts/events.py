#!/usr/bin/env python3
"""Find events in and around KL for the next 7 days and print them as JSON (the "This week" tab).

Source: Eventbrite's public Kuala Lumpur listing pages (they embed their search results as JSON).
Run by .github/workflows/events.yml, which saves the output to events.json on the `events` branch.
`python3 scripts/events.py --check` runs the self-check instead.
"""
import json, math, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HOME = (3.205, 101.735)            # Altris Residence, Wangsa Maju
MAX_KM = 60                        # roughly an hour's drive
MYT = timezone(timedelta(hours=8))
PAGES = ['this-week', 'next-week']  # next-week fills in the days after Sunday
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36'
SKIP = re.compile(r'webinar|training course|hrd[fc]|recruitment|networking', re.I)
EMOJI = {'Music': '🎵', 'Food & Drink': '🍜', 'Performing & Visual Arts': '🎨', 'Health & Wellness': '💆', 'Sports & Fitness': '🏃',
         'Community & Culture': '🏮', 'Film, Media & Entertainment': '🎬', 'Hobbies & Special Interest': '🧶', 'Science & Technology': '🔬',
         'Business & Professional': '💼', 'Family & Education': '📚', 'Travel & Outdoor': '🌿', 'Charity & Causes': '💗',
         'Fashion & Beauty': '👗', 'Seasonal & Holiday': '🎉', 'Spirituality': '🕯️', 'Home & Lifestyle': '🏡', 'Auto, Boat & Air': '🚗'}


def km(lat, lon):
    la1, lo1, la2, lo2 = map(math.radians, (*HOME, lat, lon))
    a = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def results(html):
    """Pull the embedded search results out of an Eventbrite listing page."""
    i = html.find('__SERVER_DATA__ = ')
    if i < 0:
        raise ValueError('no __SERVER_DATA__ (page layout changed or request blocked)')
    data, _ = json.JSONDecoder().raw_decode(html, i + len('__SERVER_DATA__ = '))
    ev = data['search_data']['events']
    return ev['results'], ev['pagination'].get('page_count') or 1


def tidy(r, start, end):
    """One Eventbrite result -> our event dict, or None if it's online, cancelled, too far or outside the window."""
    if r.get('is_online_event') or r.get('is_cancelled') or not r.get('start_date'):
        return None
    if not (start <= r['start_date'] < end):
        return None
    v = r.get('primary_venue') or {}
    a = v.get('address') or {}
    try:
        dist = round(km(float(a['latitude']), float(a['longitude'])))
    except (KeyError, TypeError, ValueError):
        return None  # no map pin: can't tell if it's nearby
    if dist > MAX_KM:
        return None
    cat = next((t['display_name'] for t in r.get('tags', []) if t.get('prefix') == 'EventbriteCategory'), '')
    if cat == 'Business & Professional' or SKIP.search(r['name']):
        return None  # work trainings and webinars aren't dates
    name, summary = r['name'].strip(), (r.get('summary') or '').strip()
    if summary.lower().startswith(name.lower()[:40]):
        summary = ''  # many organisers just repeat the title
    return {
        'id': str(r['id']), 'name': name, 'emoji': EMOJI.get(cat, '🎟️'), 'cat': cat,
        'date': r['start_date'], 'time': r.get('start_time') or '', 'end_date': r.get('end_date') or '', 'end_time': r.get('end_time') or '',
        'venue': (v.get('name') or '').strip(), 'area': a.get('city') or '', 'km': dist,
        'summary': summary, 'url': r['url'],
    }


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=30) as f:
        return f.read().decode('utf-8')


def collect(now):
    start = now.strftime('%Y-%m-%d')
    end = (now + timedelta(days=7)).strftime('%Y-%m-%d')
    seen, out = set(), []
    for page in PAGES:
        n, total = 1, 1
        while n <= min(total, 5):
            rs, total = results(fetch(f'https://www.eventbrite.com/d/malaysia--kuala-lumpur/events--{page}/?page={n}'))
            for r in rs:
                e = tidy(r, start, end)
                dup = e and (e['name'].lower(), e['date'])  # the same class listed under two ticket ids
                if e and e['id'] not in seen and dup not in seen:
                    seen.update((e['id'], dup))
                    out.append(e)
            n += 1
            time.sleep(1)
    out.sort(key=lambda e: (e['date'], e['time'], e['name']))
    return {'updated': int(now.timestamp() * 1000), 'from': start, 'to': end, 'source': 'Eventbrite', 'events': out}


def check():
    page = 'x __SERVER_DATA__ = ' + json.dumps({'search_data': {'events': {'pagination': {'page_count': 2}, 'results': [
        {'id': 1, 'name': ' Jazz night ', 'start_date': '2026-10-10', 'start_time': '20:00', 'url': 'u',
         'tags': [{'prefix': 'EventbriteCategory', 'display_name': 'Music'}],
         'primary_venue': {'name': 'No Black Tie', 'address': {'latitude': '3.15', 'longitude': '101.71', 'city': 'Kuala Lumpur'}}},
        {'id': 2, 'name': 'Webinar', 'start_date': '2026-10-10', 'is_online_event': True},
        {'id': 3, 'name': 'Penang walk', 'start_date': '2026-10-10', 'primary_venue': {'address': {'latitude': '5.41', 'longitude': '100.33'}}},
        {'id': 5, 'name': 'Excel Training Course - HRDF', 'start_date': '2026-10-10', 'primary_venue': {'address': {'latitude': '3.15', 'longitude': '101.71'}}},
        {'id': 4, 'name': 'Old', 'start_date': '2026-10-01', 'primary_venue': {'address': {'latitude': '3.15', 'longitude': '101.71'}}},
    ]}}}) + ';</script>'
    rs, pages = results(page)
    got = [tidy(r, '2026-10-09', '2026-10-16') for r in rs]
    assert pages == 2
    assert got[0]['name'] == 'Jazz night' and got[0]['emoji'] == '🎵' and got[0]['km'] == 7, got[0]
    assert got[1:] == [None] * 4, got[1:]  # online, too far, work training, already over
    print('events ok')


if __name__ == '__main__':
    if '--check' in sys.argv:
        check()
    else:
        print(json.dumps(collect(datetime.now(MYT)), ensure_ascii=False, indent=1))
