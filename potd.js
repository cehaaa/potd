// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: dragon;

// Pokémon of the Day — Scriptable widget
//
// Setup:
//   1. Set DATA_URL below to where pokemon.json is hosted, then paste this
//      script into a new Scriptable script named "potd".
//   2. Add a Scriptable widget to your home screen (any size), pick "potd".
//   3. Optional widget Parameter: a day offset, e.g. -1 (yesterday) or 1 (tomorrow).
//
// Tapping the widget opens a full-screen view you can swipe left/right
// through every Pokémon of the year.

// Raw URL of pokemon.json. For a public GitHub repo it looks like:
// https://raw.githubusercontent.com/<username>/<repo>/main/pokemon.json
const DATA_URL =
  "https://raw.githubusercontent.com/cehaaa/potd/main/pokemon.json";
const PREVIEW_SIZE = "medium"; // size previewed with ?preview=1 when run in app
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ---------- data ----------

// Downloads the list from DATA_URL and keeps a copy on the phone, so the
// widget still works offline or if GitHub is unreachable.
async function loadData() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.documentsDirectory(), "potd-cache.json");
  let raw = null;
  try {
    const req = new Request(DATA_URL);
    req.timeoutInterval = 10;
    raw = await req.loadString();
    JSON.parse(raw); // only cache valid JSON
    fm.writeString(cache, raw);
  } catch (_) {
    raw = fm.fileExists(cache) ? fm.readString(cache) : null;
  }
  if (!raw) throw new Error(`Couldn't load ${DATA_URL}`);

  return JSON.parse(raw).map((e) => {
    const [, day, month] = e.date.match(/^(\d+)\D*\s+(\w+)$/);
    return { ...e, day: Number(day), month: MONTHS.indexOf(month) };
  });
}

// Index of the entry for a given date. Falls back to the previous day
// when a date has no entry (e.g. 29th February).
function indexFor(entries, date) {
  for (let day = date.getDate(); day > 0; day--) {
    const i = entries.findIndex(
      (e) => e.month === date.getMonth() && e.day === day,
    );
    if (i !== -1) return i;
  }
  return 0;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function nextMidnight() {
  const d = addDays(new Date(), 1);
  d.setHours(0, 0, 5, 0);
  return d;
}

function weekday(date) {
  const f = new DateFormatter();
  f.dateFormat = "EEEE";
  return f.string(date);
}

// ---------- images ----------

async function getImage(url) {
  if (!url) return null;
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.cacheDirectory(), "potd");
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const path = fm.joinPath(dir, url.split("/").pop());
  if (fm.fileExists(path)) return fm.readImage(path);
  try {
    const img = await new Request(url).loadImage();
    fm.writeImage(path, img);
    return img;
  } catch (_) {
    return null;
  }
}

// ---------- widget ----------

// Colors from the Pokédex website.
const C = {
  navy: new Color("#101828"),
  red: new Color("#C10007"),
  panel: Color.dynamic(new Color("#F3F4F6"), new Color("#1E2939")),
  white: Color.white(),
  muted: new Color("#99A1AF"),
  divider: new Color("#364153"),
};

function addCentered(parent, build) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.addSpacer();
  build(row);
  row.addSpacer();
  return row;
}

function addText(stack, str, font, color, lines = 1) {
  const t = stack.addText(str);
  t.font = font;
  t.textColor = color;
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.6;
  return t;
}

// The red line between the picture and the name, like on the website cards.
function addRedBar(parent, vertical, thickness) {
  const bar = parent.addStack();
  bar.backgroundColor = C.red;
  if (vertical) {
    bar.layoutVertically();
    bar.size = new Size(thickness, 0);
  } else {
    bar.size = new Size(0, thickness);
  }
  bar.addSpacer();
}

function addTag(parent, str, fontSize) {
  const tag = parent.addStack();
  tag.backgroundColor = C.red;
  tag.setPadding(2, 6, 2, 6);
  addText(tag, str, Font.semiboldSystemFont(fontSize), C.white);
}

// Light grey box with the Pokémon picture in the middle.
function addPicturePanel(parent, card, imageSize, buildHeader) {
  const panel = parent.addStack();
  panel.layoutVertically();
  panel.backgroundColor = C.panel;
  const header = panel.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  buildHeader(header);
  panel.addSpacer();
  addCentered(panel, (row) => {
    if (card.img) {
      row.addImage(card.img).imageSize = new Size(imageSize, imageSize);
    }
  });
  panel.addSpacer();
  return panel;
}

function buildSmall(w, card) {
  const panel = addPicturePanel(w, card, 84, (header) =>
    addDayHeader(header, card, 10),
  );
  panel.setPadding(6, 12, 0, 12);

  addRedBar(w, false, 3);

  const info = w.addStack();
  info.size = new Size(0, 40);
  info.setPadding(0, 20, 0, 16);
  info.centerAlignContent();
  const text = info.addStack();
  text.layoutVertically();
  addText(text, card.entry.name.toUpperCase(), Font.boldSystemFont(13), C.white);
  addText(text, card.entry.date.toUpperCase(), Font.mediumSystemFont(9), C.muted);
  info.addSpacer();
}

// "100/365" in the center of the header.
function addDayHeader(header, card, fractionSize) {
  header.addSpacer();
  addDayFraction(header, card, fractionSize);
  header.addSpacer();
}

// "100/365": the day number in red, the total in grey.
function addDayFraction(parent, card, fontSize) {
  const fraction = parent.addStack();
  const font = Font.boldSystemFont(fontSize);
  const day = addText(fraction, String(card.day), font, C.red);
  const total = addText(fraction, `/${card.total}`, font, C.muted);
  // iOS shrinks each text on its own, which made "/365" smaller than "100".
  day.minimumScaleFactor = 1;
  total.minimumScaleFactor = 1;
}

function buildMedium(w, card) {
  const row = w.addStack();
  row.layoutHorizontally();

  const panel = addPicturePanel(row, card, 94, (header) =>
    addDayHeader(header, card, 12),
  );
  // An invisible line as tall as the header, so the picture sits in the middle.
  addText(panel, " ", Font.boldSystemFont(12), C.panel);
  panel.size = new Size(146, 0);
  // Top padding matches the right side, so "100/365" lines up with the tag.
  panel.setPadding(14, 8, 6, 8);

  addRedBar(row, true, 4);

  const info = row.addStack();
  info.layoutVertically();
  info.setPadding(14, 16, 18, 16);
  addTag(info, card.label, 9);
  info.addSpacer();
  addText(info, card.entry.name.toUpperCase(), Font.boldSystemFont(18), C.white, 2);
  info.addSpacer(6);
  addText(info, card.longDate, Font.mediumSystemFont(11), C.muted);
  row.addSpacer();
}

function buildLarge(w, card) {
  const panel = addPicturePanel(w, card, 176, (header) => {
    addTag(header, card.label, 9);
    header.addSpacer();
  });
  panel.setPadding(14, 16, 8, 16);

  addRedBar(w, false, 4);

  const info = w.addStack();
  info.size = new Size(0, 92);
  info.setPadding(0, 18, 0, 18);
  info.centerAlignContent();

  const text = info.addStack();
  text.layoutVertically();
  addText(text, card.entry.name.toUpperCase(), Font.boldSystemFont(28), C.white);
  addText(text, card.longDate, Font.mediumSystemFont(12), C.muted);

  info.addSpacer();
  addDayCounter(info, card);
}

// "DAY 330 OF 365" stacked on the right of the large widget.
function addDayCounter(parent, card) {
  const counter = parent.addStack();
  counter.layoutVertically();
  addText(counter, "DAY", Font.mediumSystemFont(10), C.muted);
  addText(counter, String(card.day), Font.heavySystemFont(26), C.white);
  addText(counter, `OF ${card.total}`, Font.mediumSystemFont(10), C.muted);
}

function buildExtraLarge(w, card) {
  const row = w.addStack();
  row.layoutHorizontally();

  const panel = addPicturePanel(row, card, 230, (header) => {
    addTag(header, card.label, 11);
    header.addSpacer();
  });
  panel.size = new Size(320, 0);
  panel.setPadding(16, 18, 16, 18);

  addRedBar(row, true, 5);

  const info = row.addStack();
  info.layoutVertically();
  info.setPadding(22, 26, 22, 26);
  addText(
    info,
    `DAY ${card.day} OF ${card.total}`,
    Font.mediumSystemFont(12),
    C.muted,
  );
  info.addSpacer(4);
  addText(info, card.entry.name.toUpperCase(), Font.boldSystemFont(36), C.white, 2);
  addText(info, card.longDate, Font.mediumSystemFont(15), C.muted);
  info.addSpacer();

  const divider = info.addStack();
  divider.size = new Size(0, 1);
  divider.backgroundColor = C.divider;
  divider.addSpacer();
  info.addSpacer(12);

  if (card.next) addUpNext(info, card.next, card.nextImg);
}

function addUpNext(parent, next, nextImg) {
  addText(parent, "UP NEXT", Font.semiboldSystemFont(10), C.muted);
  parent.addSpacer(6);
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const thumb = row.addStack();
  thumb.size = new Size(52, 52);
  thumb.backgroundColor = C.panel;
  thumb.centerAlignContent();
  if (nextImg) thumb.addImage(nextImg).imageSize = new Size(44, 44);

  row.addSpacer(12);
  const text = row.addStack();
  text.layoutVertically();
  addText(text, next.name.toUpperCase(), Font.boldSystemFont(16), C.white);
  addText(text, next.date.toUpperCase(), Font.mediumSystemFont(11), C.muted);
  row.addSpacer();
}

function buildWidget(entry, img, date, family, offset, extra = {}) {
  const w = new ListWidget();
  w.refreshAfterDate = nextMidnight();
  w.url = `${URLScheme.forRunningScript()}?offset=${offset}`;

  // Lock screen widgets
  if (family === "accessoryCircular") {
    if (img) w.addImage(img).applyFittingContentMode();
    return w;
  }
  if (family === "accessoryInline") {
    w.addText(`${entry.name} · ${entry.date}`);
    return w;
  }
  if (family === "accessoryRectangular") {
    addText(w, entry.name, Font.boldSystemFont(15), Color.white());
    addText(w, entry.date, Font.systemFont(12), Color.white());
    return w;
  }

  w.backgroundColor = C.navy;
  w.setPadding(0, 0, 0, 0);

  const card = {
    ...extra,
    entry,
    img,
    date,
    label: offset === 0 ? "POKÉMON OF THE DAY" : weekday(date).toUpperCase(),
    longDate: `${weekday(date)} · ${entry.date}`.toUpperCase(),
  };

  if (family === "medium") buildMedium(w, card);
  else if (family === "large") buildLarge(w, card);
  else if (family === "extraLarge") buildExtraLarge(w, card);
  else buildSmall(w, card);
  return w;
}

// ---------- in-app swipe view ----------

function buildHTML(entries, start) {
  const data = JSON.stringify(
    entries.map((e) => ({ n: e.name, d: e.date, i: e.image })),
  ).replace(/</g, "\\u003c");
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<style>
  :root { --page:#F9FAFB; --panel:#F3F4F6; --navy:#101828; --red:#C10007; --muted:#99A1AF; --edge:transparent; }
  @media (prefers-color-scheme: dark) {
    :root { --page:#030712; --panel:#1E2939; --edge:#364153; }
  }
  * { box-sizing:border-box; margin:0; -webkit-tap-highlight-color:transparent; }
  html, body { height:100%; overflow:hidden; background:var(--page);
    font-family:-apple-system, system-ui, sans-serif; }
  #track { display:flex; height:100%; overflow-x:auto; overflow-y:hidden;
    scroll-snap-type:x mandatory; scrollbar-width:none; }
  #track::-webkit-scrollbar { display:none; }
  .slide { flex:0 0 100%; height:100%; scroll-snap-align:center; scroll-snap-stop:always;
    display:flex; align-items:center; justify-content:center;
    padding:calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 96px); }
  .card { width:min(100%, 380px, 58vh); }
  .art { background:var(--panel); padding:16px 20px 12px; text-align:center; }
  .art img { display:block; width:100%; aspect-ratio:1; object-fit:contain; }
  .info { background:var(--navy); border-top:6px solid var(--red); padding:16px 22px 20px; color:#fff; }
  .top { display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .tag { background:var(--red); font-size:11px; font-weight:600; letter-spacing:.12em; padding:2px 8px; }
  .day { font-size:12px; font-weight:500; letter-spacing:.08em; color:var(--muted); }
  .name { margin-top:12px; font-size:28px; font-weight:700; line-height:1.15; letter-spacing:.06em; text-transform:uppercase; }
  .date { margin-top:6px; font-size:13px; font-weight:500; letter-spacing:.08em; color:var(--muted); text-transform:uppercase; }
  #bar { position:fixed; left:0; right:0; bottom:calc(env(safe-area-inset-bottom) + 20px);
    display:flex; justify-content:center; gap:8px; }
  #bar button { min-width:52px; height:52px; border:1px solid var(--edge); border-radius:0; padding:0 16px;
    background:var(--navy); color:#fff; font:600 22px -apple-system, sans-serif; }
  #bar #today { font-size:14px; letter-spacing:.12em; }
  #bar button:disabled { opacity:.35; }
  #today[hidden] { display:none; }
</style>
</head><body>
<div id="track"></div>
<div id="bar">
  <button id="prev" aria-label="Previous">‹</button>
  <button id="today" hidden>TODAY</button>
  <button id="next" aria-label="Next">›</button>
</div>
<script>
  const DATA = ${data}, TODAY = ${start.today}, START = ${start.index};
  const track = document.getElementById('track');
  DATA.forEach((p, i) => {
    const s = document.createElement('section');
    s.className = 'slide';
    s.innerHTML = '<div class="card"><div class="art"><img alt=""></div>' +
      '<div class="info"><div class="top"><span class="tag"></span><span class="day"></span></div>' +
      '<div class="name"></div><div class="date"></div></div></div>';
    s.querySelector('.tag').textContent = i === TODAY ? 'POKÉMON OF THE DAY' : (i < TODAY ? 'PREVIOUSLY' : 'COMING UP');
    s.querySelector('.day').textContent = 'DAY ' + (i + 1) + ' / ' + DATA.length;
    s.querySelector('.name').textContent = p.n;
    s.querySelector('.date').textContent = p.d;
    s.querySelector('img').dataset.src = p.i || '';
    track.appendChild(s);
  });
  const slides = track.children;
  const current = () => Math.round(track.scrollLeft / track.clientWidth);
  function update() {
    const c = current();
    for (let i = Math.max(0, c - 2); i <= Math.min(DATA.length - 1, c + 2); i++) {
      const img = slides[i].querySelector('img');
      if (!img.src && img.dataset.src) img.src = img.dataset.src;
    }
    document.getElementById('prev').disabled = c === 0;
    document.getElementById('next').disabled = c === DATA.length - 1;
    document.getElementById('today').hidden = c === TODAY;
  }
  const go = (i, smooth) => track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  document.getElementById('prev').onclick = () => go(current() - 1, true);
  document.getElementById('next').onclick = () => go(current() + 1, true);
  document.getElementById('today').onclick = () => go(TODAY, true);
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', () => go(current()));
  requestAnimationFrame(() => { go(START); update(); });
</script>
</body></html>`;
}

// ---------- main ----------

const entries = await loadData();
const params = args.queryParameters || {};
const offset = Number(params.offset ?? args.widgetParameter ?? 0) || 0;
const now = new Date();
const date = addDays(now, offset);
const todayIndex = indexFor(entries, now);
const index = indexFor(entries, date);

if (config.runsInWidget || params.preview) {
  const entry = entries[index];
  const img = await getImage(entry.image);
  const family = config.widgetFamily || PREVIEW_SIZE;
  const extra = { day: index + 1, total: entries.length };
  if (family === "extraLarge") {
    extra.next = entries[(index + 1) % entries.length];
    extra.nextImg = await getImage(extra.next.image);
  }
  const widget = buildWidget(entry, img, date, family, offset, extra);
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget[`present${family[0].toUpperCase()}${family.slice(1)}`]();
  }
} else {
  const view = new WebView();
  await view.loadHTML(buildHTML(entries, { today: todayIndex, index }));
  await view.present(true);
}

Script.complete();
