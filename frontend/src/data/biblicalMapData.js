// Comprehensive biblical geographic data for the interactive Scripture map.
// All coordinates are [latitude, longitude] (Leaflet convention).

export const TIME_PERIODS = [
  {
    id: 'patriarchal',
    label: 'Patriarchal Age',
    range: 'c. 2000–1700 BC',
    description: 'Abraham, Isaac, and Jacob journey as semi-nomads through Mesopotamia, Canaan, and Egypt under divine promise.',
    center: [32, 38],
    zoom: 5,
  },
  {
    id: 'egypt',
    label: 'Egyptian Sojourn',
    range: 'c. 1700–1280 BC',
    description: 'Israel multiplies in Egypt. The Egyptian New Kingdom reaches its territorial peak into Canaan.',
    center: [30, 34],
    zoom: 5,
  },
  {
    id: 'exodus',
    label: 'Exodus & Conquest',
    range: 'c. 1280–1200 BC',
    description: 'Moses leads the Exodus from Egypt. Forty years in the wilderness. Joshua leads Israel into Canaan.',
    center: [30, 34.5],
    zoom: 6,
  },
  {
    id: 'judges',
    label: 'Period of Judges',
    range: 'c. 1200–1050 BC',
    description: 'Israel settles Canaan amid Philistine pressure and internal cycles of faithfulness and apostasy.',
    center: [32, 35.3],
    zoom: 7,
  },
  {
    id: 'united',
    label: 'United Kingdom',
    range: 'c. 1050–931 BC',
    description: 'Saul, David, and Solomon unite Israel. Jerusalem becomes the capital and the Temple is built.',
    center: [32, 35.4],
    zoom: 7,
  },
  {
    id: 'divided',
    label: 'Divided Kingdom',
    range: 'c. 931–722 BC',
    description: 'The kingdom splits: Israel (north) and Judah (south). Elijah and Elisha prophesy; Aram rises.',
    center: [32.5, 35.6],
    zoom: 7,
  },
  {
    id: 'assyrian',
    label: 'Assyrian Dominance',
    range: '722–605 BC',
    description: 'Assyria destroys the northern kingdom (722 BC). Hezekiah\'s Jerusalem survives. Jonah preaches to Nineveh.',
    center: [35, 40],
    zoom: 5,
  },
  {
    id: 'exile',
    label: 'Babylonian Exile',
    range: '605–539 BC',
    description: 'Nebuchadnezzar destroys Jerusalem (586 BC) and carries Israel to Babylon. Daniel and Ezekiel prophesy.',
    center: [33, 40],
    zoom: 5,
  },
  {
    id: 'persian',
    label: 'Persian & Return',
    range: '539–333 BC',
    description: 'Cyrus the Great allows the return. Ezra restores the Law; Nehemiah rebuilds Jerusalem\'s walls.',
    center: [34, 44],
    zoom: 5,
  },
  {
    id: 'nt',
    label: 'New Testament Era',
    range: '4 BC – AD 100',
    description: 'The ministry of Jesus, Pentecost, and the spread of the gospel through the Roman Empire via Paul\'s journeys.',
    center: [37, 26],
    zoom: 5,
  },
];

// Empire / political boundary overlays per era.
// polygon: array of [lat, lng] pairs forming the approximate boundary.
export const EMPIRES = [
  {
    id: 'mesopotamia-patriarchal',
    label: 'Mesopotamian City-States',
    periods: ['patriarchal'],
    color: '#B45309',
    polygon: [
      [38, 38], [38, 46], [36, 48], [34, 48], [31, 47], [29, 48.5],
      [29, 44], [31, 41], [33, 39], [35, 37], [37, 36], [38, 38],
    ],
  },
  {
    id: 'egypt-middle',
    label: 'Egyptian Middle Kingdom',
    periods: ['patriarchal'],
    color: '#D97706',
    polygon: [
      [31.5, 29.5], [31.5, 32], [29, 33], [27, 34], [23.5, 37.5],
      [22, 37], [22, 32], [24, 31], [26, 29.5], [29, 27.5], [31.5, 29.5],
    ],
  },
  {
    id: 'egypt-new-kingdom',
    label: 'Egyptian New Kingdom',
    periods: ['egypt', 'exodus'],
    color: '#D97706',
    polygon: [
      [31.5, 29.5], [31.5, 32.5], [30.5, 34.5], [33.5, 35],
      [34.3, 36.5], [33, 36], [31.5, 36], [30, 35.5], [29, 35],
      [27, 34], [23.5, 37.5], [22, 37.5], [22, 32], [24, 31],
      [26, 29.5], [29, 27.5], [31.5, 29.5],
    ],
  },
  {
    id: 'canaan-city-states',
    label: 'Canaanite City-States',
    periods: ['judges'],
    color: '#65A30D',
    polygon: [
      [33.9, 35.8], [33.5, 35.3], [32.8, 35.0], [32.0, 34.8],
      [31.5, 34.5], [30.5, 34.5], [30.0, 35.2], [30.5, 35.7],
      [31.5, 36.2], [32.2, 36.0], [33.3, 36.5], [33.9, 35.8],
    ],
  },
  {
    id: 'philistia',
    label: 'Philistia',
    periods: ['judges', 'united', 'divided'],
    color: '#B45309',
    polygon: [
      [32.1, 34.7], [31.5, 34.4], [31.2, 34.5], [31.0, 34.6],
      [31.2, 34.9], [31.7, 35.0], [32.1, 34.7],
    ],
  },
  {
    id: 'israel-united',
    label: 'Kingdom of Israel',
    periods: ['united'],
    color: '#16A34A',
    polygon: [
      [33.9, 35.7], [33.5, 35.3], [33.3, 36.5], [32.2, 36.1],
      [31.5, 36.3], [30.5, 35.7], [30.0, 35.2], [29.7, 35.0],
      [30.2, 34.5], [31.5, 34.4], [32.1, 34.7], [32.8, 35.0],
      [33.2, 35.2], [33.5, 35.4], [33.9, 35.7],
    ],
  },
  {
    id: 'israel-north',
    label: 'Kingdom of Israel (North)',
    periods: ['divided', 'assyrian'],
    color: '#2563EB',
    polygon: [
      [33.9, 35.7], [33.5, 35.3], [33.3, 36.5], [32.2, 36.1],
      [31.8, 36.0], [31.8, 35.6], [32.0, 35.3], [32.2, 35.0],
      [32.5, 34.9], [33.2, 35.2], [33.9, 35.7],
    ],
  },
  {
    id: 'judah',
    label: 'Kingdom of Judah',
    periods: ['divided', 'assyrian'],
    color: '#16A34A',
    polygon: [
      [31.8, 35.6], [31.8, 36.0], [31.5, 36.3], [30.5, 35.7],
      [30.0, 35.2], [29.7, 35.0], [30.2, 34.5], [31.5, 34.4],
      [32.1, 34.7], [32.2, 35.0], [32.0, 35.3], [31.8, 35.6],
    ],
  },
  {
    id: 'aram-damascus',
    label: 'Aram-Damascus',
    periods: ['divided'],
    color: '#9333EA',
    polygon: [
      [34.5, 36.5], [34.0, 37.5], [33.0, 37.8], [32.5, 37.0],
      [32.5, 36.5], [33.3, 36.0], [33.5, 35.5], [34.5, 36.5],
    ],
  },
  {
    id: 'assyrian-empire',
    label: 'Assyrian Empire',
    periods: ['assyrian'],
    color: '#DC2626',
    polygon: [
      [37, 36], [37, 43], [36, 45], [34, 48], [32, 48.5],
      [30, 49], [27, 43], [27, 39], [29, 34.5], [31, 34.5],
      [31, 31.5], [28, 30], [25, 32], [23, 35], [25, 38],
      [29, 35.5], [33, 36], [34, 37], [37, 36],
    ],
  },
  {
    id: 'neo-babylonian',
    label: 'Neo-Babylonian Empire',
    periods: ['exile'],
    color: '#1D4ED8',
    polygon: [
      [37, 36], [37, 43], [36, 44], [34, 47], [31, 48.5],
      [29, 49], [27, 43], [27, 38], [29, 34.5], [31, 34.5],
      [33.5, 35], [35, 36.5], [37, 36],
    ],
  },
  {
    id: 'persian-empire',
    label: 'Persian / Achaemenid Empire',
    periods: ['persian'],
    color: '#7C3AED',
    polygon: [
      [42, 27], [40, 28], [37, 26.5], [36, 28], [34, 33],
      [33.5, 35], [31, 34.5], [31, 31], [28, 30], [24, 32],
      [22, 37], [22, 44], [25, 53], [28, 58], [32, 62],
      [36, 62], [40, 59], [42, 53], [43, 50], [43, 43],
      [42, 37], [42, 32], [41, 28], [42, 27],
    ],
  },
  {
    id: 'roman-empire-east',
    label: 'Roman Empire',
    periods: ['nt'],
    color: '#B91C1C',
    polygon: [
      [45, 25], [43, 40], [41, 43], [37, 40], [36.5, 38],
      [33.5, 36], [31, 34.5], [30, 31.5], [28, 30], [24, 31.5],
      [24, 10], [33, 9], [37, -5], [44, -10], [54, -3],
      [55, 22], [48, 28], [45, 25],
    ],
  },
  {
    id: 'parthian-empire',
    label: 'Parthian Empire',
    periods: ['nt'],
    color: '#B45309',
    polygon: [
      [37, 40], [40, 43], [40, 55], [36, 62], [30, 62],
      [25, 55], [24, 50], [26, 45], [29, 48], [32, 48],
      [34, 46], [37, 44], [38, 42], [37, 40],
    ],
  },
];

// Journey routes through history.
// waypoints: [lat, lng, label, note]
export const JOURNEYS = [
  {
    id: 'abraham',
    title: "Abraham's Journey",
    person: 'Abraham',
    period: 'patriarchal',
    color: '#E8A441',
    reference: 'Genesis 11–22',
    summary: 'God calls Abraham from Ur of the Chaldeans, promising him land, descendants, and blessing to all nations. His journey takes him through Haran, Canaan, and Egypt before returning to the Promised Land.',
    waypoints: [
      { pos: [30.96, 46.11], label: 'Ur of the Chaldeans', note: 'Abraham\'s birthplace. God calls him: "Leave your country…" (Gen 12:1)' },
      { pos: [36.86, 39.02], label: 'Haran', note: 'Terah\'s family settles here. Abraham departs for Canaan after his father dies (Gen 11:31–12:4)' },
      { pos: [36.14, 37.16], label: 'Northern Syria', note: 'Entering the Promised Land region' },
      { pos: [32.22, 35.27], label: 'Shechem', note: 'First stop in Canaan. God appears: "To your offspring I will give this land" (Gen 12:7)' },
      { pos: [31.93, 35.22], label: 'Bethel', note: 'Abraham pitches his tent between Bethel and Ai; builds an altar (Gen 12:8)' },
      { pos: [31.25, 34.79], label: 'Beersheba / Negev', note: 'Travels south through the Negev (Gen 12:9)' },
      { pos: [30.04, 31.23], label: 'Egypt', note: 'Flees to Egypt during famine; Pharaoh takes Sarai; they are sent away with great wealth (Gen 12:10–20)' },
      { pos: [31.93, 35.22], label: 'Bethel', note: 'Returns to Canaan; separates from Lot (Gen 13:1–12)' },
      { pos: [31.53, 35.10], label: 'Hebron / Mamre', note: 'Abraham settles at the oaks of Mamre; builds an altar (Gen 13:18)' },
      { pos: [31.78, 35.23], label: 'Moriah / Jerusalem', note: 'God tests Abraham: "Take your son Isaac to Mount Moriah…" — the binding of Isaac (Gen 22)' },
    ],
  },
  {
    id: 'jacob-haran',
    title: "Jacob's Journey to Haran",
    person: 'Jacob',
    period: 'patriarchal',
    color: '#EAB308',
    reference: 'Genesis 27–35',
    summary: 'Jacob flees Esau\'s wrath to Haran, where he serves Laban, marries Leah and Rachel, and fathers twelve sons. He returns to Canaan after twenty years, wrestles with God at Penuel, and reconciles with Esau.',
    waypoints: [
      { pos: [31.25, 34.79], label: 'Beersheba', note: 'Jacob departs after Isaac blesses him (Gen 28:10)' },
      { pos: [31.93, 35.22], label: 'Bethel', note: 'Jacob sleeps; dreams of a ladder to heaven. God renews the Abrahamic covenant (Gen 28:12–17)' },
      { pos: [36.86, 39.02], label: 'Haran', note: 'Jacob arrives; meets Rachel at the well; serves Laban 14 years for his two daughters (Gen 29)' },
      { pos: [32.09, 35.60], label: 'Penuel', note: 'Jacob wrestles with God all night; his name is changed to Israel (Gen 32:24–30)' },
      { pos: [32.22, 35.27], label: 'Shechem', note: 'Jacob purchases land and settles; Dinah incident (Gen 33:18–34:31)' },
      { pos: [31.93, 35.22], label: 'Bethel', note: 'God again appears and confirms the name Israel (Gen 35:9–15)' },
      { pos: [31.53, 35.10], label: 'Hebron', note: 'Returns to his father Isaac (Gen 35:27)' },
    ],
  },
  {
    id: 'joseph-egypt',
    title: 'Joseph Sold into Egypt',
    person: 'Joseph',
    period: 'patriarchal',
    color: '#A78BFA',
    reference: 'Genesis 37–50',
    summary: 'Joseph is sold by his brothers to Ishmaelite traders who take him to Egypt. He rises to become Pharaoh\'s prime minister, and his family eventually joins him in the land of Goshen.',
    waypoints: [
      { pos: [31.53, 35.10], label: 'Hebron', note: 'Jacob sends Joseph to check on his brothers (Gen 37:14)' },
      { pos: [32.40, 35.20], label: 'Dothan', note: 'Brothers throw Joseph in a cistern and sell him for 20 pieces of silver (Gen 37:17–28)' },
      { pos: [31.20, 35.50], label: 'Jordan / Trade Route', note: 'Ishmaelite caravan carries Joseph south to Egypt' },
      { pos: [30.60, 32.30], label: 'Sinai Road', note: 'Ancient Way of Horus (coastal trade route to Egypt)' },
      { pos: [30.04, 31.23], label: 'Egypt / Potiphar\'s House', note: 'Joseph serves Potiphar; is falsely imprisoned; interprets dreams (Gen 39–41)' },
      { pos: [29.84, 31.25], label: 'Memphis', note: 'Joseph becomes Vizier of Egypt; oversees grain storage (Gen 41:41–49)' },
      { pos: [30.79, 31.82], label: 'Goshen', note: 'Jacob and all seventy of his descendants settle in the fertile land of Goshen (Gen 47:1–12)' },
    ],
  },
  {
    id: 'exodus-route',
    title: 'The Exodus & Wilderness',
    person: 'Moses & Israel',
    period: 'exodus',
    color: '#F97316',
    reference: 'Exodus 12 – Deuteronomy 34',
    summary: 'After the ten plagues, Pharaoh releases Israel. Moses leads two million people through the Red Sea, across the Sinai wilderness, to the edge of the Promised Land. Forty years of wandering follow the faithless report of the spies.',
    waypoints: [
      { pos: [30.79, 31.82], label: 'Rameses / Goshen', note: 'Israel departs on the night of Passover; 600,000 men on foot (Exod 12:37)' },
      { pos: [30.60, 32.30], label: 'Succoth / Etham', note: 'First campsites; the LORD goes before them in a pillar of cloud and fire (Exod 13:20–22)' },
      { pos: [30.00, 32.60], label: 'Red Sea Crossing', note: 'Israel crosses on dry ground; Pharaoh\'s army is drowned (Exod 14)' },
      { pos: [28.70, 33.60], label: 'Marah & Elim', note: 'Bitter water made sweet; twelve springs of water, seventy palm trees (Exod 15:22–27)' },
      { pos: [28.54, 33.98], label: 'Mt. Sinai / Horeb', note: 'God gives the Ten Commandments and the Law. The covenant is established (Exod 19–24). Forty years for the tabernacle to be built (Exod 25–40)' },
      { pos: [30.62, 34.36], label: 'Kadesh Barnea', note: 'Spies return with a fearful report; Israel condemned to forty years of wandering (Num 13–14)' },
      { pos: [29.55, 35.00], label: 'Ezion-Geber', note: 'Israel camps near the Gulf of Aqaba and circles Edom (Num 33:35)' },
      { pos: [31.60, 35.80], label: 'Plains of Moab', note: 'Moses gives his final addresses; the book of Deuteronomy. Moses dies on Mt. Nebo (Deut 34)' },
    ],
  },
  {
    id: 'ruth',
    title: "Ruth's Journey",
    person: 'Ruth',
    period: 'judges',
    color: '#EC4899',
    reference: 'Ruth 1–4',
    summary: 'After the death of her husband and father-in-law, the Moabite widow Ruth chooses to stay with Naomi and follow her God back to Bethlehem, where she meets Boaz and becomes an ancestor of David.',
    waypoints: [
      { pos: [31.60, 35.80], label: 'Moab', note: 'Naomi\'s family had lived here for ten years. Husbands die; Naomi decides to return to Judah (Ruth 1:1–6)' },
      { pos: [31.53, 35.10], label: 'Bethlehem Road', note: '"Where you go I will go… your God will be my God." Ruth\'s famous pledge (Ruth 1:16)' },
      { pos: [31.70, 35.20], label: 'Bethlehem', note: 'Ruth gleans in the fields of Boaz; he redeems her as kinsman-redeemer. She becomes great-grandmother of David (Ruth 4)' },
    ],
  },
  {
    id: 'elijah',
    title: "Elijah's Journey",
    person: 'Elijah',
    period: 'divided',
    color: '#3B82F6',
    reference: '1 Kings 17–19; 2 Kings 1–2',
    summary: 'Elijah confronts the prophets of Baal on Mt. Carmel, calling down fire from heaven. Fleeing Jezebel\'s wrath, he journeys to the wilderness and then to Horeb (Mt. Sinai) where God speaks in a still small voice. He is later taken to heaven in a whirlwind.',
    waypoints: [
      { pos: [32.75, 35.05], label: 'Mt. Carmel', note: 'Elijah challenges 450 prophets of Baal; fire falls from heaven; the false prophets are slain (1 Kgs 18:19–40)' },
      { pos: [32.70, 35.30], label: 'Jezreel', note: 'Jezebel threatens Elijah\'s life; he flees (1 Kgs 19:1–3)' },
      { pos: [31.25, 34.79], label: 'Beersheba', note: 'Elijah collapses under a broom tree: "I have had enough, LORD." An angel feeds him (1 Kgs 19:4–7)' },
      { pos: [28.54, 33.98], label: 'Mt. Horeb / Sinai', note: 'God speaks to Elijah — not in wind, earthquake, or fire, but in a still small voice. Commanded to anoint Elisha (1 Kgs 19:8–18)' },
      { pos: [33.51, 36.28], label: 'Damascus', note: 'Directed to anoint Hazael king of Aram (1 Kgs 19:15)' },
      { pos: [32.00, 35.55], label: 'Jordan / Abel Meholah', note: 'Elisha plowing; Elijah throws his cloak on him — the call of Elisha (1 Kgs 19:19–21)' },
      { pos: [32.20, 35.52], label: 'Jericho Plains / Jordan', note: 'Elijah strikes the Jordan; both cross. A chariot of fire takes Elijah to heaven in a whirlwind (2 Kgs 2:1–12)' },
    ],
  },
  {
    id: 'jonah',
    title: "Jonah's Journey",
    person: 'Jonah',
    period: 'assyrian',
    color: '#6366F1',
    reference: 'Jonah 1–4',
    summary: 'Called to preach to Nineveh, Jonah flees by ship toward Tarshish. After three days in a great fish, he is cast onto shore and goes to Nineveh, whose people repent.',
    waypoints: [
      { pos: [32.05, 34.75], label: 'Joppa', note: 'Jonah buys passage on a ship to Tarshish — the opposite direction from Nineveh (Jon 1:3)' },
      { pos: [35.0, 26.0], label: 'Mediterranean Sea', note: 'A great storm; Jonah confesses he is fleeing from God; is thrown overboard (Jon 1:4–15)' },
      { pos: [33.0, 28.5], label: 'Great Fish', note: 'Swallowed by a great fish; inside three days and three nights; prays and is vomited onto dry land (Jon 1:17–2:10)' },
      { pos: [36.36, 43.15], label: 'Nineveh', note: '"Forty days and Nineveh will be overthrown." The whole city repents, from the king to the cattle (Jon 3)' },
    ],
  },
  {
    id: 'exile-babylon',
    title: 'The Babylonian Exile',
    person: 'Judah',
    period: 'exile',
    color: '#64748B',
    reference: '2 Kings 24–25; Jeremiah; Daniel',
    summary: 'Three deportations carry Judah to Babylon: 605 BC (Daniel), 597 BC (Ezekiel and king Jehoiachin), and 586 BC (the destruction of Jerusalem and the Temple). The exile lasts 70 years.',
    waypoints: [
      { pos: [31.78, 35.23], label: 'Jerusalem', note: 'Nebuchadnezzar besieges Jerusalem; Temple destroyed 586 BC. Gedaliah appointed governor (2 Kgs 25)' },
      { pos: [31.87, 35.44], label: 'Jericho', note: 'King Zedekiah flees but is captured on the plains near Jericho (2 Kgs 25:5)' },
      { pos: [33.51, 36.28], label: 'Damascus', note: 'Northern route through Syria toward Mesopotamia' },
      { pos: [36.50, 40.50], label: 'Upper Euphrates', note: 'Across the Euphrates into Babylonia' },
      { pos: [32.54, 44.42], label: 'Babylon', note: 'Exiles settle by the rivers of Babylon. Daniel, Shadrach, Meshach, and Abednego serve in the royal court (Dan 1)' },
      { pos: [32.19, 48.26], label: 'Susa', note: 'Persian capital; later the setting of the book of Esther' },
    ],
  },
  {
    id: 'return-exile',
    title: 'Return from Exile',
    person: 'Zerubbabel / Ezra / Nehemiah',
    period: 'persian',
    color: '#10B981',
    reference: 'Ezra; Nehemiah; Haggai; Zechariah',
    summary: 'Cyrus the Great issues a decree allowing Jews to return. Three waves of return: Zerubbabel (538 BC) rebuilds the Temple; Ezra (458 BC) restores the Law; Nehemiah (445 BC) rebuilds Jerusalem\'s walls.',
    waypoints: [
      { pos: [32.54, 44.42], label: 'Babylon', note: 'Cyrus decrees: "Let him go up to Jerusalem in Judah and build the temple of the LORD" (Ezra 1:3)' },
      { pos: [33.51, 36.28], label: 'Damascus', note: 'The return journey follows the Fertile Crescent north then southwest' },
      { pos: [36.86, 39.02], label: 'Haran', note: 'Crossing through northern Mesopotamia' },
      { pos: [36.20, 36.16], label: 'Antioch Region', note: 'Traveling south through Syria' },
      { pos: [31.78, 35.23], label: 'Jerusalem', note: 'Temple rebuilt 516 BC. Ezra reads the Law to all the people (Neh 8). Nehemiah rebuilds the walls in 52 days (Neh 6:15)' },
    ],
  },
  {
    id: 'jesus-ministry',
    title: "Jesus's Ministry",
    person: 'Jesus',
    period: 'nt',
    color: '#F5F4F1',
    reference: 'Matthew; Mark; Luke; John',
    summary: 'Jesus is born in Bethlehem, raised in Nazareth. His ministry begins at his baptism in the Jordan. He teaches and heals throughout Galilee, Samaria, and Judea, culminating in the Triumphal Entry, crucifixion, and resurrection in Jerusalem.',
    waypoints: [
      { pos: [31.70, 35.20], label: 'Bethlehem', note: 'Jesus is born in a manger; visited by shepherds and Magi (Matt 2; Luke 2)' },
      { pos: [31.20, 29.92], label: 'Egypt', note: 'Holy Family flees Herod\'s massacre of infants; returns after Herod\'s death (Matt 2:13–23)' },
      { pos: [32.70, 35.30], label: 'Nazareth', note: 'Jesus grows up here; "Can anything good come from Nazareth?" (John 1:46); later rejected by his hometown (Luke 4:16–30)' },
      { pos: [31.83, 35.55], label: 'Jordan River (Baptism)', note: 'John baptizes Jesus; Spirit descends as a dove; "This is my beloved Son" (Matt 3:13–17)' },
      { pos: [31.50, 35.30], label: 'Judean Wilderness', note: 'Forty days of fasting; Satan\'s three temptations (Matt 4:1–11)' },
      { pos: [32.75, 35.34], label: 'Cana', note: 'Water turned to wine — first sign (John 2:1–11)' },
      { pos: [32.88, 35.58], label: 'Capernaum', note: 'Home base of Jesus\'s ministry; heals the paralytic, calls Matthew, delivers many (Mark 2–5)' },
      { pos: [32.86, 35.63], label: 'Sea of Galilee', note: 'Walks on water; calms the storm; feeds 5,000 on the hillside (Matt 14)' },
      { pos: [32.27, 35.20], label: 'Samaria / Sychar', note: 'Woman at the well: "I who speak to you am he" (John 4)' },
      { pos: [33.25, 35.69], label: 'Caesarea Philippi', note: 'Peter confesses: "You are the Christ" (Matt 16:16). Transfiguration on nearby mountain' },
      { pos: [31.87, 35.44], label: 'Jericho', note: 'Zacchaeus; blind Bartimaeus healed (Luke 18–19)' },
      { pos: [31.77, 35.26], label: 'Bethany / Lazarus', note: 'Lazarus raised from the dead (John 11). Mary anoints Jesus (John 12)' },
      { pos: [31.78, 35.23], label: 'Jerusalem', note: 'Triumphal Entry; Temple cleansing; Last Supper; Gethsemane; Trial; Crucifixion; Resurrection; Ascension (Matt 21–28)' },
    ],
  },
  {
    id: 'paul-journey-1',
    title: "Paul's 1st Missionary Journey",
    person: 'Paul & Barnabas',
    period: 'nt',
    color: '#3F7168',
    reference: 'Acts 13–14',
    summary: 'Paul and Barnabas are commissioned by the church at Antioch. They sail to Cyprus, travel through Asia Minor preaching in synagogues and founding churches, and return to report to Antioch. Duration: ~AD 46–48.',
    waypoints: [
      { pos: [36.20, 36.16], label: 'Antioch (Syria)', note: 'Commissioned by the Holy Spirit: "Set apart for me Barnabas and Saul for the work" (Acts 13:2)' },
      { pos: [36.11, 35.93], label: 'Seleucia', note: 'Port of Antioch; they sail to Cyprus (Acts 13:4)' },
      { pos: [35.18, 33.90], label: 'Salamis, Cyprus', note: 'Proclaim the word in Jewish synagogues (Acts 13:5)' },
      { pos: [34.77, 32.42], label: 'Paphos, Cyprus', note: 'Elymas the sorcerer struck blind; proconsul Sergius Paulus believes (Acts 13:6–12)' },
      { pos: [36.96, 30.85], label: 'Perga, Pamphylia', note: 'John Mark departs for Jerusalem (Acts 13:13)' },
      { pos: [38.28, 31.00], label: 'Antioch of Pisidia', note: 'Paul\'s synagogue sermon; Jews stir up opposition; "We turn to the Gentiles" (Acts 13:14–52)' },
      { pos: [37.87, 32.48], label: 'Iconium', note: 'Jews and Gentiles believe; plot to stone Paul and Barnabas (Acts 14:1–7)' },
      { pos: [37.57, 32.30], label: 'Lystra', note: 'Paul heals a lame man; crowds call them Zeus and Hermes; Jews stone Paul (Acts 14:8–20)' },
      { pos: [37.36, 33.51], label: 'Derbe', note: 'Make many disciples; then begin the return journey (Acts 14:20–21)' },
      { pos: [36.96, 30.85], label: 'Perga', note: 'Preach the word; sail from Attalia (Acts 14:24–25)' },
      { pos: [36.20, 36.16], label: 'Antioch (Syria)', note: 'Report to the church: "God had opened a door of faith to the Gentiles" (Acts 14:27)' },
    ],
  },
  {
    id: 'paul-journey-2',
    title: "Paul's 2nd Missionary Journey",
    person: 'Paul, Silas & Timothy',
    period: 'nt',
    color: '#0EA5E9',
    reference: 'Acts 15:36–18:22',
    summary: 'Paul parts from Barnabas and takes Silas. A vision calls them to Macedonia — the gospel enters Europe for the first time. Paul preaches at Philippi, Thessalonica, Athens, and Corinth. Duration: ~AD 49–52.',
    waypoints: [
      { pos: [36.20, 36.16], label: 'Antioch (Syria)', note: 'Paul and Silas depart to revisit the churches (Acts 15:36–40)' },
      { pos: [37.87, 32.48], label: 'Iconium / Lystra', note: 'Timothy joins the team (Acts 16:1–3)' },
      { pos: [39.78, 26.12], label: 'Troas', note: 'A man from Macedonia appears in a vision: "Come over and help us!" (Acts 16:9)' },
      { pos: [41.01, 24.28], label: 'Philippi', note: 'Lydia converted; Paul and Silas imprisoned and miraculously freed; jailer baptized (Acts 16:12–40)' },
      { pos: [40.64, 22.94], label: 'Thessalonica', note: 'Three Sabbaths in the synagogue; "These men have turned the world upside down" (Acts 17:1–9)' },
      { pos: [40.52, 22.20], label: 'Berea', note: 'The Bereans "received the message with great eagerness and examined the Scriptures daily" (Acts 17:10–12)' },
      { pos: [37.98, 23.73], label: 'Athens', note: 'Paul on Mars Hill: "Men of Athens, I see you are very religious…" Sermon on the Unknown God (Acts 17:16–34)' },
      { pos: [37.91, 22.88], label: 'Corinth', note: 'Paul stays 18 months; tent-making with Aquila and Priscilla; letters to the Thessalonians written here (Acts 18:1–18)' },
      { pos: [37.94, 27.34], label: 'Ephesus', note: 'Brief visit; promises to return (Acts 18:19–21)' },
      { pos: [32.50, 34.89], label: 'Caesarea Maritima', note: 'Greeted the church; returned to Antioch (Acts 18:22)' },
    ],
  },
  {
    id: 'paul-journey-3',
    title: "Paul's 3rd Missionary Journey",
    person: 'Paul',
    period: 'nt',
    color: '#F59E0B',
    reference: 'Acts 18:23–21:16',
    summary: 'Paul returns to strengthen the churches. He spends nearly three years in Ephesus, where there is a riot. He revisits Macedonia and Greece, then travels by ship through the Aegean, collecting the offering for Jerusalem. Duration: ~AD 53–57.',
    waypoints: [
      { pos: [36.20, 36.16], label: 'Antioch (Syria)', note: 'Departs after spending time there (Acts 18:23)' },
      { pos: [38.28, 31.00], label: 'Galatian Churches', note: 'Strengthening the disciples (Acts 18:23)' },
      { pos: [37.94, 27.34], label: 'Ephesus', note: 'Paul teaches for 3 years; extraordinary miracles; silversmiths riot over Diana (Acts 19). Letters to Galatians and Corinthians written here.' },
      { pos: [41.01, 24.28], label: 'Macedonia / Philippi', note: 'Encourages the churches; collects the offering (Acts 20:1–6)' },
      { pos: [37.91, 22.88], label: 'Greece / Corinth', note: 'Three months; Romans written here (Acts 20:2–3)' },
      { pos: [39.78, 26.12], label: 'Troas', note: 'Eutychus falls from the window; Paul restores him (Acts 20:7–12)' },
      { pos: [37.53, 27.28], label: 'Miletus', note: 'Paul\'s farewell to Ephesian elders: "I am innocent of the blood of all men" (Acts 20:17–38)' },
      { pos: [33.27, 35.20], label: 'Tyre', note: 'Disciples urge Paul not to go to Jerusalem (Acts 21:3–6)' },
      { pos: [32.50, 34.89], label: 'Caesarea Maritima', note: 'Prophet Agabus binds himself with Paul\'s belt: "So shall the owner of this belt be bound in Jerusalem" (Acts 21:10–14)' },
      { pos: [31.78, 35.23], label: 'Jerusalem', note: 'Paul meets with James; arrested in the Temple; imprisoned (Acts 21:17–36)' },
    ],
  },
  {
    id: 'paul-rome',
    title: "Paul's Journey to Rome",
    person: 'Paul (prisoner)',
    period: 'nt',
    color: '#EF4444',
    reference: 'Acts 27–28',
    summary: 'Appealing to Caesar, Paul sails as a prisoner from Caesarea. A catastrophic storm destroys the ship near Malta. After wintering on the island, he reaches Rome and preaches under house arrest for two years. Duration: ~AD 59–61.',
    waypoints: [
      { pos: [32.50, 34.89], label: 'Caesarea Maritima', note: 'Paul appeals to Caesar: "I stand at Caesar\'s tribunal" — sails for Rome (Acts 25:10–12; 27:1)' },
      { pos: [33.56, 35.37], label: 'Sidon', note: 'Julius allows Paul to go to his friends (Acts 27:3)' },
      { pos: [36.27, 29.97], label: 'Myra, Lycia', note: 'Board an Alexandrian grain ship bound for Italy (Acts 27:5–6)' },
      { pos: [34.92, 24.80], label: 'Fair Havens, Crete', note: 'Paul warns against sailing; ignored; a terrible northeaster sweeps them away (Acts 27:9–14)' },
      { pos: [36.00, 16.00], label: 'Adria Sea', note: 'Fourteen days adrift; angel assures Paul all will survive (Acts 27:21–26)' },
      { pos: [35.94, 14.37], label: 'Malta', note: 'Shipwrecked; islanders show unusual kindness; Paul bitten by viper but unharmed; heals many (Acts 28:1–10)' },
      { pos: [37.08, 15.29], label: 'Syracuse, Sicily', note: 'Three days here (Acts 28:12)' },
      { pos: [40.83, 14.12], label: 'Puteoli', note: 'Brothers found here; stay for a week (Acts 28:13–14)' },
      { pos: [41.90, 12.50], label: 'Rome', note: 'Paul lives under house arrest for two years; preaches the kingdom of God openly without hindrance (Acts 28:30–31)' },
    ],
  },
  {
    id: 'flight-egypt',
    title: 'Flight to Egypt',
    person: 'Mary, Joseph & Jesus',
    period: 'nt',
    color: '#C084FC',
    reference: 'Matthew 2:13–23',
    summary: 'An angel warns Joseph in a dream to flee to Egypt before Herod kills the infant boys in Bethlehem. The family remains in Egypt until Herod\'s death, then returns to Nazareth — fulfilling prophecy.',
    waypoints: [
      { pos: [31.70, 35.20], label: 'Bethlehem', note: 'Angel appears to Joseph in a dream: "Flee to Egypt; stay until I tell you" (Matt 2:13)' },
      { pos: [31.25, 34.79], label: 'Negev / Gaza Road', note: 'Ancient coastal or inland route south to Egypt' },
      { pos: [31.20, 29.92], label: 'Egypt (Alexandria)', note: 'The holy family lives in Egypt fulfilling Hosea 11:1: "Out of Egypt I called my son"' },
      { pos: [32.70, 35.30], label: 'Nazareth', note: 'Returns after Herod\'s death; settles in Nazareth fulfilling the prophets (Matt 2:23)' },
    ],
  },
];

// ── Passage → Journey / Era lookup ───────────────────────────────────────────
// Each entry maps one or more book names (lowercase, no spaces) to a journey
// and/or time period. chapterRange [start, end] narrows the match further.
const PASSAGE_JOURNEY_MAP = [
  { books: ['genesis'], chapterRange: [11, 22], journeyId: 'abraham', periodId: 'patriarchal' },
  { books: ['genesis'], chapterRange: [27, 35], journeyId: 'jacob-haran', periodId: 'patriarchal' },
  { books: ['genesis'], chapterRange: [37, 50], journeyId: 'joseph-egypt', periodId: 'patriarchal' },
  { books: ['genesis'], periodId: 'patriarchal' },
  { books: ['exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua'], journeyId: 'exodus-route', periodId: 'exodus' },
  { books: ['ruth'], journeyId: 'ruth', periodId: 'judges' },
  { books: ['judges'], periodId: 'judges' },
  { books: ['1samuel', '2samuel'], periodId: 'united' },
  { books: ['1kings'], chapterRange: [1, 11], periodId: 'united' },
  { books: ['1kings'], chapterRange: [12, 22], journeyId: 'elijah', periodId: 'divided' },
  { books: ['2kings'], chapterRange: [1, 17], journeyId: 'elijah', periodId: 'divided' },
  { books: ['2kings'], chapterRange: [18, 25], periodId: 'assyrian' },
  { books: ['jonah'], journeyId: 'jonah', periodId: 'assyrian' },
  { books: ['isaiah', 'hosea', 'amos', 'micah', 'nahum'], periodId: 'assyrian' },
  { books: ['jeremiah', 'lamentations', 'ezekiel', 'daniel', 'habakkuk', 'zephaniah'], journeyId: 'exile-babylon', periodId: 'exile' },
  { books: ['ezra', 'nehemiah', 'haggai', 'zechariah', 'malachi', 'esther'], journeyId: 'return-exile', periodId: 'persian' },
  { books: ['matthew', 'mark', 'luke', 'john'], journeyId: 'jesus-ministry', periodId: 'nt' },
  { books: ['acts'], chapterRange: [1, 12], journeyId: 'jesus-ministry', periodId: 'nt' },
  { books: ['acts'], chapterRange: [13, 14], journeyId: 'paul-journey-1', periodId: 'nt' },
  { books: ['acts'], chapterRange: [15, 18], journeyId: 'paul-journey-2', periodId: 'nt' },
  { books: ['acts'], chapterRange: [19, 21], journeyId: 'paul-journey-3', periodId: 'nt' },
  { books: ['acts'], chapterRange: [27, 28], journeyId: 'paul-rome', periodId: 'nt' },
  { books: ['acts'], periodId: 'nt' },
  { books: ['romans', '1corinthians', '2corinthians', 'galatians', 'ephesians', 'philippians', 'colossians', '1thessalonians', '2thessalonians', 'philemon', '1timothy', '2timothy', 'titus', 'hebrews', 'james', '1peter', '2peter', '1john', '2john', '3john', 'jude', 'revelation'], periodId: 'nt' },
];

// Parse a Bible reference string (e.g. "Acts 13:1", "John 3:16", "Genesis 12")
// and return the best matching { journeyId, periodId } or null.
export function findJourneyForRef(ref) {
  if (!ref) return null;
  const m = ref.match(/^(\d?\s*[A-Za-z]+)\s+(\d+)/);
  if (!m) return null;
  const bookRaw = m[1].replace(/\s+/g, '').toLowerCase();
  const chapter = parseInt(m[2], 10);
  let fallback = null;
  for (const entry of PASSAGE_JOURNEY_MAP) {
    if (!entry.books.includes(bookRaw)) continue;
    if (entry.chapterRange) {
      if (chapter >= entry.chapterRange[0] && chapter <= entry.chapterRange[1]) {
        return { journeyId: entry.journeyId ?? null, periodId: entry.periodId };
      }
    } else if (!fallback) {
      fallback = entry;
    }
  }
  return fallback ? { journeyId: fallback.journeyId ?? null, periodId: fallback.periodId } : null;
}

// City and location markers.
// type: 'major' | 'minor' | 'holy' | 'region'
export const CITIES = [
  // Mesopotamia
  { id: 'ur', label: 'Ur', pos: [30.96, 46.11], periods: ['patriarchal'], type: 'major', note: 'Abraham\'s birthplace; center of Sumerian civilization' },
  { id: 'haran', label: 'Haran', pos: [36.86, 39.02], periods: ['patriarchal'], type: 'major', note: 'Crossroads city; Abraham\'s family stopped here' },
  { id: 'nineveh', label: 'Nineveh', pos: [36.36, 43.15], periods: ['assyrian', 'divided'], type: 'major', note: 'Capital of Assyria; Jonah preached here; fell to Babylon 612 BC' },
  { id: 'babylon', label: 'Babylon', pos: [32.54, 44.42], periods: ['exile', 'persian'], type: 'major', note: 'Capital of Nebuchadnezzar\'s empire; site of the exile; Hanging Gardens' },
  { id: 'susa', label: 'Susa', pos: [32.19, 48.26], periods: ['exile', 'persian'], type: 'major', note: 'Persian capital; setting of the book of Esther and parts of Daniel; Nehemiah served here' },
  { id: 'persepolis', label: 'Persepolis', pos: [29.94, 52.89], periods: ['persian'], type: 'major', note: 'Ceremonial capital of the Persian Empire under Darius and Xerxes' },

  // Egypt
  { id: 'goshen', label: 'Goshen / Rameses', pos: [30.79, 31.82], periods: ['egypt', 'exodus'], type: 'major', note: 'Land given to Israel in Egypt; site of forced labor building store cities' },
  { id: 'memphis', label: 'Memphis', pos: [29.84, 31.25], periods: ['patriarchal', 'egypt', 'exodus'], type: 'major', note: 'Ancient capital of Egypt; site of Joseph\'s service to Pharaoh' },
  { id: 'alexandria', label: 'Alexandria', pos: [31.20, 29.92], periods: ['persian', 'nt'], type: 'major', note: 'Founded by Alexander the Great 331 BC; center of Jewish Diaspora; Apollos from here' },
  { id: 'thebes', label: 'Thebes / Luxor', pos: [25.69, 32.64], periods: ['egypt', 'exodus'], type: 'minor', note: 'Religious capital of Egypt; site of the great temples of Karnak and Luxor' },

  // Sinai / Negev
  { id: 'sinai', label: 'Mt. Sinai / Horeb', pos: [28.54, 33.98], periods: ['exodus', 'divided'], type: 'holy', note: 'The Mountain of God; Ten Commandments given; Elijah hears the still small voice' },
  { id: 'kadesh-barnea', label: 'Kadesh Barnea', pos: [30.62, 34.36], periods: ['exodus'], type: 'minor', note: 'Headquarters of Israel during the wilderness years; the spies sent from here' },
  { id: 'beersheba', label: 'Beersheba', pos: [31.25, 34.79], periods: ['patriarchal', 'judges', 'united', 'divided'], type: 'major', note: '"From Dan to Beersheba" — southern boundary of Israel; Abraham and Isaac dug wells here' },

  // Canaan / Israel
  { id: 'shechem', label: 'Shechem', pos: [32.22, 35.27], periods: ['patriarchal', 'judges', 'divided'], type: 'major', note: 'First place Abraham stops in Canaan; Jacob settles here; Israel divides here under Rehoboam' },
  { id: 'bethel', label: 'Bethel', pos: [31.93, 35.22], periods: ['patriarchal', 'judges', 'divided'], type: 'major', note: 'Jacob\'s ladder vision; Ark of the Covenant; Jeroboam\'s golden calves' },
  { id: 'shiloh', label: 'Shiloh', pos: [32.05, 35.28], periods: ['judges', 'united'], type: 'major', note: 'Resting place of the Tabernacle and Ark for ~300 years; Samuel grew up here' },
  { id: 'hebron', label: 'Hebron', pos: [31.53, 35.10], periods: ['patriarchal', 'judges', 'united', 'divided'], type: 'major', note: 'Abraham\'s burial place; David\'s first capital (7 years); Machpelah cave' },
  { id: 'jerusalem', label: 'Jerusalem', pos: [31.78, 35.23], periods: ['united', 'divided', 'assyrian', 'exile', 'persian', 'nt'], type: 'holy', note: 'David\'s capital; Solomon\'s Temple; destroyed by Babylon 586 BC; Second Temple; Jesus\'s crucifixion and resurrection' },
  { id: 'bethlehem', label: 'Bethlehem', pos: [31.70, 35.20], periods: ['judges', 'united', 'nt'], type: 'holy', note: 'Ruth\'s story; birthplace of David; birthplace of Jesus' },
  { id: 'jericho', label: 'Jericho', pos: [31.87, 35.44], periods: ['exodus', 'judges', 'nt'], type: 'major', note: 'First city conquered by Joshua; walls fall by faith; Zacchaeus; Bartimaeus' },
  { id: 'samaria', label: 'Samaria', pos: [32.27, 35.20], periods: ['divided', 'assyrian', 'nt'], type: 'major', note: 'Capital of northern Kingdom of Israel; Omri builds it; Ahab and Jezebel; falls to Assyria 722 BC' },
  { id: 'megiddo', label: 'Megiddo', pos: [32.58, 35.18], periods: ['judges', 'united', 'divided'], type: 'major', note: 'Strategic pass; site of many battles; Josiah dies here; site of Armageddon (Rev 16:16)' },
  { id: 'hazor', label: 'Hazor', pos: [33.02, 35.57], periods: ['judges', 'united'], type: 'major', note: 'Largest city in Canaan; head of the northern kingdoms; burned by Joshua (Josh 11)' },
  { id: 'joppa', label: 'Joppa', pos: [32.05, 34.75], periods: ['judges', 'divided', 'nt'], type: 'major', note: 'Mediterranean port; Jonah departs here; Peter raises Dorcas; Peter\'s vision on the rooftop (Acts 10)' },
  { id: 'gibeah', label: 'Gibeah', pos: [31.83, 35.20], periods: ['judges', 'united'], type: 'minor', note: 'Saul\'s hometown; the Levite\'s concubine outrage; tribal war (Judg 19–21)' },
  { id: 'ashdod', label: 'Ashdod', pos: [31.81, 34.65], periods: ['judges', 'united', 'divided'], type: 'minor', note: 'Philistine city; the Ark of the Covenant brought here; Dagon\'s temple' },
  { id: 'gaza', label: 'Gaza', pos: [31.50, 34.47], periods: ['judges', 'united', 'divided'], type: 'major', note: 'Philistine capital; Samson tears down the pillars; Philip and the Ethiopian eunuch (Acts 8)' },
  { id: 'penuel', label: 'Penuel', pos: [32.09, 35.60], periods: ['patriarchal'], type: 'minor', note: 'Jacob wrestles with God; "I have seen God face to face and yet my life has been delivered"' },
  { id: 'dothan', label: 'Dothan', pos: [32.40, 35.20], periods: ['patriarchal', 'divided'], type: 'minor', note: 'Joseph sold into slavery here; Elisha\'s servant sees chariots of fire (2 Kgs 6:13–17)' },
  { id: 'mt-carmel', label: 'Mt. Carmel', pos: [32.75, 35.05], periods: ['divided'], type: 'major', note: 'Elijah\'s contest with the prophets of Baal; fire falls from heaven (1 Kgs 18)' },
  { id: 'petra', label: 'Petra', pos: [30.33, 35.44], periods: ['nt'], type: 'minor', note: 'Nabataean capital; rose-red rock city; region of ancient Edom' },
  { id: 'caesarea-maritima', label: 'Caesarea Maritima', pos: [32.50, 34.89], periods: ['nt'], type: 'major', note: 'Roman provincial capital; Herod\'s great harbor city; Cornelius; Paul imprisoned here two years' },
  { id: 'caesarea-philippi', label: 'Caesarea Philippi', pos: [33.25, 35.69], periods: ['nt'], type: 'minor', note: 'Peter\'s confession "You are the Christ"; Transfiguration nearby' },

  // Galilee / NT
  { id: 'nazareth', label: 'Nazareth', pos: [32.70, 35.30], periods: ['nt'], type: 'major', note: 'Jesus\'s hometown; annunciation to Mary; "Is not this Joseph\'s son?" — rejected (Luke 4)' },
  { id: 'capernaum', label: 'Capernaum', pos: [32.88, 35.58], periods: ['nt'], type: 'major', note: 'Jesus\'s ministry headquarters; Peter\'s house; synagogue; many miracles' },
  { id: 'cana', label: 'Cana', pos: [32.75, 35.34], periods: ['nt'], type: 'minor', note: 'Water turned to wine; Jesus\'s first sign (John 2)' },
  { id: 'jordan-baptism', label: 'Baptism Site (Jordan)', pos: [31.83, 35.55], periods: ['nt'], type: 'holy', note: 'Jesus baptized by John; Spirit descends as a dove (Matt 3)' },
  { id: 'bethany', label: 'Bethany', pos: [31.77, 35.26], periods: ['nt'], type: 'minor', note: 'Home of Mary, Martha, and Lazarus; resurrection of Lazarus; Jesus\'s anointing' },
  { id: 'emmaus', label: 'Emmaus', pos: [31.83, 35.04], periods: ['nt'], type: 'minor', note: 'Risen Jesus walks with two disciples; revealed in the breaking of bread (Luke 24)' },

  // Levant
  { id: 'tyre', label: 'Tyre', pos: [33.27, 35.20], periods: ['united', 'divided', 'nt'], type: 'major', note: 'Phoenician maritime city; Hiram supplied cedars for Solomon\'s Temple; Jesus visits the region' },
  { id: 'sidon', label: 'Sidon', pos: [33.56, 35.37], periods: ['united', 'divided', 'nt'], type: 'major', note: 'Phoenician city; Elijah and the widow of Zarephath (1 Kgs 17); Paul stops here en route to Rome' },
  { id: 'damascus', label: 'Damascus', pos: [33.51, 36.28], periods: ['patriarchal', 'united', 'divided', 'nt'], type: 'major', note: 'Oldest continuously inhabited city; Naaman; Paul struck blind and converted on the road here (Acts 9)' },
  { id: 'antioch-syria', label: 'Antioch (Syria)', pos: [36.20, 36.16], periods: ['nt'], type: 'major', note: 'Third city of the Roman Empire; believers first called "Christians" here; base for Paul\'s missionary journeys' },

  // Paul's Journeys - Asia Minor
  { id: 'ephesus', label: 'Ephesus', pos: [37.94, 27.34], periods: ['nt'], type: 'major', note: 'Paul\'s longest stay (3 years); Temple of Artemis; Demetrius riot; letters to Ephesians; one of the seven churches of Revelation' },
  { id: 'troas', label: 'Troas', pos: [39.78, 26.12], periods: ['nt'], type: 'minor', note: 'Paul\'s Macedonian vision; Eutychus falls from window; Paul celebrates the Lord\'s Supper (Acts 20)' },
  { id: 'miletus', label: 'Miletus', pos: [37.53, 27.28], periods: ['nt'], type: 'minor', note: 'Paul\'s farewell to the Ephesian elders (Acts 20:17–38)' },
  { id: 'antioch-pisidia', label: 'Antioch (Pisidia)', pos: [38.28, 31.00], periods: ['nt'], type: 'minor', note: 'Paul\'s extended synagogue sermon; Jews stir up opposition (Acts 13)' },
  { id: 'iconium', label: 'Iconium', pos: [37.87, 32.48], periods: ['nt'], type: 'minor', note: 'Paul and Barnabas preach to Jews and Greeks; fled a stoning plot (Acts 14)' },
  { id: 'lystra', label: 'Lystra', pos: [37.57, 32.30], periods: ['nt'], type: 'minor', note: 'Paul heals lame man; crowds call him Hermes; Paul is stoned and left for dead; Timothy\'s hometown' },
  { id: 'derbe', label: 'Derbe', pos: [37.36, 33.51], periods: ['nt'], type: 'minor', note: 'Many disciples made; Paul and Barnabas turn back to Lystra (Acts 14:20–21)' },

  // Paul's Journeys - Greece/Europe
  { id: 'philippi', label: 'Philippi', pos: [41.01, 24.28], periods: ['nt'], type: 'major', note: 'First European church; Lydia baptized; Paul and Silas imprisoned and freed; letter to Philippians' },
  { id: 'thessalonica', label: 'Thessalonica', pos: [40.64, 22.94], periods: ['nt'], type: 'major', note: '"Turned the world upside down"; letters to Thessalonians written by Paul; large Jewish synagogue' },
  { id: 'berea', label: 'Berea', pos: [40.52, 22.20], periods: ['nt'], type: 'minor', note: '"More noble than Thessalonica" — searched the Scriptures daily to verify Paul\'s teaching (Acts 17:11)' },
  { id: 'athens', label: 'Athens', pos: [37.98, 23.73], periods: ['nt'], type: 'major', note: 'Paul on the Areopagus (Mars Hill): sermon on the Unknown God; Dionysius and Damaris believe (Acts 17)' },
  { id: 'corinth', label: 'Corinth', pos: [37.91, 22.88], periods: ['nt'], type: 'major', note: 'Paul stays 18 months; tent-making with Aquila and Priscilla; two letters to Corinthians; Romans written here' },

  // Paul's Journey to Rome
  { id: 'malta', label: 'Malta', pos: [35.94, 14.37], periods: ['nt'], type: 'minor', note: 'Shipwreck; viper bite does not harm Paul; Publius\'s father and others healed (Acts 28)' },
  { id: 'rome', label: 'Rome', pos: [41.90, 12.50], periods: ['nt'], type: 'major', note: 'Imperial capital; Paul preaches openly for 2 years under house arrest; letters from prison; martyred under Nero c. AD 67' },

  // Seven Churches of Revelation
  { id: 'smyrna', label: 'Smyrna (Izmir)', pos: [38.42, 27.13], periods: ['nt'], type: 'minor', note: 'One of the seven churches: "Be faithful unto death, and I will give you the crown of life" (Rev 2:10)' },
  { id: 'pergamum', label: 'Pergamum', pos: [39.13, 27.19], periods: ['nt'], type: 'minor', note: 'One of the seven churches; "where Satan\'s throne is"; great altar and library' },
  { id: 'thyatira', label: 'Thyatira', pos: [38.92, 27.84], periods: ['nt'], type: 'minor', note: 'One of the seven churches; Lydia was from here; purple cloth merchants' },
  { id: 'sardis', label: 'Sardis', pos: [38.49, 28.04], periods: ['nt'], type: 'minor', note: 'One of the seven churches: "You have a name that you are alive, but you are dead" (Rev 3:1)' },
  { id: 'philadelphia', label: 'Philadelphia', pos: [38.35, 28.52], periods: ['nt'], type: 'minor', note: 'One of the seven churches: "I have set before you an open door" (Rev 3:8)' },
  { id: 'laodicea', label: 'Laodicea', pos: [37.83, 29.12], periods: ['nt'], type: 'minor', note: 'One of the seven churches: "Because you are lukewarm… I will spit you out" (Rev 3:16)' },
];

// Case-insensitive city name → { cityId, period } index built from CITIES.
// When a city spans multiple eras, the first period in its periods array is used.
export const CITY_NAME_INDEX = Object.fromEntries(
  CITIES.map((c) => [c.label.toLowerCase(), { cityId: c.id, period: c.periods[0] }])
);
