/* Scholarship Scout embed. Paste on any page:
   <div id="scholarship-scout"></div>
   <script src="https://YOUR-FEED-HOST/widget.js" data-feed="https://YOUR-FEED-HOST/opportunities.json"></script>
   Optional: data-target="other-element-id", data-limit="30" (items per page). */
(function () {
  var me = document.currentScript;
  var feedUrl = (me && me.getAttribute("data-feed")) || (me ? me.src.replace(/[^/]*$/, "") + "opportunities.json" : "opportunities.json");
  var target = document.getElementById((me && me.getAttribute("data-target")) || "scholarship-scout");
  if (!target) { target = document.createElement("div"); me.parentNode.insertBefore(target, me); }
  var pageSize = parseInt((me && me.getAttribute("data-limit")) || "30", 10);
  var root = target.attachShadow ? target.attachShadow({ mode: "open" }) : target;
  var LABEL = { scholarship: "Scholarship", fellowship: "Fellowship", internship: "Internship", conference: "Funded conference", call_for_papers: "Call for papers", grant: "Grant" };
  root.innerHTML =
    '<style>' +
    ':host{all:initial;display:block}' +
    '.ss{--bg:#fff;--fg:#1d2026;--mut:#5f6673;--line:#e3e5ea;--acc:#0b6e4f;--chip:#f2f4f6;--warn:#b54708;--hot:#c4320a;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--fg);background:var(--bg)}' +
    '@media (prefers-color-scheme:dark){.ss.auto{--bg:#15171b;--fg:#e8eaee;--mut:#a0a7b4;--line:#2c3038;--acc:#4cc38a;--chip:#22252b;--warn:#f79009;--hot:#ff6a3d}}' +
    '.bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}' +
    '.bar input,.bar select{font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;min-width:0}' +
    '.bar input{flex:1 1 220px}.bar select{flex:0 1 auto}' +
    '.meta{color:var(--mut);font-size:13px;margin-bottom:8px}' +
    '.card{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:10px}' +
    '.t{font-weight:600;color:var(--fg);text-decoration:none}.t:hover{color:var(--acc);text-decoration:underline}' +
    '.p{color:var(--mut);font-size:13px}.s{margin:6px 0 8px;font-size:14px}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px}.c{background:var(--chip);border-radius:999px;padding:2px 9px;font-size:12px}' +
    '.d{font-weight:600}.soon{color:var(--warn)}.urgent{color:var(--hot)}.new{background:var(--acc);color:var(--bg)}' +
    '.more{font:inherit;border:1px solid var(--line);background:var(--chip);color:var(--fg);border-radius:8px;padding:8px 14px;cursor:pointer;width:100%}' +
    '</style>' +
    '<div class="ss auto"><div class="bar">' +
    '<input id="q" type="search" placeholder="Search title, provider, field">' +
    '<select id="type"><option value="">All categories</option></select>' +
    '<select id="region"><option value="">All regions</option></select>' +
    '<select id="country"><option value="">All countries</option></select>' +
    '<select id="level"><option value="">All levels</option></select>' +
    '</div><div class="meta" id="meta">Loading opportunities…</div><div id="list"></div><button class="more" id="more" hidden>Show more</button></div>';
  var $ = function (id) { return root.getElementById ? root.getElementById(id) : root.querySelector("#" + id); };
  var all = [], shown = pageSize;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fill(sel, vals, fmt) { vals.sort().forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = fmt ? fmt(v) : v; sel.appendChild(o); }); }
  function uniq(fn) { var m = {}; all.forEach(function (x) { [].concat(fn(x) || []).forEach(function (v) { if (v) m[v] = 1; }); }); return Object.keys(m); }
  function days(d) { return Math.round((new Date(d + "T23:59:59Z") - Date.now()) / 864e5); }
  function render() {
    var q = $("q").value.toLowerCase().trim(), ty = $("type").value, rg = $("region").value, co = $("country").value, lv = $("level").value;
    var rows = all.filter(function (x) {
      if (ty && x.type !== ty) return false;
      if (rg && x.region !== rg) return false;
      if (co && x.host_country !== co) return false;
      if (lv && (x.levels || []).indexOf(lv) < 0) return false;
      if (q && [x.title, x.provider, x.host_country, (x.fields || []).join(" "), x.eligibility_summary].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    $("meta").textContent = rows.length + " open opportunities" + (feedUpdated ? " · updated " + new Date(feedUpdated).toLocaleString() : "");
    $("list").innerHTML = rows.slice(0, shown).map(function (x) {
      var n = days(x.deadline), cls = n <= 1 ? "urgent" : n <= 7 ? "soon" : "";
      var when = n <= 0 ? "Closes today" : n === 1 ? "Closes tomorrow" : n <= 7 ? n + " days left" : "Deadline " + new Date(x.deadline + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      var isNew = x.added_at && (Date.now() - new Date(x.added_at)) < 3 * 864e5;
      return '<div class="card"><a class="t" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a>' +
        '<div class="p">' + esc(x.provider) + ' · ' + esc(x.host_country) + '</div>' +
        (x.eligibility_summary ? '<div class="s">' + esc(x.eligibility_summary) + '</div>' : '') +
        '<div class="chips">' + (isNew ? '<span class="c new">New</span>' : '') +
        '<span class="c d ' + cls + '">' + esc(when) + '</span>' +
        '<span class="c">' + esc(LABEL[x.type] || x.type) + '</span>' +
        (x.funding ? '<span class="c">' + esc(x.funding === "full" ? "Fully funded" : x.funding === "partial" ? "Partially funded" : x.funding) + '</span>' : '') +
        ((x.levels || []).length ? '<span class="c">' + esc(x.levels.join(", ")) + '</span>' : '') + '</div></div>';
    }).join("") || '<div class="meta">No opportunities match these filters.</div>';
    $("more").hidden = rows.length <= shown;
  }
  var feedUpdated = null;
  fetch(feedUrl, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (f) {
    feedUpdated = f.updated_at; all = f.opportunities || [];
    fill($("type"), uniq(function (x) { return x.type; }), function (v) { return LABEL[v] || v; });
    fill($("region"), uniq(function (x) { return x.region; }));
    fill($("country"), uniq(function (x) { return x.host_country; }));
    fill($("level"), uniq(function (x) { return x.levels; }));
    ["q", "type", "region", "country", "level"].forEach(function (id) { $(id).addEventListener("input", function () { shown = pageSize; render(); }); });
    $("more").addEventListener("click", function () { shown += pageSize; render(); });
    render();
  }).catch(function () { $("meta").textContent = "Could not load opportunities right now."; });
})();
