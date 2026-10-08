// Curated content for the Ideas and Activities tabs. Plain data, edit freely.

export const IDEA_CATS = {
  food: '🍜 Food', outdoors: '🌿 Outdoors', home: '🛋️ At home', creative: '🎨 Creative', adventure: '⚡ Active', chill: '☁️ Slow & chill',
};
// Rough total for two people (MyKad prices where it matters). Every idea stays under RM150.
export const COST = ['Free', 'Under RM50', 'RM50–100', 'RM100–150'];
export const HOME = 'Altris Residence, Wangsa Maju';

// [emoji, title, tip, category, cost band 0-3, place (for maps) or null for at home, minutes by car from Wangsa Maju]
// All daytime. Drive times are off-peak estimates; add buffer for KL traffic.
export const DATE_IDEAS = [
  ['🍛', 'Kampung Baru breakfast hunt', 'Nasi lemak, roti and kuih from three different stalls. Vote on the best.', 'food', 1, 'Kampung Baru, Kuala Lumpur', 15],
  ['🏮', 'Petaling Street + Kwai Chai Hong', 'Old-school breakfast in Chinatown, then photos in the painted lane.', 'food', 1, 'Kwai Chai Hong, Kuala Lumpur', 20],
  ['🍌', 'Banana leaf lunch', 'Brickfields has the best ones. Eat with your hands.', 'food', 1, 'Brickfields, Kuala Lumpur', 25],
  ['☕', 'Bangsar café hop', 'Two cafés, one pastry each, ranked out of 10.', 'food', 2, 'Bangsar, Kuala Lumpur', 25],
  ['🥟', 'Dim sum brunch in Kepong', 'Each orders one thing the other has never tried.', 'food', 1, 'Kepong, Kuala Lumpur', 25],
  ['🧋', 'Bubble tea ranking in SS15', 'Try four shops on one street and crown a winner.', 'food', 1, 'SS15, Subang Jaya', 40],
  ['🍨', 'Dessert crawl in Bukit Bintang', 'Cendol, ice cream and one fancy cake. No mains allowed.', 'food', 2, 'Bukit Bintang, Kuala Lumpur', 20],
  ['🥐', 'TTDI bakery morning', 'Pick up pastries and eat them in TTDI park.', 'food', 1, 'Taman Tun Dr Ismail, Kuala Lumpur', 30],
  ['🍜', 'Pan mee and old-town walk in Kuala Kubu Bharu', 'A sleepy heritage town an hour away. Lunch, then the dam lookout.', 'food', 1, 'Kuala Kubu Bharu', 60],
  ['🍳', 'Cook-off at home', 'Same ingredients from the market, two dishes, honest judging.', 'home', 1, null, 0],
  ['🧺', 'Picnic at Titiwangsa lake', 'Bring a mat, rent a pedal boat, watch the KL Tower view.', 'outdoors', 1, 'Taman Tasik Titiwangsa', 10],
  ['🌺', 'Perdana Botanical Gardens', 'Shady paths, the orchid and hibiscus gardens, and a lake for a picnic.', 'outdoors', 0, 'Perdana Botanical Gardens', 25],
  ['🌳', 'KL Forest Eco Park canopy walk', 'Rainforest in the middle of the city. About RM10 each with MyKad. Closed Fridays.', 'outdoors', 1, 'KL Forest Eco Park', 20],
  ['🌲', 'FRIM Forest Skywalk', 'Treetop walkway in Kepong. Go early before it gets hot.', 'outdoors', 1, 'FRIM Kepong', 30],
  ['🥾', 'Bukit Tabur sunrise hike', 'Very close to Melawati. Steep and rocky, so wear grippy shoes and check the trail is open first.', 'outdoors', 0, 'Bukit Tabur West, Taman Melawati', 15],
  ['🛕', 'Batu Caves morning', 'Climb the rainbow stairs before the crowds and the heat. Free.', 'outdoors', 0, 'Batu Caves', 20],
  ['💦', 'Kanching waterfall', 'Seven tiers of waterfalls in Rawang. Bring a change of clothes.', 'outdoors', 1, 'Kanching Rainforest Waterfall', 35],
  ['🏞️', 'Sungai Gabai waterfall', 'Short walk to cool pools in Hulu Langat. Go on a weekday if you can.', 'outdoors', 0, 'Sungai Gabai Waterfall, Hulu Langat', 45],
  ['🚲', 'Putrajaya lake cycle', 'Rent bikes and ride around the lake and bridges.', 'outdoors', 1, 'Putrajaya Lake', 45],
  ['🌄', 'Bukit Gasing trail', 'Easy forest trail in PJ with a suspension bridge.', 'outdoors', 0, 'Bukit Gasing Forest Park', 30],
  ['🦜', 'KL Bird Park', 'Walk-in aviaries with free-flying birds. Feed the lorikeets.', 'outdoors', 2, 'KL Bird Park', 20],
  ['🦒', 'Zoo Negara', 'Ten minutes away in Hulu Kelang. Go at opening time while the animals are active.', 'outdoors', 2, 'Zoo Negara', 15],
  ['🏔️', 'Genting day trip by Awana SkyWay', 'Cable car up through the clouds, cool air and a hot drink at the top.', 'outdoors', 2, 'Awana SkyWay, Genting Highlands', 55],
  ['🌊', 'Janda Baik river day', 'Lunch by the river and a dip in the stream.', 'outdoors', 2, 'Janda Baik', 50],
  ['🎬', 'Movie marathon at home', 'Blanket fort, a trilogy and too many snacks.', 'home', 0, null, 0],
  ['🧩', 'Puzzle afternoon', 'A 1000-piece puzzle and a long playlist.', 'home', 1, null, 0],
  ['🎲', 'Board game day', 'Loser does the dishes.', 'home', 0, null, 0],
  ['💆', 'Spa day at home', 'Face masks, nail painting and foot rubs.', 'home', 1, null, 0],
  ['🍕', 'Pizza from scratch', 'Make the dough together, each designs a pizza.', 'home', 1, null, 0],
  ['🎤', 'Living room karaoke', 'YouTube karaoke and a hairbrush microphone.', 'home', 0, null, 0],
  ['💌', 'Time capsule letters', 'Write each other a letter to open in a year.', 'home', 0, null, 0],
  ['❓', 'The 36 questions', 'Take turns with the famous “36 questions that lead to love”.', 'home', 0, null, 0],
  ['🎨', 'Canvas painting workshop', 'Two hours, one canvas each, paint each other or the same view.', 'creative', 3, 'canvas painting workshop Kuala Lumpur', 25],
  ['🕯️', 'Candle making workshop', 'Pick scents for each other and take the candles home.', 'creative', 3, 'candle making workshop Kuala Lumpur', 25],
  ['🌱', 'Terrarium workshop', 'Build a tiny jungle in a jar, one each.', 'creative', 3, 'terrarium workshop Kuala Lumpur', 25],
  ['🛍️', 'Bundle thrift challenge', 'RM20 each to build an outfit for the other at the bundle shops.', 'creative', 1, 'bundle shop Setapak Wangsa Maju', 10],
  ['📚', 'Bookstore swap at Kinokuniya', 'Pick a book for each other and read the first page in the shop.', 'creative', 2, 'Kinokuniya KLCC', 20],
  ['📸', 'Photo walk at Merdeka Square', 'Take 10 photos of each other around Dataran Merdeka and Masjid Jamek.', 'creative', 0, 'Dataran Merdeka', 20],
  ['🖼️', 'ILHAM Gallery', 'Free contemporary art gallery. Pretend to be serious art critics.', 'creative', 0, 'ILHAM Gallery', 20],
  ['🧗', 'Bouldering session', 'Day pass plus shoe rental is about RM40 each. Cheer each other up the beginner walls.', 'adventure', 2, 'bouldering gym Kuala Lumpur', 25],
  ['⛸️', 'Ice skating at Sunway Pyramid', 'Hold hands, mostly to stay upright.', 'adventure', 2, 'Sunway Pyramid Ice', 35],
  ['🎳', 'Bowling', 'Best of three. Loser buys lunch.', 'adventure', 1, 'bowling Kuala Lumpur', 20],
  ['🕹️', 'Arcade battle', 'Best of five games at a mall arcade. Loser buys bubble tea.', 'adventure', 1, 'arcade Kuala Lumpur', 15],
  ['🔐', 'Escape room', 'Find out how well you work together under pressure.', 'adventure', 3, 'escape room Kuala Lumpur', 25],
  ['🏸', 'Badminton', 'Book a court for an hour. Trash talk encouraged.', 'adventure', 1, 'badminton court Wangsa Maju', 10],
  ['🚇', 'Random LRT stop', 'Ride from Wangsa Maju station and get off somewhere neither of you has been.', 'adventure', 1, 'Wangsa Maju LRT station', 5],
  ['🔬', 'Petrosains', 'Interactive science museum in KLCC. Surprisingly fun for adults.', 'chill', 1, 'Petrosains KLCC', 20],
  ['🏙️', 'KLCC Park stroll', 'Walk the park under the towers, then cool down in the mall.', 'chill', 0, 'KLCC Park', 20],
  ['🛕', 'Thean Hou Temple', 'Red lanterns and city views from the hill. Free to visit.', 'chill', 0, 'Thean Hou Temple', 25],
  ['🏛️', 'National Museum', 'Cheap entry with MyKad and a quiet afternoon of history.', 'chill', 1, 'Muzium Negara', 25],
  ['📖', 'REXKL afternoon', 'An old cinema turned bookshop and creative space. Free to wander.', 'chill', 0, 'REXKL', 20],
  ['🍵', 'Tea house afternoon', 'Share a pot of Chinese tea and snacks in Chinatown.', 'chill', 1, 'tea house Petaling Street', 20],
  ['🎞️', 'Matinee movie', 'Cheaper daytime tickets and an empty cinema.', 'chill', 1, 'cinema Wangsa Walk Mall', 5],
  ['👣', 'Foot reflexology', 'An hour of foot massage side by side.', 'chill', 3, 'foot reflexology Kuala Lumpur', 15],
  ['🧘', 'Yoga in the park', 'Follow a beginner video on the grass, then brunch.', 'chill', 0, 'Taman Tasik Titiwangsa', 10],
  ['🎶', 'Shared playlist afternoon', 'Take turns adding songs that remind you of each other.', 'home', 0, null, 0],
];

const g = q => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

// Things to do together, in person or from two different places.
export const ACTIVITY_GROUPS = [
  { id: 'watch', title: '🍿 Watch together', blurb: 'Like Scener: press play at the same moment, even from two different homes. Free, but you each need the streaming service.', items: [
    { e: '🎉', name: 'Teleparty', url: 'https://www.teleparty.com', what: 'Browser extension that syncs Netflix, Disney+, Prime Video, YouTube and more, with a chat on the side.', cost: 'Free (premium adds video chat)', on: 'Chrome, Edge, Safari' },
    { e: '🎬', name: 'Scener', url: 'https://www.scener.com', what: 'A virtual movie theatre. Watch your streaming services in sync with video chat.', cost: 'Free', on: 'Desktop browser' },
    { e: '📱', name: 'Rave', url: 'https://rave.io', what: 'Phone app for watching YouTube, Netflix and more in sync, with voice chat.', cost: 'Free', on: 'iPhone, Android' },
    { e: '🔗', name: 'Watch2Gether', url: 'https://w2g.tv', what: 'Make a room, paste YouTube or Twitch links. No account needed.', cost: 'Free', on: 'Any browser' },
    { e: '🍎', name: 'SharePlay', url: g('SharePlay FaceTime watch together'), what: 'Built into FaceTime. Start a call, then play a show and it syncs for both of you.', cost: 'Free', on: 'iPhone, iPad, Mac' },
    { e: '🎧', name: 'Discord Watch Together', url: 'https://discord.com', what: 'Start a voice call and launch the YouTube Watch Together activity.', cost: 'Free', on: 'Desktop, phone' },
  ] },
  { id: 'browser', title: '🎮 Play in the browser', blurb: 'Free, nothing to install. Open the link while you’re on a call.', items: [
    { e: '✏️', name: 'skribbl.io', url: 'https://skribbl.io', what: 'Draw and guess. Make a private room for just the two of you.', cost: 'Free', on: 'Any browser' },
    { e: '☎️', name: 'Gartic Phone', url: 'https://garticphone.com', what: 'The telephone game with drawings. Even funnier with friends.', cost: 'Free', on: 'Any browser' },
    { e: '🖌️', name: 'PaintYourDate', url: 'https://paintyourdate.io', what: 'Draw together on a shared canvas, made for couples.', cost: 'Free', on: 'Any browser' },
    { e: '🃏', name: 'Board Game Arena', url: 'https://boardgamearena.com', what: 'Hundreds of real board games. Lost Cities and Patchwork are great for two.', cost: 'Free (premium optional)', on: 'Any browser' },
    { e: '🌍', name: 'GeoGuessr', url: 'https://www.geoguessr.com', what: 'Dropped somewhere on Street View. Guess where you are, together or as a duel.', cost: 'Free tier, subscription', on: 'Browser, phone' },
    { e: '♟️', name: 'Lichess', url: 'https://lichess.org', what: 'Free chess with no ads. Send a challenge link and play during a call.', cost: 'Free', on: 'Browser, phone' },
    { e: '🧩', name: 'Jigsaw Puzzles', url: 'https://jigsawpuzzles.io', what: 'Do a jigsaw puzzle together in real time.', cost: 'Free', on: 'Any browser' },
    { e: '📻', name: 'Radio Garden', url: 'https://radio.garden', what: 'Spin a globe and listen to live radio anywhere. Pick a city to “visit” together.', cost: 'Free', on: 'Browser, phone' },
    { e: '🪟', name: 'WindowSwap', url: 'https://www.window-swap.com', what: 'Look out of a stranger’s window somewhere in the world. Weirdly calming.', cost: 'Free', on: 'Any browser' },
  ] },
  { id: 'games', title: '🕹️ Games for two', blurb: 'Proper co-op games, chosen so the two of you spend under RM150 in total.', items: [
    { e: '🪵', name: 'It Takes Two', url: 'https://www.ea.com/games/it-takes-two', what: 'A co-op adventure made for couples. With the Friend’s Pass, one copy covers both of you online.', cost: 'One copy for two; often on sale under RM150', on: 'PC, PlayStation, Xbox, Switch' },
    { e: '🌾', name: 'Stardew Valley', url: 'https://www.stardewvalley.net', what: 'Run a cosy farm together at your own pace.', cost: 'Paid, one copy each, cheap', on: 'PC, consoles, phone' },
    { e: '☁️', name: 'Sky: Children of the Light', url: 'https://www.thatskygame.com', what: 'Fly through a beautiful world together and hold hands.', cost: 'Free', on: 'Phone, Switch, PlayStation, PC' },
    { e: '👩‍🍳', name: 'Overcooked! 2', url: g('Overcooked 2'), what: 'Chaotic co-op cooking. Couch co-op on one copy.', cost: 'One copy for couch co-op', on: 'PC, consoles' },
    { e: '🧶', name: 'Unravel Two', url: g('Unravel Two game'), what: 'A gentle platformer about two yarn characters tied together. Couch co-op on one copy.', cost: 'One copy for couch co-op', on: 'PC, consoles' },
    { e: '💣', name: 'Keep Talking and Nobody Explodes', url: 'https://keeptalkinggame.com', what: 'One defuses a bomb, the other reads the manual. Only one of you buys it; the manual is free online.', cost: 'One copy for two', on: 'PC, consoles, phone' },
  ] },
  { id: 'talk', title: '💬 Talk & get closer', blurb: 'For slower nights and long-distance days.', items: [
    { e: '💞', name: 'Paired', url: 'https://www.paired.com', what: 'A daily question and quizzes for couples. You see each other’s answers.', cost: 'Free daily question, subscription', on: 'iPhone, Android' },
    { e: '🌱', name: 'Agapé', url: g('Agape couples app'), what: 'One question a day. Answers unlock once you’ve both replied.', cost: 'Free, premium optional', on: 'iPhone, Android' },
    { e: '❓', name: '36 Questions That Lead to Love', url: g('36 questions that lead to love'), what: 'The famous list from the psychology study. Take turns, no skipping.', cost: 'Free', on: 'Anywhere' },
    { e: '🎶', name: 'Spotify Jam', url: g('Spotify Jam listen together'), what: 'One shared queue you both add songs to, played in sync.', cost: 'Premium needed to start one', on: 'Phone, desktop' },
  ] },
];
