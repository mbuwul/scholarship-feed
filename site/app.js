
(() => {
const TYPES = {scholarship:"Scholarships",fellowship:"Fellowships",internship:"Internships",conference:"Funded conferences",call_for_papers:"Calls for papers",grant:"Grants"};
const TYPE1 = {scholarship:"Scholarship",fellowship:"Fellowship",internship:"Internship",conference:"Funded conference",call_for_papers:"Call for papers",grant:"Grant"};
const LEVELS = {undergraduate:"Undergraduate",masters:"Master's",phd:"PhD",postdoc:"Postdoc",professional:"Professional"};
const REGIONS = ["Europe","Asia","North America","Global"];
const WINDOWS = [["","Any time"],["7","Closes within 7 days"],["30","Closes within 30 days"],["90","Closes within 3 months"],["rolling","Rolling deadline"]];
const AFRICA = ["Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Congo (Republic)","Congo (DR)","Côte d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe"];
const HUES = ["#2457D6","#0F766E","#7C3AED","#B45309","#BE123C","#0369A1","#4D7C0F","#9333EA","#C2410C","#1E40AF"];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const FUNDK = {travel_grant:"Travel grant",fee_waiver:"Fee waiver",fully_funded:"Fully funded",partial:"Partial funding"};
const fundTag = o => o.funding === "full" ? `<span class="tag full">Fully funded</span>` : o.funding === "none" ? `<span class="tag nofund">Not funded</span>` : `<span class="tag">${FUNDK[o.funding_kind] || "Partial funding"}</span>`;
const ico = (n, cls="i") => `<svg class="${cls}"><use href="#i-${n}"/></svg>`;
const store = {
  get(k, d){ try { const v = localStorage.getItem("ss:"+k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem("ss:"+k, JSON.stringify(v)); } catch {} }
};
const DAY = 864e5;
const daysLeft = o => {
  if (!o.deadline || o.deadline === "rolling") return null;
  const end = Date.parse(o.deadline + "T23:59:59Z");
  return isNaN(end) ? null : Math.floor((end - Date.now()) / DAY);
};
const isOpen = o => { const d = daysLeft(o); return o.status !== "closed" && o.status !== "duplicate" && (d === null || d >= 0); };
const fmtDate = s => { if (s === "rolling") return "Rolling"; const d = new Date(s + "T12:00:00Z"); return isNaN(d) ? s : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); };
const left = o => {
  const d = daysLeft(o);
  if (d === null) return {t:"Rolling", c:""};
  if (d < 0) return {t:"Closed", c:"past"};
  if (d === 0) return {t:"Closes today", c:"now"};
  if (d === 1) return {t:"1 day left", c:"now"};
  return {t:`${d} days left`, c: d <= 7 ? "soon" : ""};
};
const shareBtn = o => o.link ? `<button class="btn lg" type="button" data-share="${esc(o.link)}" data-title="${esc(o.title)}">Share</button>` : "";
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-share]"); if (!b) return; const u = b.getAttribute("data-share"), t = b.getAttribute("data-title"); if (navigator.share) navigator.share({title: t, url: u}).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => { b.textContent = "Link copied"; setTimeout(() => b.textContent = "Share", 2000); }); else location.href = u; });
const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 6e4); if (!isFinite(m)) return ""; if (m < 1) return "just now"; if (m < 60) return m + " min ago"; if (m < 1440) return Math.round(m/60) + " h ago"; return Math.round(m/1440) + " d ago"; };
const initials = s => (s||"?").replace(/\(.*?\)/g,"").split(/[\s\-]+/).filter(w => /^[A-Z0-9]/.test(w) && !/^(of|the|and|for|at)$/i.test(w)).slice(0,2).map(w => w[0]).join("") || s[0];
const hue = s => { let h = 0; for (const c of s||"") h = (h*31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
let toastT; const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800); };

let ALL = [], meta = null, state = "loading";
const saved = new Set(store.get("saved", []));
const readKeys = new Set(store.get("read", []));
const firstVisit = store.get("lastSeen", null) === null;
const lastSeen = store.get("lastSeen", new Date(Date.now() - 3*DAY).toISOString());
const isNew = o => !firstVisit && o.added_at && o.added_at > lastSeen;

/* ---------- filter state ---------- */
const DEF = {q:"",type:"",regions:[],country:"",levels:[],funding:"",window:"",closed:false,sort:"deadline"};
const visit = {
  get(k, d){ try { const v = sessionStorage.getItem("ss:"+k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { sessionStorage.setItem("ss:"+k, JSON.stringify(v)); } catch {} }
};
try { localStorage.removeItem("ss:filters2"); localStorage.removeItem("ss:admit1"); } catch {}
const F = Object.assign(structuredClone(DEF), visit.get("filters2", {}));
const saveF = () => visit.set("filters2", F);
const PER = 20;
const pgOf = k => Math.max(1, parseInt(new URLSearchParams(location.search).get(k), 10) || 1);
let PG = pgOf("pg"), APG = pgOf("apg");
const pgHref = (k, n) => { const q = new URLSearchParams(location.search); if (n > 1) q.set(k, n); else q.delete(k); const s = q.toString(); return location.pathname + (s ? "?" + s : "") + (k === "apg" ? "#admissions" : location.hash.startsWith("#item=") ? "" : location.hash); };
const setPg = (k, n, push) => { const u = pgHref(k, n); if (u !== location.pathname + location.search + location.hash) history[push ? "pushState" : "replaceState"](history.state, "", u); };
function pager(k, pages, cur){
  if (pages < 2) return "";
  const show = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a,b) => a - b);
  let h = `<nav class="sw-pager" aria-label="Pages">` + (cur > 1 ? `<a class="pg-nav" rel="prev" href="${esc(pgHref(k, cur - 1))}" data-pg="${cur - 1}" aria-label="Previous page">‹<span class="lbl"> Previous</span></a>` : ""), last = 0;
  for (const n of show){ if (n - last > 1) h += `<span class="pg-gap">…</span>`; h += n === cur ? `<span class="pg-n" aria-current="page">${n}</span>` : `<a class="pg-n" href="${esc(pgHref(k, n))}" data-pg="${n}">${n}</a>`; last = n; }
  return h + (cur < pages ? `<a class="pg-nav" rel="next" href="${esc(pgHref(k, cur + 1))}" data-pg="${cur + 1}" aria-label="Next page"><span class="lbl">Next </span>›</a>` : "") + `</nav>`;
}
function page(list, k){
  const pages = Math.max(1, Math.ceil(list.length / PER));
  let cur = k === "pg" ? PG : APG;
  if (cur > pages){ cur = pages; if (k === "pg") PG = cur; else APG = cur; setPg(k, cur, false); }
  return {items: list.slice((cur - 1) * PER, cur * PER), nav: pager(k, pages, cur), cur, pages};
}
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest(".sw-pager a[data-pg]"); if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  const adm = !!a.closest("#a-list"), n = +a.dataset.pg;
  if (adm){ APG = n; setPg("apg", n, true); renderAdmit(); $("#a-list").scrollIntoView({behavior:"smooth", block:"start"}); }
  else { PG = n; setPg("pg", n, true); renderDiscover(); $("#rtitle").scrollIntoView({behavior:"smooth", block:"start"}); }
});
window.addEventListener("popstate", () => { const p = pgOf("pg"), q = pgOf("apg"); if (p !== PG){ PG = p; renderDiscover(); } if (q !== APG){ APG = q; if (!$("#v-admit").hidden) renderAdmit(); } });
function passes(o, skip){
  if (o.status === "duplicate") return false;
  if (!F.closed && !isOpen(o)) return false;
  if (skip !== "type" && F.type && o.type !== F.type) return false;
  if (skip !== "region" && F.regions.length && !F.regions.includes(o.region)) return false;
  if (F.country && o.host_country !== F.country) return false;
  if (skip !== "level" && F.levels.length && !(o.levels||[]).some(l => F.levels.includes(l))) return false;
  if (skip !== "funding" && F.funding && o.funding !== F.funding) return false;
  if (skip !== "window" && F.window){
    const d = daysLeft(o);
    if (F.window === "rolling"){ if (o.deadline !== "rolling") return false; }
    else if (d === null || d < 0 || d > +F.window) return false;
  }
  if (F.q){
    const hay = [o.title,o.provider,o.host_country,o.region,o.eligibility_summary,o.description,(o.fields||[]).join(" "),(o.levels||[]).map(l => LEVELS[l]).join(" "),TYPE1[o.type]].join(" ").toLowerCase();
    if (!F.q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w))) return false;
  }
  return true;
}
const byDeadline = (a,b) => { const k = o => { const d = daysLeft(o); return d === null ? 1e6 : (d < 0 ? 2e6 - d : d); }; return k(a) - k(b); };
function sorted(list){
  if (F.sort === "new") return list.sort((a,b) => (b.added_at||"").localeCompare(a.added_at||"") || byDeadline(a,b));
  if (F.sort === "title") return list.sort((a,b) => a.title.localeCompare(b.title));
  return list.sort(byDeadline);
}
const countBy = (skip, fn) => { const m = {}; for (const o of ALL) if (passes(o, skip)) for (const k of [].concat(fn(o))) m[k] = (m[k]||0) + 1; return m; };

function renderFilters(){
  const rc = countBy("region", o => o.region);
  $("#g-region").innerHTML = REGIONS.map(r => `<label class="opt"><input type="checkbox" value="${r}" ${F.regions.includes(r)?"checked":""}>${r === "Global" ? "Global / online" : r}<span class="n">${rc[r]||0}</span></label>`).join("");
  const lc = countBy("level", o => o.levels||[]);
  $("#g-level").innerHTML = Object.entries(LEVELS).map(([k,v]) => `<label class="opt"><input type="checkbox" value="${k}" ${F.levels.includes(k)?"checked":""}>${v}<span class="n">${lc[k]||0}</span></label>`).join("");
  const fc = countBy("funding", o => o.funding);
  $("#g-funding").innerHTML = [["","Any"],["full","Fully funded"],["partial","Partial funding"],["none","Not funded"]].map(([k,v]) => `<label class="opt"><input type="radio" name="fund" value="${k}" ${F.funding===k?"checked":""}>${v}${k?`<span class="n">${fc[k]||0}</span>`:""}</label>`).join("");
  $("#g-window").innerHTML = WINDOWS.map(([k,v]) => `<label class="opt"><input type="radio" name="win" value="${k}" ${F.window===k?"checked":""}>${v}</label>`).join("");
  const cs = [...new Set(ALL.map(o => o.host_country).filter(Boolean))].sort();
  $("#g-country").innerHTML = `<option value="">All countries</option>` + cs.map(c => `<option ${c===F.country?"selected":""}>${esc(c)}</option>`).join("");
  $("#g-closed").checked = F.closed;
  $("#g-region").querySelectorAll("input").forEach(i => i.onchange = () => { F.regions = [...$("#g-region").querySelectorAll("input:checked")].map(x => x.value); update(); });
  $("#g-level").querySelectorAll("input").forEach(i => i.onchange = () => { F.levels = [...$("#g-level").querySelectorAll("input:checked")].map(x => x.value); update(); });
  $("#g-funding").querySelectorAll("input").forEach(i => i.onchange = () => { F.funding = i.value; update(); });
  $("#g-window").querySelectorAll("input").forEach(i => i.onchange = () => { F.window = i.value; update(); });
}
$("#g-country").onchange = e => { F.country = e.target.value; update(); };
$("#g-closed").onchange = e => { F.closed = e.target.checked; update(); };
$("#sort").onchange = e => { F.sort = e.target.value; update(); };
$("#clear").onclick = () => { Object.assign(F, structuredClone(DEF)); $("#q").value = ""; $("#sort").value = F.sort; update(); };
$("#sform").onsubmit = e => { e.preventDefault(); F.q = $("#q").value.trim(); update(); $("#rtitle").scrollIntoView({behavior:"smooth",block:"start"}); };
$("#q").oninput = e => { F.q = e.target.value.trim(); update(); };
$("#openSide").onclick = () => $("#side").classList.add("open");
$("#closeSide").onclick = $("#applySide").onclick = () => $("#side").classList.remove("open");

function activeChips(){
  const c = [];
  if (F.q) c.push(["q", `“${F.q}”`]);
  if (F.type) c.push(["type", TYPES[F.type]]);
  F.regions.forEach(r => c.push(["region:"+r, r]));
  if (F.country) c.push(["country", F.country]);
  F.levels.forEach(l => c.push(["level:"+l, LEVELS[l]]));
  if (F.funding) c.push(["funding", F.funding === "full" ? "Fully funded" : F.funding === "none" ? "Not funded" : "Partial funding"]);
  if (F.window) c.push(["window", WINDOWS.find(w => w[0] === F.window)[1]]);
  if (F.closed) c.push(["closed", "Including closed"]);
  return c;
}
function removeChip(k){
  const [a,b] = k.split(":");
  if (a === "region") F.regions = F.regions.filter(x => x !== b);
  else if (a === "level") F.levels = F.levels.filter(x => x !== b);
  else if (a === "q"){ F.q = ""; $("#q").value = ""; }
  else if (a === "closed") F.closed = false;
  else F[a] = "";
  update();
}

/* ---------- rows ---------- */
function row(o, extra = "", lead = ""){
  const l = left(o);
  return `<div class="op" role="button" tabindex="0" id="op-${esc(o.id)}" data-open="${esc(o.id)}">
    ${lead || `<div class="mono" style="background:${hue(o.provider)}" aria-hidden="true">${esc(initials(o.provider))}</div>`}
    <div class="mid">
      ${o.link ? `<a class="t" href="${esc(o.link)}" data-ln>${esc(o.title)}</a>` : `<div class="t">${esc(o.title)}</div>`}
      <div class="p"><span>${esc(o.provider)}</span><span class="sep"></span><span>${esc(o.host_country === "Global" ? "Global / online" : o.host_country)}</span><span class="sep"></span><span>${esc(TYPE1[o.type] || o.type)}</span></div>
      <div class="tags">
        ${isNew(o) ? `<span class="tag new">New</span>` : ""}
        ${fundTag(o)}
        ${(o.levels||[]).map(v => `<span class="tag">${esc(LEVELS[v]||v)}</span>`).join("")}
        ${o.verified ? `<span class="tag ok">${ico("check")}Verified</span>` : ""}
      </div>
      ${extra}
    </div>
    <div class="end">
      <div class="dl"><div class="d">${o.deadline === "rolling" ? "No fixed deadline" : "Deadline " + esc(fmtDate(o.deadline))}</div><div class="c ${l.c}">${l.t}</div></div>
      <button class="star" data-save="${esc(o.id)}" aria-pressed="${saved.has(o.id)}" aria-label="${saved.has(o.id) ? "Remove from saved" : "Save"}">${ico("star")}</button>
    </div>
  </div>`;
}
function bindRows(root){
  root.querySelectorAll("[data-save]").forEach(b => b.onclick = e => { e.stopPropagation(); toggleSave(b.dataset.save); });
  root.querySelectorAll("[data-open]").forEach(r => {
    r.onclick = e => { if (e.target.closest("a[data-ln]")) return; const o = ALL.find(x => x.id === r.dataset.open); if (o && o.link) location.href = o.link; else openSheet(r.dataset.open); };
    r.onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); r.click(); } };
  });
}
function toggleSave(id){
  const on = !saved.has(id);
  on ? saved.add(id) : saved.delete(id);
  store.set("saved", [...saved]);
  document.querySelectorAll(`[data-save="${CSS.escape(id)}"]`).forEach(b => { b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", on ? "Remove from saved" : "Save"); });
  $("#savedCount").textContent = saved.size;
  toast(on ? "Saved to your list" : "Removed from saved");
  if (!$("#v-saved").hidden) renderSaved();
  if ($("#sheet").classList.contains("on")) renderSheetFoot(id);
}
function emptyState(kind){
  if (kind === "loading") return `<div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div>`;
  if (kind === "nodb") return emptyState("slow");
  if (kind === "slow") return `<div class="empty"><div class="ei">${ico("clock")}</div><h3>The list can't be reached right now</h3><p>Check your connection. The page keeps trying and fills in as soon as the list arrives.</p></div>`;
  if (kind === "none") return `<div class="empty"><div class="ei">${ico("inbox")}</div><h3>No opportunities yet</h3><p>The first results appear here. New opportunities are added every hour.</p></div>`;
  return `<div class="empty"><div class="ei">${ico("search")}</div><h3>No matches for these filters</h3><p>Try a longer deadline window, another region, or fewer filters.</p><button class="btn" onclick="document.getElementById('clear').click()">Clear all filters</button></div>`;
}

/* ---------- discover ---------- */
function renderDiscover(){
  const open = ALL.filter(isOpen);
  const week = open.filter(o => { const d = daysLeft(o); return d !== null && d <= 7; }).length;
  const countries = new Set(open.map(o => o.host_country).filter(c => c && c !== "Global")).size;
  $("#stats").innerHTML = [
    ["", open.length, "Open opportunities"],
    ["hot", week, "Closing in 7 days"],
    ["", open.filter(o => o.funding === "full").length, "Fully funded"],
    ["", countries, "Host countries"]
  ].map(([c,v,l]) => `<div class="stat ${c}"><span class="v">${state === "ready" ? v : "—"}</span><span class="l">${l}</span></div>`).join("");

  const tc = countBy("type", o => o.type);
  const total = ALL.filter(o => passes(o, "type")).length;
  $("#quick").innerHTML = [["","All",total], ...Object.entries(TYPES).map(([k,v]) => [k,v,tc[k]||0])]
    .map(([k,v,n]) => `<button class="qpill" data-t="${k}" aria-pressed="${F.type===k}">${v}<span class="n">${state==="ready"?n:""}</span></button>`).join("") + `<a class="qpill sw-self" href="#admissions">Self-funded study</a>`;
  $("#quick").querySelectorAll(".qpill").forEach(b => b.onclick = () => { F.type = b.dataset.t; update(); });

  renderFilters();
  const chips = activeChips();
  $("#activeF").innerHTML = chips.map(([k,v]) => `<button class="af" data-k="${esc(k)}" aria-label="Remove filter ${esc(v)}">${esc(v)}${ico("x")}</button>`).join("") + (chips.length ? `<button class="af sw-clear" type="button" onclick="document.getElementById('clear').click()">Clear all</button>` : "");
  $("#activeF").hidden = !chips.length;
  $("#activeF").querySelectorAll(".af[data-k]").forEach(b => b.onclick = () => removeChip(b.dataset.k));
  $("#fcount").textContent = chips.length ? ` · ${chips.length}` : "";
  $("#sort").value = F.sort;

  const list = sorted(ALL.filter(o => passes(o)));
  $("#rtitle").textContent = F.type ? TYPES[F.type] : "All opportunities";
  $("#rsub").textContent = state === "ready" ? `${list.length} ${list.length === 1 ? "result" : "results"}${F.sort === "deadline" ? ", closing soonest first" : ""}` : "";
  const el = $("#list");
  if (state !== "ready") el.innerHTML = emptyState(state);
  else if (!ALL.length) el.innerHTML = emptyState("none");
  else if (!list.length) el.innerHTML = emptyState("nomatch");
  else { const pg = page(list, "pg"); el.innerHTML = pg.items.map(o => row(o)).join("") + pg.nav; if (pg.pages > 1) $("#rsub").textContent += ` · page ${pg.cur} of ${pg.pages}`; }
  bindRows(el);
}
function update(){ if (PG !== 1){ PG = 1; setPg("pg", 1, false); } saveF(); renderDiscover(); }

/* ---------- saved ---------- */
function renderSaved(){
  const list = ALL.filter(o => saved.has(o.id)).sort(byDeadline);
  const el = $("#savedList");
  if (state !== "ready") el.innerHTML = emptyState(state);
  else el.innerHTML = list.length ? list.map(o => row(o)).join("") : `<div class="empty"><div class="ei">${ico("star")}</div><h3>Nothing saved yet</h3><p>Tap the star on any opportunity to keep it here and track its deadline.</p><button class="btn primary" onclick="document.getElementById('t-discover').click()">Browse opportunities</button></div>`;
  bindRows(el);
}

/* ---------- detail sheet ---------- */
let lastFocus = null;
function openSheet(id){
  const o = ALL.find(x => x.id === id); if (!o) return;
  lastFocus = document.activeElement;
  const l = left(o);
  $("#sh-kind").textContent = TYPE1[o.type] || "Opportunity";
  $("#sh-body").innerHTML = `
    ${o.image ? `<img class="sw-cover" src="${esc(o.image)}" alt="${esc(o.title)}" loading="lazy" draggable="false">` : ""}
    <div style="display:flex;gap:14px;align-items:flex-start">
      <div class="mono" style="background:${hue(o.provider)};flex:none">${esc(initials(o.provider))}</div>
      <div style="min-width:0"><h2 id="sh-title">${esc(o.title)}</h2><div class="prov">${esc(o.provider)}</div></div>
    </div>
    <div class="tags">${fundTag(o)}${(o.levels||[]).map(v => `<span class="tag">${esc(LEVELS[v]||v)}</span>`).join("")}${o.verified ? `<span class="tag ok">${ico("check")}Verified on the official page</span>` : ""}</div>
    <div class="facts">
      <div class="fact"><div class="l">Deadline</div><div class="v">${esc(fmtDate(o.deadline))}</div></div>
      <div class="fact"><div class="l">Time left</div><div class="v" style="color:${l.c==="now"?"var(--red)":l.c==="soon"?"var(--amber)":"inherit"}">${l.t}</div></div>
      <div class="fact"><div class="l">Host</div><div class="v">${esc(o.host_country === "Global" ? "Global / online" : o.host_country)}</div></div>
      <div class="fact"><div class="l">Region</div><div class="v">${esc(o.region)}</div></div>
      <div class="fact"><div class="l">Fields</div><div class="v">${esc((o.fields||["any"]).map(f => f === "any" ? "All fields" : f).join(", "))}</div></div>
      <div class="fact"><div class="l">Who can apply</div><div class="v">${esc(o.eligible_nationalities === "all African" ? "African nationals" : Array.isArray(o.eligible_nationalities) ? o.eligible_nationalities.join(", ") : o.eligible_nationalities === "any" ? "All nationalities" : "See official page")}</div></div>
    </div>
    ${o.funding_note ? `<div class="callout${o.funding === "none" ? "" : " good"}"><b>Funding:</b> ${esc(o.funding_note)}</div>` : ""}
    ${o.eligibility_summary ? `<div><h4>In short</h4><p>${esc(o.eligibility_summary)}</p></div>` : ""}
    ${o.link ? `<a class="sw-more" href="${esc(o.link)}">Read the full details</a>` : ""}
    ${o.age_max || o.min_gpa ? `<div class="callout">${o.age_max ? `<b>Age limit:</b> ${o.age_max}. ` : ""}${o.min_gpa ? `<b>Minimum GPA:</b> ${o.min_gpa}/4.0.` : ""}</div>` : ""}
    ${o.verified ? "" : `<div class="callout warn"><b>Not yet verified.</b> We found this on a listing site. Confirm the deadline and eligibility on the official page before you apply. Items are checked against official pages every hour.</div>`}
    <div style="font-size:.8rem;color:var(--muted)">Added ${esc(ago(o.added_at))}${o.source_url && o.source_url !== o.url ? ` · Found via <a href="${esc(o.source_url)}" target="_blank" rel="noopener" style="color:inherit">${esc(new URL(o.source_url).hostname.replace(/^www\./,""))}</a>` : ""}</div>`;
  renderSheetFoot(id);
  $("#sheet").classList.add("on"); $("#scrim").classList.add("on"); $("#sheet").setAttribute("aria-hidden","false");
  setTimeout(() => $("#sh-close").focus(), 50);
}
function renderSheetFoot(id){
  const o = ALL.find(x => x.id === id); if (!o) return;
  $("#sh-foot").innerHTML = `<button class="btn lg" data-save="${esc(o.id)}" aria-pressed="${saved.has(o.id)}">${ico("star")}${saved.has(o.id) ? "Saved" : "Save"}</button>${o.link ? `<a class="btn primary lg" href="${esc(o.link)}">Full details</a>` : ""}${shareBtn(o)}`;
  $("#sh-foot [data-save]").onclick = () => toggleSave(o.id);
}
function closeSheet(){ $("#sheet").classList.remove("on"); $("#scrim").classList.remove("on"); $("#sheet").setAttribute("aria-hidden","true"); lastFocus?.focus?.(); }
$("#sh-close").onclick = closeSheet; $("#scrim").onclick = closeSheet;

/* ---------- notifications ---------- */
let seg = "all";
function buildNotes(){
  const n = [];
  for (const o of ALL){
    if (!isOpen(o)) continue;
    if (isNew(o)) n.push({key:o.id+":new", k:"new", o, t:o.title, s:`New ${(TYPE1[o.type]||"").toLowerCase()} · ${o.host_country} · added ${ago(o.added_at)}`, rank:3 - (Date.now() - Date.parse(o.added_at)) / 1e12, ic:"spark"});
    const d = daysLeft(o);
    if (d !== null && d <= 1) n.push({key:o.id+":d1", k:"d1", o, t:o.title, s:`${d === 0 ? "Closes today" : "Closes tomorrow"} · ${fmtDate(o.deadline)}`, rank:7 - d, ic:"alert"});
    else if (d !== null && d <= 7) n.push({key:o.id+":d7", k:"d7", o, t:o.title, s:`Closes in ${d} days · ${fmtDate(o.deadline)}`, rank:4 + (7-d)/10, ic:"clock"});
  }
  return n.sort((a,b) => b.rank - a.rank);
}
function renderNotes(){
  const all = buildNotes();
  const unread = all.filter(x => !readKeys.has(x.key)).length;
  const b = $("#badge"); b.hidden = !unread; b.textContent = unread > 99 ? "99+" : unread;
  $("#bell").setAttribute("aria-label", unread ? `Notifications, ${unread} unread` : "Notifications");
  const shown = all.filter(x => seg === "all" || (seg === "new" ? x.k === "new" : x.k !== "new"));
  $("#notes").innerHTML = shown.length ? shown.map(x => `<button class="nt ${x.k} ${readKeys.has(x.key) ? "read" : ""}" data-key="${esc(x.key)}" data-id="${esc(x.o.id)}"><span class="ic">${ico(x.ic)}</span><span style="min-width:0"><div class="tt">${esc(x.t)}</div><div class="ss">${esc(x.s)}</div></span><span class="ud"></span></button>`).join("")
    : `<div class="pop-empty">${ico("bell")}<div>You're all caught up.</div><div style="margin-top:4px">New opportunities and deadlines a week or a day away appear here.</div></div>`;
  $("#notes").querySelectorAll(".nt").forEach(el => el.onclick = () => { readKeys.add(el.dataset.key); store.set("read", [...readKeys]); togglePop(false); renderNotes(); openSheet(el.dataset.id); });
}
function togglePop(open){ const p = $("#pop"); p.hidden = open === undefined ? !p.hidden : !open; $("#bell").setAttribute("aria-expanded", !p.hidden); }
$("#bell").onclick = e => { e.stopPropagation(); togglePop(); };
$("#pop").onclick = e => e.stopPropagation();
document.addEventListener("click", () => togglePop(false));
document.addEventListener("keydown", e => { if (e.key === "Escape"){ togglePop(false); closeSheet(); $("#side").classList.remove("open"); } });
$("#seg").querySelectorAll("button").forEach(b => b.onclick = () => { seg = b.dataset.s; $("#seg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); renderNotes(); });
$("#markall").onclick = () => { buildNotes().forEach(x => readKeys.add(x.key)); store.set("read", [...readKeys]); renderNotes(); };
const stamp = () => { if (ALL.length) store.set("lastSeen", new Date().toISOString()); };
window.addEventListener("pagehide", stamp);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") stamp(); });

/* ---------- open admissions (self-funded programmes) ---------- */
const ALEVELS = {bachelor:"Bachelor's", masters:"Master's"};
let ADM = [], admState = "loading";
const ADEF = {q:"",origin:"",lang:"",level:"",field:"",country:"",uni:"",sort:"deadline"};
const A = Object.assign(structuredClone(ADEF), visit.get("admit1", {}));
const saveA = () => visit.set("admit1", A);
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’.]/g, "");
const qwords = q => norm(q).split(/[\s,/]+/).filter(w => w && !/^(in|of|and|the|degree|programme|program)$/.test(w));
const admOpen = o => { if (o.status === "closed" || o.status === "duplicate") return false; if (o.deadline === "rolling") return true; const d = daysLeft(o); return d !== null && d >= 0; };
const placeOf = o => [o.city && o.city !== o.program_country ? o.city : "", o.program_country].filter(Boolean).join(", ");
const originNotes = (o, c) => (o.origin_notes || []).filter(n => !n.countries || !n.countries.length || n.countries.includes(c)).map(n => n.note);
const admHay = o => norm([o.title, o.university, o.city, o.program_country, (o.degree_names||[]).join(" "), (o.fields||[]).join(" "), (o.levels||[]).map(l => ALEVELS[l] + " " + l).join(" "), (o.languages||[]).join(" "), o.description].join(" "));
function admPass(o, skip){
  if (!admOpen(o)) return false;
  if (A.origin){
    if (Array.isArray(o.open_to) && o.open_to.length && !o.open_to.includes(A.origin)) return false;
    if ((o.closed_to || []).includes(A.origin)) return false;
  }
  if (skip !== "lang" && A.lang && !(o.languages||[]).includes(A.lang)) return false;
  if (skip !== "level" && A.level && !(o.levels||[]).includes(A.level)) return false;
  if (skip !== "field" && A.field && !(o.fields||[]).includes(A.field)) return false;
  if (skip !== "country" && A.country && o.program_country !== A.country) return false;
  if (skip !== "uni" && A.uni && o.university !== A.uni) return false;
  if (A.q){ const h = admHay(o); if (!qwords(A.q).every(w => h.includes(w))) return false; }
  return true;
}
const opts = (list, cur, all, label = x => x) => `<option value="">${all}</option>` + list.map(v => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label(v))}</option>`).join("");
const uniq = (skip, fn) => [...new Set(ADM.filter(o => admPass(o, skip)).flatMap(o => [].concat(fn(o) || [])).filter(Boolean))].sort((a,b) => a.localeCompare(b));
function renderAdmFilters(){
  $("#a-origin").innerHTML = opts(AFRICA, A.origin, "Any country");
  $("#a-lang").innerHTML = opts(uniq("lang", o => o.languages), A.lang, "Any language");
  $("#a-level").innerHTML = opts(Object.keys(ALEVELS).filter(k => uniq("level", o => o.levels).includes(k) || A.level === k), A.level, "Bachelor's or Master's", k => ALEVELS[k]);
  $("#a-field").innerHTML = opts(uniq("field", o => o.fields), A.field, "Any field");
  $("#a-country").innerHTML = opts(uniq("country", o => o.program_country), A.country, "Any country");
  $("#a-uni").innerHTML = opts(uniq("uni", o => o.university), A.uni, "Any university");
}
["origin","lang","level","field","country","uni"].forEach(k => $("#a-" + k).onchange = e => { A[k] = e.target.value; if (k === "country") A.uni = ""; updAdm(); });
$("#aform").onsubmit = e => { e.preventDefault(); A.q = $("#a-q").value.trim(); updAdm(); $("#a-list").scrollIntoView({behavior:"smooth", block:"start"}); };
$("#a-q").oninput = e => { A.q = e.target.value.trim(); updAdm(); };
$("#a-sort").onchange = e => { A.sort = e.target.value; updAdm(); };
$("#a-clear").onclick = () => { Object.assign(A, structuredClone(ADEF)); $("#a-q").value = ""; updAdm(); };
const ACHIP = {q:v => `“${v}”`, origin:v => "From " + v, lang:v => "Taught in " + v, level:v => ALEVELS[v], field:v => v, country:v => "In " + v, uni:v => v};
function admRow(o){
  const l = left(o);
  const notes = A.origin ? originNotes(o, A.origin) : [];
  const ws = A.q ? qwords(A.q) : [];
  const hits = ws.length && (o.degree_names||[]).length > 1 ? o.degree_names.filter(n => ws.every(w => norm(n).includes(w))).slice(0,4) : [];
  return `<div class="op" role="button" tabindex="0" data-adm="${esc(o.id)}">
    <div class="mono" style="background:${hue(o.university)}" aria-hidden="true">${esc(initials(o.university))}</div>
    <div class="mid">
      ${o.link ? `<a class="t" href="${esc(o.link)}" data-ln>${esc(o.title)}</a>` : `<div class="t">${esc(o.title)}</div>`}
      <div class="p"><span>${esc(o.university)}</span><span class="sep"></span><span>${esc(placeOf(o))}</span>${o.intake ? `<span class="sep"></span><span>${esc(o.intake)}</span>` : ""}</div>
      <div class="tags">
        ${isNew(o) ? `<span class="tag new">New</span>` : ""}
        ${o.opens && Date.parse(o.opens + "T00:00:00Z") > Date.now() ? `<span class="tag" style="color:var(--amber);background:var(--amber-soft);border-color:transparent">Applications open ${esc(fmtDate(o.opens))}</span>` : ""}
        ${(o.levels||[]).map(v => `<span class="tag">${esc(ALEVELS[v]||v)}</span>`).join("")}
        ${(o.languages||[]).map(v => `<span class="tag">Taught in ${esc(v)}</span>`).join("")}
        ${o.financial_aid ? `<span class="tag full">Financial aid available</span>` : ""}
        ${o.verified ? `<span class="tag ok">${ico("check")}From the official site</span>` : ""}
      </div>
      ${hits.length ? `<div class="match"><span class="ok">Includes ${hits.map(esc).join(" · ")}</span></div>` : ""}
      ${notes.length ? `<div class="match"><span class="warn">! ${esc(notes[0])}</span></div>` : ""}
    </div>
    <div class="end"><div class="dl"><div class="d">${o.deadline === "rolling" ? "Rolling admission" : "Closes " + esc(fmtDate(o.deadline))}</div><div class="c ${l.c}">${o.deadline === "rolling" ? "Open now" : l.t}</div></div></div>
  </div>`;
}
function renderAdmit(){
  renderAdmFilters();
  if ($("#a-q").value.trim() !== A.q) $("#a-q").value = A.q; $("#a-sort").value = A.sort;
  const chips = Object.keys(ACHIP).filter(k => A[k]).map(k => [k, ACHIP[k](A[k])]);
  $("#a-chips").innerHTML = chips.map(([k,v]) => `<button class="af" data-k="${k}" aria-label="Remove ${esc(v)}">${esc(v)}${ico("x")}</button>`).join("");
  if (chips.length) $("#a-chips").innerHTML += `<button class="af sw-clear" type="button" onclick="document.getElementById('a-clear').click()">Clear all</button>`;
  $("#a-chips").hidden = !chips.length;
  $("#a-chips").querySelectorAll(".af[data-k]").forEach(b => b.onclick = () => { A[b.dataset.k] = ""; updAdm(); });
  $("#a-sub").textContent = A.sort === "deadline" ? "Closing soonest first" : A.sort === "uni" ? "By university" : "Most recently added first";
  let list = ADM.filter(o => admPass(o));
  if (A.sort === "uni") list.sort((a,b) => a.university.localeCompare(b.university) || a.title.localeCompare(b.title));
  else if (A.sort === "new") list.sort((a,b) => (b.added_at||"").localeCompare(a.added_at||"") || byDeadline(a,b));
  else list.sort((a,b) => byDeadline(a,b) || a.university.localeCompare(b.university));
  const el = $("#a-list");
  if (admState !== "ready") el.innerHTML = emptyState(admState);
  else if (!ADM.some(admOpen)) el.innerHTML = `<div class="empty"><div class="ei">${ico("school")}</div><h3>Open admissions are being gathered</h3><p>Programmes appear here as they are read from official university sites. The list is refreshed every hour.</p></div>`;
  else if (list.length){ const pg = page(list, "apg"); el.innerHTML = pg.items.map(admRow).join("") + pg.nav; }
  else el.innerHTML = `<div class="empty"><div class="ei">${ico("search")}</div><h3>No open programmes match yet</h3><p>Try a shorter degree name, such as "computer science" instead of "MSc in Computer Science", or remove a filter. New programmes are added every hour.</p><button class="btn" onclick="document.getElementById('a-clear').click()">Clear search</button></div>`;
  el.querySelectorAll("[data-adm]").forEach(r => {
    r.onclick = e => { if (e.target.closest("a[data-ln]")) return; const o = ADM.find(x => x.id === r.dataset.adm); if (o && o.link) location.href = o.link; else openAdm(r.dataset.adm); };
    r.onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); r.click(); } };
  });
}
function updAdm(){ if (APG !== 1){ APG = 1; setPg("apg", 1, false); } saveA(); renderAdmit(); }
function openAdm(id){
  const o = ADM.find(x => x.id === id); if (!o) return;
  lastFocus = document.activeElement;
  const l = left(o);
  const ws = A.q ? qwords(A.q) : [];
  const progs = o.degree_names || [];
  const notes = (o.origin_notes || []);
  const who = Array.isArray(o.open_to) && o.open_to.length ? "Nationals of " + o.open_to.join(", ") : "Applicants of any nationality";
  const fact = (k, v) => `<div class="fact"><div class="l">${k}</div><div class="v">${v ? esc(v) : `<span style="color:var(--muted)">See official page</span>`}</div></div>`;
  $("#sh-kind").textContent = "Open admission";
  $("#sh-body").innerHTML = `
    ${o.image ? `<img class="sw-cover" src="${esc(o.image)}" alt="${esc(o.title)}" loading="lazy" draggable="false">` : ""}
    <div style="display:flex;gap:14px;align-items:flex-start">
      <div class="mono" style="background:${hue(o.university)};flex:none">${esc(initials(o.university))}</div>
      <div style="min-width:0"><h2 id="sh-title">${esc(o.title)}</h2><div class="prov">${esc(o.university)} · ${esc(placeOf(o))}</div></div>
    </div>
    <div class="tags">${(o.levels||[]).map(v => `<span class="tag">${esc(ALEVELS[v]||v)}</span>`).join("")}${(o.fields||[]).map(v => `<span class="tag">${esc(v)}</span>`).join("")}${o.financial_aid ? `<span class="tag full">Financial aid available</span>` : ""}${o.verified ? `<span class="tag ok">${ico("check")}Read from the official site</span>` : ""}</div>
    <div class="facts">
      ${fact("Closing date", o.deadline === "rolling" ? "Rolling" : fmtDate(o.deadline))}
      <div class="fact"><div class="l">Time left</div><div class="v" style="color:${l.c==="now"?"var(--red)":l.c==="soon"?"var(--amber)":"inherit"}">${o.deadline === "rolling" ? "Open now" : l.t}</div></div>
      ${fact("Intake", o.intake)}
      ${fact("Applications opened", o.opens ? fmtDate(o.opens) : "")}
      ${fact("Language", (o.languages||[]).join(", "))}
      ${fact("Duration", o.duration)}
      ${fact("Tuition (international)", o.tuition)}
      ${fact("Application fee", o.application_fee)}
    </div>
    ${o.deadline_note ? `<div class="callout"><b>Other dates:</b> ${esc(o.deadline_note)}</div>` : ""}
    ${o.summary ? `<div><h4>In short</h4><p>${esc(o.summary)}</p></div>` : ""}
    ${progs.length > 1 ? `<div><h4>Programmes in this admission round</h4><div class="chips">${progs.map(n => `<span class="tag ${ws.length && ws.every(w => norm(n).includes(w)) ? "hit" : ""}">${esc(n)}</span>`).join("")}</div></div>` : ""}
    <div><h4>Eligibility requirements</h4>${(o.requirements||[]).length ? `<ul class="reqs">${o.requirements.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : `<p>The full entry requirements are in the article.</p>`}</div>
    <div><h4>Who can apply</h4><p>${esc(who)}${(o.closed_to||[]).length ? `, except ${esc(o.closed_to.join(", "))}` : ""}.</p>
      ${notes.map(n => `<div class="callout ${A.origin && n.countries && n.countries.includes(A.origin) ? "warn" : ""}" style="margin-top:8px">${n.countries && n.countries.length ? `<b>${esc(n.countries.length > 6 ? "Applicants from " + n.countries.slice(0,6).join(", ") + " and others" : "Applicants from " + n.countries.join(", "))}:</b> ` : ""}${esc(n.note)}</div>`).join("")}</div>
    <div><h4>Financial aid</h4>${o.financial_aid ? `<div class="callout good">This programme offers financial aid. The full article explains who qualifies and how to ask for it.</div>` : `<p>The official page lists no financial aid for this programme. This is a self-funded option: check the university's scholarship page, or the Discover tab for outside funding.</p>`}</div>
    ${o.verified ? "" : `<div class="callout warn"><b>Not yet checked against the official page.</b> Confirm the closing date and requirements on the university site before you apply.</div>`}
    ${o.link ? `<a class="sw-more" href="${esc(o.link)}">Read the full details</a>` : ""}
    <div style="font-size:.8rem;color:var(--muted)">Added ${esc(ago(o.added_at))}${o.last_seen_at ? ` · Checked ${esc(ago(o.last_seen_at))}` : ""}${o.source_url && o.source_url !== o.url ? ` · Dates from <a href="${esc(o.source_url)}" target="_blank" rel="noopener" style="color:inherit">${esc(new URL(o.source_url).hostname.replace(/^www\./,""))}</a>` : ""}</div>`;
  $("#sh-foot").innerHTML = `${o.link ? `<a class="btn primary lg" href="${esc(o.link)}">Full details</a>` : ""}${shareBtn(o)}`;
  $("#sheet").classList.add("on"); $("#scrim").classList.add("on"); $("#sheet").setAttribute("aria-hidden","false");
  setTimeout(() => $("#sh-close").focus(), 50);
}

/* ---------- views ---------- */
const VIEWS = {discover:"#v-discover", admit:"#v-admit", elig:"#v-elig", saved:"#v-saved"};
const HASH = {discover:"", admit:"#admissions", elig:"#eligibility", saved:"#saved"};
function show(v){
  for (const [k, sel] of Object.entries(VIEWS)) $(sel).hidden = k !== v;
  for (const k of Object.keys(VIEWS)) $("#t-" + k).setAttribute("aria-selected", v === k);
  const h = HASH[v];
  if (location.hash !== h) history.replaceState(null, "", h || location.pathname + location.search);
  if (v === "saved") renderSaved();
  if (v === "admit") renderAdmit();
  window.scrollTo({top:0});
}
$("#t-discover").onclick = $("#home").onclick = () => show("discover");
$("#t-admit").onclick = () => show("admit");
$("#t-elig").onclick = () => show("elig");
$("#t-saved").onclick = () => show("saved");
const fromHash = () => { if (location.hash.startsWith("#item=")) return openFromHash(); show(Object.keys(HASH).find(k => HASH[k] && HASH[k] === location.hash) || "discover"); };
function openFromHash(){
  if (!location.hash.startsWith("#item=")) return;
  const id = decodeURIComponent(location.hash.slice(6));
  const hit = ALL.find(x => x.id === id) || ADM.find(x => x.id === id); if (hit && hit.link) { location.replace(hit.link); return; }
  if (ALL.some(x => x.id === id)) { show("discover"); openSheet(id); }
  else if (ADM.some(x => x.id === id)) { show("admit"); openAdm(id); }
}
window.addEventListener("hashchange", fromHash);

/* ---------- eligibility wizard ---------- */
const P = Object.assign({nat:"",age:"",gpa:"",level:"",field:"",regions:[...REGIONS],types:Object.keys(TYPES),full:false}, store.get("profile2", {}));
let step = 1, done = false;
const STEPNAMES = ["About you","Your studies","Preferences"];
function buildWizard(){
  $("#e-nat").insertAdjacentHTML("beforeend", AFRICA.map(c => `<option>${esc(c)}</option>`).join(""));
  $("#e-level").innerHTML = Object.entries(LEVELS).map(([k,v]) => `<label><input type="radio" name="lvl" value="${k}" id="lv-${k}">${v}</label>`).join("");
  $("#e-regions").innerHTML = REGIONS.map(r => `<label><input type="checkbox" value="${r}" id="rg-${r.replace(/\s/g,"")}">${r === "Global" ? "Global / online" : r}</label>`).join("");
  $("#e-types").innerHTML = Object.entries(TYPES).map(([k,v]) => `<label><input type="checkbox" value="${k}" id="ty-${k}">${v}</label>`).join("");
  $("#e-nat").value = P.nat; $("#e-age").value = P.age; $("#e-gpa").value = P.gpa; $("#e-field").value = P.field; $("#e-full").checked = P.full;
  $("#e-level").querySelectorAll("input").forEach(i => i.checked = i.value === P.level);
  $("#e-regions").querySelectorAll("input").forEach(i => i.checked = P.regions.includes(i.value));
  $("#e-types").querySelectorAll("input").forEach(i => i.checked = P.types.includes(i.value));
  $("#wback").onclick = () => { step--; paintStep(); };
  $("#wiz").onsubmit = e => {
    e.preventDefault(); $("#werr").textContent = "";
    if (step === 1){ if (!$("#e-nat").value){ $("#werr").textContent = "Choose your nationality to continue."; return; } }
    if (step === 2){ if (!$("#e-level").querySelector("input:checked")){ $("#werr").textContent = "Choose the level you're applying for."; return; } }
    if (step === 3){
      if (!$("#e-regions").querySelector("input:checked") || !$("#e-types").querySelector("input:checked")){ $("#werr").textContent = "Pick at least one region and one category."; return; }
    }
    collect();
    if (step < 3){ step++; paintStep(); return; }
    done = true; renderMatches(); toast("Matches updated");
    if (matchMedia("(max-width:960px)").matches) $("#eres").scrollIntoView({behavior:"smooth",block:"start"});
  };
  paintStep();
}
function collect(){
  P.nat = $("#e-nat").value; P.age = $("#e-age").value; P.gpa = $("#e-gpa").value;
  P.level = $("#e-level").querySelector("input:checked")?.value || ""; P.field = $("#e-field").value.trim();
  P.regions = [...$("#e-regions").querySelectorAll("input:checked")].map(i => i.value);
  P.types = [...$("#e-types").querySelectorAll("input:checked")].map(i => i.value);
  P.full = $("#e-full").checked; store.set("profile2", P);
}
function paintStep(){
  [1,2,3].forEach(n => $("#wb"+n).hidden = n !== step);
  $("#steps").querySelectorAll("span").forEach((s,i) => s.classList.toggle("on", i < step));
  $("#steplabel").textContent = `Step ${step} of 3 · ${STEPNAMES[step-1]}`;
  $("#wback").hidden = step === 1;
  $("#wnext").textContent = step === 3 ? "Show my matches" : "Continue";
}
function assess(o){
  if (!isOpen(o) || !P.types.includes(o.type) || !P.regions.includes(o.region)) return null;
  if (P.full && o.funding !== "full") return null;
  if (P.level && !(o.levels||[]).includes(P.level)) return null;
  const n = o.eligible_nationalities;
  if (Array.isArray(n) && !n.includes(P.nat)) return null;
  if (P.age && o.age_max && +P.age > o.age_max) return null;
  if (P.gpa && o.min_gpa && +P.gpa < o.min_gpa) return null;
  const ok = [`${LEVELS[P.level]} level`], warn = [];
  let pts = 60;
  const fields = (o.fields||["any"]).map(x => x.toLowerCase());
  if (P.field){
    const f = P.field.toLowerCase();
    if (fields.includes("any")) { ok.push("Open to all fields"); pts += 8; }
    else if (fields.some(x => f.includes(x) || x.includes(f)) || (o.title + " " + o.eligibility_summary).toLowerCase().includes(f)) { ok.push(`Covers ${P.field}`); pts += 15; }
    else return null;
  } else if (fields.includes("any")) pts += 8;
  if (n === "all African" || (Array.isArray(n) && n.includes(P.nat)) || /afric/i.test(o.title + " " + o.eligibility_summary)) { ok.push("Aimed at African applicants"); pts += 15; }
  if (o.funding === "full") { ok.push("Fully funded"); pts += 7; }
  if (o.verified) pts += 5; else warn.push("Confirm details on the official page");
  if (o.age_max && !P.age) warn.push(`Age limit ${o.age_max}`);
  if (o.min_gpa && !P.gpa) warn.push(`Minimum GPA ${o.min_gpa}`);
  if (!n || n === "any") warn.push("Check nationality rules");
  return {ok, warn, pts: Math.min(98, pts)};
}
function renderMatches(){
  const el = $("#eres");
  if (!done){
    el.innerHTML = `<div class="intro"><h2>See what you qualify for</h2><p style="margin:0;color:var(--fg-2)">Answer a few questions and we'll check every open opportunity against your profile. Each match shows why it fits and what to confirm before you apply.</p>
      <ol><li>Tell us your nationality, and optionally your age and GPA.</li><li>Pick your study level and field.</li><li>Choose the regions and kinds of opportunity you want.</li></ol>
      ${state === "ready" ? `<p style="margin:16px 0 0;color:var(--muted);font-size:.88rem"><span class="num">${ALL.filter(isOpen).length}</span> open opportunities to check against.</p>` : ""}</div>`;
    return;
  }
  if (state !== "ready"){ el.innerHTML = emptyState(state); return; }
  const hits = ALL.map(o => ({o, a: assess(o)})).filter(x => x.a).sort((x,y) => (y.a.pts - x.a.pts) || byDeadline(x.o, y.o));
  el.innerHTML = `<div class="res-h"><h2>${hits.length} ${hits.length === 1 ? "match" : "matches"} for you</h2><p>${esc(LEVELS[P.level])} applicant from ${esc(P.nat)}${P.field ? ` in ${esc(P.field)}` : ""}. Best fit first.</p></div>
    <div class="list">${hits.length ? hits.map(({o,a}) => row(o, `<div class="match"><span class="ok">✓ ${a.ok.map(esc).join(" · ")}</span>${a.warn.length ? `<span class="warn">! ${a.warn.map(esc).join(" · ")}</span>` : ""}</div>`, `<div class="score" style="--p:${a.pts}" title="Match score ${a.pts}%"><i>${a.pts}%</i></div>`)).join("")
      : `<div class="empty"><div class="ei">${ico("search")}</div><h3>No matches yet</h3><p>Try more regions or categories, leave the field blank, or untick "Only show fully funded". New opportunities arrive every hour.</p></div>`}</div>`;
  bindRows(el);
}

/* ---------- boot ---------- */
function setLive(){
  const t = meta?.last_run_at;
  $("#liveText").textContent = state === "ready" ? (t ? `Updated ${ago(t)}` : "Live list") : state === "nodb" ? "Sign in to load" : "Connecting…";
}
function renderAll(){ renderDiscover(); renderNotes(); renderMatches(); if (!$("#v-saved").hidden) renderSaved(); if (!$("#v-admit").hidden) renderAdmit(); $("#savedCount").textContent = saved.size; setLive(); }
$("#q").value = F.q;
buildWizard(); fromHash(); renderAll();

(async () => {
  const SW = window.SW || {};
  const load = async () => {
    try {
      const r = await fetch(SW.api, {headers: {Accept: "application/json"}});
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      ALL = (d.opportunities || []).filter(o => o.status !== "duplicate");
      ADM = (d.admissions || []).filter(o => o.status !== "duplicate" && o.university && o.title);
      meta = d.status || null;
      state = "ready"; admState = "ready"; renderAll();
      if (!$("#v-admit").hidden) renderAdmit();
      openFromHash();
    } catch (e) {
      if (!ALL.length){ state = "slow"; admState = "slow"; renderAll(); }
    }
  };
  await load();
  setInterval(load, 15 * 60000);
  setInterval(setLive, 60000);
})();
})();

(function(){var b=document.getElementById("swBurger"),bar=b&&b.closest(".appbar");if(!b)return;var s=document.createElement("div");s.className="sw-scrim";document.body.appendChild(s);
function set(o){bar.classList.toggle("sw-open",o);document.body.classList.toggle("sw-menu-open",o);b.setAttribute("aria-expanded",o?"true":"false");}
b.addEventListener("click",function(){set(!bar.classList.contains("sw-open"));});s.addEventListener("click",function(){set(false);});
document.querySelectorAll("#swNav [role=tab], #swNav a").forEach(function(x){x.addEventListener("click",function(){set(false);});});})();
