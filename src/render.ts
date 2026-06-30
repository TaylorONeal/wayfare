import type {
  Block,
  Booking,
  BadgeKind,
  BookingStatus,
  DayRow,
  Section,
  ThemeTokens,
  Trip,
} from "./types.js";
import { resolveTheme } from "./themes.js";

/* ----------------------------- helpers ------------------------------ */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tiny inline markup: **bold**, *italic*, and [text](url). Output is escaped first. */
function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); // bold first
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>"); // then single-* italic
  return out;
}

/** Strip inline markup to plain text (for <title>, which can't hold markup). */
function plain(s: string): string {
  return s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1").replace(/\*\*?/g, "");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fmtDay(iso: string): { d: string; w: string } {
  const dt = parseDate(iso);
  if (!dt) return { d: iso, w: "" };
  return { d: `${MONTHS[dt.getMonth()]} ${dt.getDate()}`, w: WEEKDAYS[dt.getDay()]! };
}

function fmtMoney(m?: { amount: number; currency: string }): string {
  if (!m) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(m.amount);
  } catch {
    return `${m.amount} ${m.currency}`;
  }
}

/* --------------------- booking status -> badge ---------------------- */

const STATUS_BADGE: Record<BookingStatus, { kind: BadgeKind; label: string }> = {
  idea: { kind: "line", label: "idea" },
  toBook: { kind: "book", label: "to book" },
  reserved: { kind: "gold", label: "reserved" },
  confirmed: { kind: "booked", label: "confirmed" },
  done: { kind: "ink", label: "done" },
  cancelled: { kind: "line", label: "cancelled" },
};

function badgeFor(b: Booking): { kind: BadgeKind; label: string } {
  const base = STATUS_BADGE[b.status ?? "idea"];
  if (b.status === "toBook" && b.bookBy) return { kind: base.kind, label: `book by ${fmtDay(b.bookBy).d}` };
  if (b.status === "confirmed" && b.date) return { kind: base.kind, label: `${fmtDay(b.date).w} ${fmtDay(b.date).d}` };
  return base;
}

function badge(kind: BadgeKind, text: string): string {
  return `<span class="badge b-${kind}">${esc(text)}</span>`;
}

function linksHtml(links?: { label: string; url: string }[]): string {
  if (!links?.length) return "";
  return " " + links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(" · ");
}

/* --------------------------- block render --------------------------- */

function bookingRow(b: Booking): string {
  const bg = badgeFor(b);
  const metaBits: string[] = [];
  if (b.time) metaBits.push(esc(String(b.time)));
  if (b.location) metaBits.push(esc(b.location));
  if (b.cost) metaBits.push(fmtMoney(b.cost));
  if (b.balanceDue) metaBits.push(`balance ${fmtMoney(b.balanceDue)}`);
  if (b.confirmation) metaBits.push(`conf <b>${esc(b.confirmation)}</b>`);
  const tags = b.tags?.length ? ` ${b.tags.map((t) => badge("line", t)).join(" ")}` : "";
  const meta = metaBits.length ? `<div class="meta">${metaBits.map((m) => `<span>${m}</span>`).join("")}</div>` : "";
  const note = b.notes ? `<div class="note">${inline(b.notes)}${linksHtml(b.links)}</div>` : (b.links ? `<div class="note">${linksHtml(b.links).trim()}</div>` : "");
  return `<div class="trow"><div class="top"><span class="name">${esc(b.title)}</span>${badge(bg.kind, bg.label)}</div>${meta}${tags ? `<div class="meta">${tags}</div>` : ""}${note}</div>`;
}

function matchFilter(b: Booking, filter?: { category?: string; status?: string | string[] }): boolean {
  if (!filter) return true;
  if (filter.category && b.category !== filter.category) return false;
  if (filter.status) {
    const allowed = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (!allowed.includes(b.status ?? "idea")) return false;
  }
  return true;
}

function renderDay(d: DayRow): string {
  const f = d.weekday ? { d: fmtDay(d.date).d, w: d.weekday } : fmtDay(d.date);
  const kind = d.kind ?? "default";
  const cls = ["day", kind !== "default" ? kind : ""].filter(Boolean).join(" ");
  const icon = kind === "walk" ? "🚶 " : "📅 ";
  const noteHtml = d.note ? `<div class="bk ${kind === "walk" ? "walk" : ""}">${icon}${inline(d.note)}</div>` : "";
  const sec = d.secondary ? `<div class="cw">↳ ${inline(d.secondary)}</div>` : "";
  return `<div class="${cls}">
      <div class="dt"><div class="d">${esc(f.d)}</div><div class="w">${esc(f.w)}</div></div>
      <div class="body"><div class="prim">${inline(d.primary)}</div>${sec}${noteHtml}</div>
    </div>`;
}

let switcherSeq = 0;

function renderBlock(block: Block, trip: Trip): string {
  switch (block.type) {
    case "lead":
      return `<p class="lead">${inline(block.text)}</p>`;
    case "heading":
      return `<h2 class="sec">${block.num ? `<span class="num">${esc(block.num)}</span>` : ""}${inline(block.text)}</h2>`;
    case "callout":
      return `<div class="callout">${inline(block.text)}</div>`;
    case "checklist":
      return `<ul class="chk">${block.items.map((i) => `<li><span class="box"></span><span>${inline(i)}</span></li>`).join("")}</ul>`;
    case "cards": {
      const wrap = block.priority ? "prio" : "cards";
      const items = block.items
        .map((c) => {
          const bd = c.badge ? badge(c.badgeKind ?? "line", c.badge) : "";
          const body = c.body ? `<p>${inline(c.body)}</p>` : "";
          const meta = c.meta?.length ? `<div class="meta">${c.meta.map((m) => `<span>${inline(m)}</span>`).join("")}</div>` : "";
          const links = c.links?.length ? `<div class="meta"><span>${linksHtml(c.links).trim()}</span></div>` : "";
          return `<div class="card"><h3>${esc(c.title)} ${bd}</h3>${body}${meta}${links}</div>`;
        })
        .join("");
      return `<div class="${wrap}">${items}</div>`;
    }
    case "bookingTable": {
      const rows = block.rows ?? (trip.bookings ?? []).filter((b) => matchFilter(b, block.filter));
      const variant = block.variant ? ` ${block.variant}` : "";
      return `<div class="tbl${variant}">${rows.map(bookingRow).join("")}</div>`;
    }
    case "dayGrid":
      return `<div class="grid">${block.days.map(renderDay).join("")}</div>`;
    case "baseSwitcher": {
      const id = `sw${switcherSeq++}`;
      const buttons = block.bases
        .map((b, i) => `<button class="rt${i === 0 ? " active" : ""}" data-sw="${id}" data-base="${esc(b.id)}">${esc(b.label)}</button>`)
        .join("");
      const panes = block.bases
        .map((b, i) => `<div class="base" data-sw="${id}" data-base="${esc(b.id)}"${i === 0 ? "" : " hidden"}>${b.blocks.map((bl) => renderBlock(bl, trip)).join("")}</div>`)
        .join("");
      return `<div class="switcher"><div class="rts">${buttons}</div>${panes}</div>`;
    }
    default:
      return "";
  }
}

function renderSection(section: Section, idx: number, trip: Trip): string {
  return `<section class="panel${idx === 0 ? " active" : ""}" id="${esc(section.id)}" role="tabpanel">${section.blocks
    .map((b) => renderBlock(b, trip))
    .join("\n")}</section>`;
}

/* ------------------------------ CSS -------------------------------- */

function css(t: ThemeTokens): string {
  return `:root{
  --sand:${t.sand};--sand-deep:${t.sandDeep};--paper:${t.paper};
  --ink:${t.ink};--ink-soft:${t.inkSoft};--ink-faint:${t.inkFaint};
  --clay:${t.accent};--clay-deep:${t.accentDeep};--jungle:${t.secondary};--jungle-deep:${t.secondaryDeep};
  --gold:${t.gold};--gold-soft:${t.goldSoft};
  --line:color-mix(in srgb, ${t.ink} 13%, transparent);--line-soft:color-mix(in srgb, ${t.ink} 7%, transparent);
  --shadow:0 1px 0 rgba(255,255,255,.5) inset,0 6px 22px -12px rgba(0,0,0,.35);--r:${t.radius};
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:"${t.fonts.body.split(":")[0]!.replace(/\+/g, " ")}",system-ui,sans-serif;color:var(--ink);background:var(--sand);line-height:1.5;font-size:16px;-webkit-font-smoothing:antialiased;padding-bottom:40px;background-image:radial-gradient(120% 80% at 100% 0%,color-mix(in srgb,var(--clay) 7%,transparent),transparent 60%),radial-gradient(100% 70% at 0% 8%,color-mix(in srgb,var(--jungle) 8%,transparent),transparent 55%);background-attachment:fixed}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.4;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.035'/%3E%3C/svg%3E")}
.wrap{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:0 16px}
header{padding:26px 0 6px}
.kicker{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--clay);font-weight:600;display:flex;align-items:center;gap:9px}
.kicker::before{content:"";width:26px;height:1.5px;background:var(--clay);display:inline-block}
h1{font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-weight:600;font-size:clamp(30px,8vw,46px);line-height:1.02;margin:10px 0 8px;letter-spacing:-.01em}
h1 em{font-style:italic;color:var(--jungle)}
.sub{color:var(--ink-soft);font-size:15px;max-width:54ch}
nav{position:sticky;top:0;z-index:20;margin:18px -16px 0;padding:10px 16px;background:linear-gradient(var(--sand) 72%,transparent);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
.tabs{display:flex;flex-wrap:wrap;gap:8px;padding-bottom:2px}
.tab{flex:0 0 auto;font-size:14px;font-weight:600;color:var(--ink-soft);background:var(--paper);border:1px solid var(--line);border-radius:100px;padding:8px 15px;cursor:pointer;white-space:nowrap;transition:all .18s ease}
.tab:hover{border-color:var(--clay);color:var(--clay)}
.tab[aria-selected="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
main{padding-top:12px}
.panel{display:none;animation:fade .4s ease both}
.panel.active{display:block}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.panel>*{animation:rise .5s cubic-bezier(.2,.7,.3,1) both}
.panel.active>*:nth-child(1){animation-delay:.02s}.panel.active>*:nth-child(2){animation-delay:.06s}.panel.active>*:nth-child(3){animation-delay:.10s}.panel.active>*:nth-child(4){animation-delay:.14s}.panel.active>*:nth-child(n+5){animation-delay:.18s}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.lead{font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-size:18px;line-height:1.45;color:var(--ink);margin:8px 0 18px}
h2.sec{font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-weight:600;font-size:22px;margin:26px 0 12px;letter-spacing:-.01em;display:flex;align-items:baseline;gap:10px}
h2.sec .num{font-size:13px;font-weight:700;color:var(--clay);letter-spacing:.1em}
.card{background:var(--paper);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin:0 0 12px;box-shadow:var(--shadow)}
.card h3{font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-size:18px;font-weight:600;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.card p{font-size:14.5px;color:var(--ink-soft);margin-top:6px}
.card p b,.card li b,.note b{color:var(--ink);font-weight:600}
a{color:var(--clay-deep);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--clay-deep) 30%,transparent)}
a:hover{border-color:var(--clay-deep)}
.meta{font-size:12.5px;color:var(--ink-faint);margin-top:8px;display:flex;flex-wrap:wrap;gap:6px 14px}
.meta span{display:inline-flex;align-items:center;gap:5px}
.badge{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:100px;display:inline-block;vertical-align:middle;white-space:nowrap}
.b-gold{background:var(--gold-soft);color:color-mix(in srgb,var(--gold) 75%,#000)}
.b-clay{background:color-mix(in srgb,var(--clay) 22%,var(--paper));color:var(--clay-deep)}
.b-jungle{background:color-mix(in srgb,var(--jungle) 22%,var(--paper));color:var(--jungle-deep)}
.b-ink{background:var(--ink);color:var(--paper)}
.b-line{background:transparent;border:1px solid var(--line);color:var(--ink-soft)}
.b-book{background:var(--clay);color:#fff}
.b-booked{background:var(--jungle);color:#fff}
.prio{counter-reset:p}
.prio .card{position:relative;padding-left:50px}
.prio .card::before{counter-increment:p;content:counter(p);position:absolute;left:14px;top:15px;font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-weight:600;color:var(--clay);width:24px;height:24px;border:1.5px solid var(--clay);border-radius:50%;display:grid;place-items:center;font-size:13px}
.chk{list-style:none;display:flex;flex-direction:column;gap:2px;margin-top:6px}
.chk li{display:flex;gap:10px;align-items:flex-start;padding:7px 8px;border-radius:9px;cursor:pointer;font-size:14px;color:var(--ink-soft);transition:background .15s}
.chk li:hover{background:color-mix(in srgb,var(--ink) 4%,transparent)}
.chk .box{flex:0 0 auto;width:18px;height:18px;border:1.6px solid var(--line);border-radius:5px;margin-top:1px;display:grid;place-items:center}
.chk li.done .box{background:var(--jungle);border-color:var(--jungle)}
.chk li.done .box::after{content:"✓";color:#fff;font-size:12px;font-weight:700}
.chk li.done{color:var(--ink-faint);text-decoration:line-through}
.grid{display:flex;flex-direction:column;gap:8px}
.day{display:grid;grid-template-columns:54px 1fr;gap:12px;background:var(--paper);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:11px;padding:11px 13px}
.day.highlight{border-left-color:var(--clay)}
.day .dt .d{font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-size:19px;font-weight:600;line-height:1.05}
.day .dt .w{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-faint);font-weight:700}
.day .body .prim{font-size:14.5px;font-weight:600;color:var(--ink)}
.day .body .cw{font-size:13px;color:var(--ink-soft);margin-top:2px}
.day .body .bk{font-size:11.5px;margin-top:6px;color:var(--clay-deep);font-weight:600}
.day .body .bk.walk{color:var(--jungle-deep)}
.day.rest{opacity:.82}
.day.rest .prim{color:var(--jungle-deep)}
.tbl{display:flex;flex-direction:column;gap:8px}
.trow{background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:12px 14px}
.trow .top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.trow .name{font-family:"${t.fonts.display.split(":")[0]!.replace(/\+/g, " ")}",serif;font-weight:600;font-size:16px}
.trow .note{font-size:13.5px;color:var(--ink-soft);margin-top:5px}
.tbl.dining .trow{border-left:3px solid #c87a52}
.tbl.lodging .trow{border-left:3px solid var(--jungle)}
.tbl.wellness .trow{border-left:3px solid var(--gold)}
.tbl.event .trow{border-left:3px solid #5b8aa0}
.tbl.activity .trow{border-left:3px solid #9a8c70}
.tbl.flight .trow{border-left:3px solid var(--clay)}
.tbl.transport .trow{border-left:3px solid var(--ink-faint)}
.callout{border-left:3px solid var(--gold);background:linear-gradient(90deg,color-mix(in srgb,var(--gold) 8%,transparent),transparent);padding:12px 14px;border-radius:0 11px 11px 0;font-size:14px;color:var(--ink-soft);margin:0 0 12px}
.callout b{color:var(--clay-deep)}
.switcher{margin:0 0 12px}
.rts{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.rt{font-size:12.5px;font-weight:600;color:var(--ink-soft);background:transparent;border:1px solid var(--line);border-radius:100px;padding:7px 13px;cursor:pointer;white-space:nowrap;transition:all .18s}
.rt.active{background:var(--ink);color:var(--paper);border-color:var(--ink)}
@media (min-width:520px){.day{grid-template-columns:64px 1fr}}`;
}

/* --------------------------- entrypoint ---------------------------- */

const SCRIPT = `(function(){
  var tabs=document.querySelectorAll('.tab');
  var panels=document.querySelectorAll('.panel');
  tabs.forEach(function(t){t.addEventListener('click',function(){
    tabs.forEach(function(x){x.setAttribute('aria-selected','false')});
    t.setAttribute('aria-selected','true');
    panels.forEach(function(p){p.classList.remove('active')});
    var el=document.getElementById(t.dataset.p); if(el)el.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  })});
  document.addEventListener('click',function(e){
    var li=e.target.closest && e.target.closest('.chk li'); if(li)li.classList.toggle('done');
  });
  document.querySelectorAll('.rt').forEach(function(b){b.addEventListener('click',function(){
    var sw=b.dataset.sw, base=b.dataset.base;
    document.querySelectorAll('.rt[data-sw="'+sw+'"]').forEach(function(x){x.classList.remove('active')});
    b.classList.add('active');
    document.querySelectorAll('.base[data-sw="'+sw+'"]').forEach(function(p){p.hidden=p.dataset.base!==base});
  })});
})();`;

function fontHref(t: ThemeTokens): string {
  const fams = [t.fonts.display, t.fonts.body, t.fonts.script].filter(Boolean) as string[];
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap`;
}

export interface RenderOptions {
  /** Override the trip's theme. */
  theme?: string;
}

/** Render a Trip to a complete, self-contained HTML document. */
export function renderTrip(trip: Trip, opts: RenderOptions = {}): string {
  switcherSeq = 0;
  const tokens = resolveTheme(opts.theme ?? trip.theme);

  // Ensure section ids are unique + URL-safe.
  const seen = new Set<string>();
  const sections = trip.sections.map((s) => {
    let id = s.id ? slug(s.id) : slug(s.label);
    while (seen.has(id)) id += "-x";
    seen.add(id);
    return { ...s, id };
  });

  const tabsHtml = sections
    .map((s, i) => `<button class="tab" role="tab" aria-selected="${i === 0}" data-p="${s.id}">${esc(s.label)}</button>`)
    .join("");
  const panelsHtml = sections.map((s, i) => renderSection(s, i, trip)).join("\n");

  const dateLine =
    trip.start && trip.end ? `${fmtDay(trip.start).d} – ${fmtDay(trip.end).d}` : "";
  const sub = [trip.subtitle, dateLine].filter(Boolean).join(" · ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(plain(trip.title))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${esc(fontHref(tokens))}" rel="stylesheet">
<style>
${css(tokens)}
</style>
</head>
<body>
<div class="wrap">
<header>
${trip.kicker ? `<div class="kicker">${esc(trip.kicker)}</div>` : ""}
<h1>${inline(trip.title)}</h1>
${sub ? `<p class="sub">${esc(sub)}</p>` : ""}
</header>
<nav><div class="tabs" role="tablist">${tabsHtml}</div></nav>
<main>
${panelsHtml}
</main>
</div>
<script>${SCRIPT}</script>
</body>
</html>`;
}
