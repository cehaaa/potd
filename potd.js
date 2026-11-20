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
const DATA_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/potd/main/pokemon.json"
const PREVIEW_SIZE = "medium" // size previewed with ?preview=1 when run in app
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"]

// ---------- data ----------

// Downloads the list from DATA_URL and keeps a copy on the phone, so the
// widget still works offline or if GitHub is unreachable.
async function loadData() {
  const fm = FileManager.local()
  const cache = fm.joinPath(fm.documentsDirectory(), "potd-cache.json")
  let raw = null
  try {
    const req = new Request(DATA_URL)
    req.timeoutInterval = 10
    raw = await req.loadString()
    JSON.parse(raw) // only cache valid JSON
    fm.writeString(cache, raw)
  } catch (_) {
    raw = fm.fileExists(cache) ? fm.readString(cache) : null
  }
  if (!raw) throw new Error(`Couldn't load ${DATA_URL}`)

  return JSON.parse(raw).map(e => {
    const [, day, month] = e.date.match(/^(\d+)\D*\s+(\w+)$/)
    return { ...e, day: Number(day), month: MONTHS.indexOf(month) }
  })
}

// Index of the entry for a given date. Falls back to the previous day
// when a date has no entry (e.g. 29th February).
function indexFor(entries, date) {
  for (let day = date.getDate(); day > 0; day--) {
    const i = entries.findIndex(e => e.month === date.getMonth() && e.day === day)
    if (i !== -1) return i
  }
  return 0
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function nextMidnight() {
  const d = addDays(new Date(), 1)
  d.setHours(0, 0, 5, 0)
  return d
}

function weekday(date) {
  const f = new DateFormatter()
  f.dateFormat = "EEEE"
  return f.string(date)
}

// ---------- images ----------

async function getImage(url) {
  if (!url) return null
  const fm = FileManager.local()
  const dir = fm.joinPath(fm.cacheDirectory(), "potd")
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true)
  const path = fm.joinPath(dir, url.split("/").pop())
  if (fm.fileExists(path)) return fm.readImage(path)
  try {
    const img = await new Request(url).loadImage()
    fm.writeImage(path, img)
    return img
  } catch (_) {
    return null
  }
}

// ---------- widget ----------

const C = {
  bgTop: Color.dynamic(new Color("#FFF4F2"), new Color("#2B1B22")),
  bgBottom: Color.dynamic(new Color("#FFDCD6"), new Color("#120D12")),
  accent: Color.dynamic(new Color("#D9372B"), new Color("#FF6B5E")),
  text: Color.dynamic(new Color("#1E1414"), new Color("#FFFFFF")),
  muted: Color.dynamic(new Color("#7A5E5A"), new Color("#B8A6A9")),
}

function addCentered(parent, build) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.addSpacer()
  build(row)
  row.addSpacer()
  return row
}

function addText(stack, str, font, color, lines = 1) {
  const t = stack.addText(str)
  t.font = font
  t.textColor = color
  t.lineLimit = lines
  t.minimumScaleFactor = 0.6
  return t
}

function buildWidget(entry, img, date, family, offset) {
  const w = new ListWidget()
  w.refreshAfterDate = nextMidnight()
  w.url = `${URLScheme.forRunningScript()}?offset=${offset}`

  const label = offset === 0 ? "POKÉMON OF THE DAY" : weekday(date).toUpperCase()
  const dateLine = `${weekday(date)} · ${entry.date}`

  // Lock screen widgets
  if (family === "accessoryCircular") {
    if (img) w.addImage(img).applyFittingContentMode()
    return w
  }
  if (family === "accessoryInline") {
    w.addText(`${entry.name} · ${entry.date}`)
    return w
  }
  if (family === "accessoryRectangular") {
    addText(w, entry.name, Font.boldSystemFont(15), Color.white())
    addText(w, entry.date, Font.systemFont(12), Color.white())
    return w
  }

  const g = new LinearGradient()
  g.colors = [C.bgTop, C.bgBottom]
  g.locations = [0, 1]
  w.backgroundGradient = g

  if (family === "medium") {
    w.setPadding(12, 14, 12, 16)
    const row = w.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    if (img) row.addImage(img).imageSize = new Size(130, 130)
    row.addSpacer(12)
    const col = row.addStack()
    col.layoutVertically()
    addText(col, label, Font.semiboldSystemFont(10), C.accent)
    col.addSpacer(6)
    addText(col, entry.name, Font.boldRoundedSystemFont(24), C.text, 2)
    col.addSpacer(4)
    addText(col, weekday(date), Font.mediumSystemFont(13), C.muted)
    addText(col, entry.date, Font.mediumSystemFont(13), C.muted)
    row.addSpacer()
    return w
  }

  const large = family === "large" || family === "extraLarge"
  w.setPadding(large ? 16 : 10, 12, large ? 16 : 12, 12)
  addText(w, label, Font.semiboldSystemFont(large ? 12 : 9), C.accent)
  w.addSpacer()
  if (img) {
    const s = large ? 230 : 84
    addCentered(w, row => { row.addImage(img).imageSize = new Size(s, s) })
  }
  w.addSpacer()
  addText(w, entry.name, Font.boldRoundedSystemFont(large ? 26 : 15), C.text)
  addText(w, large ? dateLine : entry.date, Font.mediumSystemFont(large ? 14 : 11), C.muted)
  return w
}

// ---------- in-app swipe view ----------

function buildHTML(entries, start) {
  const data = JSON.stringify(entries.map(e => ({ n: e.name, d: e.date, i: e.image })))
    .replace(/</g, "\\u003c")
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<style>
  :root { --bg1:#FFF4F2; --bg2:#FFDCD6; --text:#1E1414; --muted:#7A5E5A; --accent:#D9372B; --chip:rgba(0,0,0,.06); }
  @media (prefers-color-scheme: dark) {
    :root { --bg1:#2B1B22; --bg2:#120D12; --text:#fff; --muted:#B8A6A9; --accent:#FF6B5E; --chip:rgba(255,255,255,.1); }
  }
  * { box-sizing:border-box; margin:0; -webkit-tap-highlight-color:transparent; }
  html, body { height:100%; overflow:hidden; background:linear-gradient(var(--bg1), var(--bg2));
    color:var(--text); font-family:-apple-system, system-ui, sans-serif; }
  #track { display:flex; height:100%; overflow-x:auto; overflow-y:hidden;
    scroll-snap-type:x mandatory; scrollbar-width:none; }
  #track::-webkit-scrollbar { display:none; }
  .slide { flex:0 0 100%; height:100%; scroll-snap-align:center; scroll-snap-stop:always;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 96px); }
  .label { font-size:13px; font-weight:600; letter-spacing:.12em; color:var(--accent); }
  .slide img { width:min(78vw, 46vh); aspect-ratio:1; object-fit:contain; margin:28px 0;
    filter:drop-shadow(0 12px 24px rgba(0,0,0,.18)); }
  .name { font-size:34px; font-weight:800; text-align:center; font-family:ui-rounded, -apple-system, sans-serif; }
  .date { margin-top:6px; font-size:17px; color:var(--muted); }
  #bar { position:fixed; left:0; right:0; bottom:calc(env(safe-area-inset-bottom) + 20px);
    display:flex; justify-content:center; gap:12px; }
  #bar button { border:0; border-radius:999px; padding:12px 18px; font:600 15px -apple-system, sans-serif;
    background:var(--chip); color:var(--text); }
  #bar button:disabled { opacity:.35; }
  #today[hidden] { display:none; }
</style>
</head><body>
<div id="track"></div>
<div id="bar">
  <button id="prev" aria-label="Previous">‹</button>
  <button id="today" hidden>Today</button>
  <button id="next" aria-label="Next">›</button>
</div>
<script>
  const DATA = ${data}, TODAY = ${start.today}, START = ${start.index};
  const track = document.getElementById('track');
  DATA.forEach((p, i) => {
    const s = document.createElement('section');
    s.className = 'slide';
    s.innerHTML = '<div class="label"></div><img alt=""><div class="name"></div><div class="date"></div>';
    s.querySelector('.label').textContent = i === TODAY ? 'POKÉMON OF THE DAY' : (i < TODAY ? 'PREVIOUSLY' : 'COMING UP');
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
</body></html>`
}

// ---------- main ----------

const entries = await loadData()
const params = args.queryParameters || {}
const offset = Number(params.offset ?? args.widgetParameter ?? 0) || 0
const now = new Date()
const date = addDays(now, offset)
const todayIndex = indexFor(entries, now)
const index = indexFor(entries, date)

if (config.runsInWidget || params.preview) {
  const entry = entries[index]
  const img = await getImage(entry.image)
  const family = config.widgetFamily || PREVIEW_SIZE
  const widget = buildWidget(entry, img, date, family, offset)
  if (config.runsInWidget) {
    Script.setWidget(widget)
  } else {
    await widget[`present${family[0].toUpperCase()}${family.slice(1)}`]()
  }
} else {
  const view = new WebView()
  await view.loadHTML(buildHTML(entries, { today: todayIndex, index }))
  await view.present(true)
}

Script.complete()
