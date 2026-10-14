//# Panel below the map: tabs instead of one long list (issue #108).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- network panel (issue #108) ----------
  // Overview (mesh health and the most important points), hints, devices (one sortable table), links, changes.
  // All tabs are rendered, only the chosen one is shown – the tab bar shows counters, the change log is updated live.
  // Tapping a factor or a link marks the devices on the map (like the search).
  const TABS = ["overview", "hints", "devices", "links", "changes"];
  let tab = TABS.includes(prefs.get("tab")) ? prefs.get("tab") : "overview";
  let devSort = { key: "role", dir: 1 }, devFilter = "all";
  if (prefs.get("changesSeen") === null) prefs.set("changesSeen", Date.now());   // first start: old entries are not "new"
  function setTab(t) {
    tab = t; prefs.set("tab", t);
    if (t === "changes") prefs.set("changesSeen", Date.now());
    for (const x of TABS) { const p = $("tab-" + x); if (p) p.hidden = x !== t; }
    renderTabBar();
  }
  function renderTabBar() {
    const bar = $("tabbar"); if (!bar) return;
    if (tab === "changes" && $("panel").hidden) prefs.set("changesSeen", Date.now());
    const seen = prefs.get("changesSeen") || 0, fresh = changes.filter(c => c.t > seen).length;
    const count = { hints: hintCount, changes: fresh };
    bar.innerHTML = TABS.map(t => `<button role="tab" data-tab="${t}" aria-selected="${t === tab}"${t === tab ? ' class="on"' : ""}>${T.tabNames[t]}` +
      (count[t] ? `<span class="cnt${t === "changes" ? " new" : ""}">${count[t] > 99 ? "99+" : count[t]}</span>` : "") + `</button>`).join("");
  }
  // all warnings and hints, warnings first – the same as in the detail panels
  function allHints() {
    const out = [];
    for (const n of Object.values(nodeById)) {
      for (const w of warningsOf(n)) out.push({ id: n.id, text: w, warn: true });
      for (const h of (hintsOf[n.id] || []).concat(slowHint(n) || [], batteryHint(n) || [])) out.push({ id: n.id, text: h, warn: false });
    }
    for (const x of spectrumIssues()) out.push({ id: "spectrum", label: T.secSpectrum, text: x.text, warn: false });   // #78, #120
    const nm = x => x.label || nameOf(x.id);
    return out.sort((a, b) => (b.warn - a.warn) || nm(a).localeCompare(nm(b), lang));
  }
  const muted = t => `<div class="tnote">${t}</div>`;
  const devLink = id => nodeById[id] || wifiById[id] ? `<a href="#" data-open="${esc(id)}">${esc(nameOf(id))}</a>` : esc(nameOf(id));
  function hintTable(list) {
    return `<table class="hints">${list.map(x => { const k = x.warn ? null : hintKind(x.id, x.text);
      return `<tr><td class="${x.warn ? "r" : "b"}" style="width:1.2em;vertical-align:top">${x.warn ? "⚠" : "ℹ"}</td>` +
      `<td style="white-space:nowrap;vertical-align:top">${x.label ? `<a href="#" data-tab="links">${esc(x.label)}</a>` : devLink(x.id)}</td><td>${esc(x.text)}` +
      (k ? ` <a href="#" class="more" data-dismiss="${esc(x.id + "|" + k)}">${T.hintDone}</a>` : "") + `</td></tr>`; }).join("")}</table>`;
  }
  function dismissedHtml() {                         // hints marked "Done" whose condition still applies (#24)
    const rows = [];
    for (const n of Object.values(nodeById)) {
      if (powerCutOf(n) && isDismissed(n, "power")) rows.push([n.id, "power"]);
      if (unstableOf(n) && isDismissed(n, "unstable")) rows.push([n.id, "unstable"]);
    }
    if (!rows.length) return "";
    return `<h4>${T.dismissedHead(rows.length)}</h4><table>` + rows.map(([id, k]) => `<tr><td style="white-space:nowrap">${devLink(id)}</td>` +
      `<td>${esc(T.dismissKinds[k])}</td><td><a href="#" data-undismiss="${esc(id + "|" + k)}">${T.hintShowAgain}</a></td></tr>`).join("") + `</table>` +
      muted(T.dismissedNote);
  }
  function overviewHtml(hints) {
    const hl = computeHealth(); let h = "";
    if (hl) {
      const bad = hl.factors.filter(f => f.level === "warn" || f.level === "bad"), rest = hl.factors.filter(f => !bad.includes(f));
      const fRow = f => `<tr${f.ids.length ? ` class="mark" data-mark="${esc(f.ids.join(","))}" title="${esc(T.markHint)}"` : ""}>` +
        `<td style="vertical-align:top;white-space:nowrap"><span style="color:${HEALTH_COLOR[f.level]}">●</span> ${T.hfTitle[f.key]}</td>` +
        `<td>${f.level === "na" ? "" : `<b style="color:${HEALTH_COLOR[f.level]}">${esc(f.value)}</b> · `}${esc(f.text)}</td></tr>`;
      h += `<div class="hcard"><div class="hgrade" style="background:${gradeColor(hl.grade)}">${hl.grade}</div><div><b>${T.healthHead}</b>` +
        (hl.known < hl.factors.length ? `<div class="tnote" style="margin:0">${T.healthPartial(hl.known, hl.factors.length)}</div>` : "") +
        `<div>${bad.length ? T.factorsToCheck(bad.length) : T.factorsAllOk}</div></div></div>`;
      if (bad.length) h += `<table class="factors">${bad.map(fRow).join("")}</table>`;
      if (rest.length) h += `<details class="okf"><summary>${T.factorsOk(rest.filter(f => f.level === "ok").length, rest.length)}</summary><table class="factors">${rest.map(fRow).join("")}</table></details>`;
      h += muted(T.healthNote);
    }
    h += `<h4>${T.topHints}</h4>` + (hints.length ? hintTable(hints.slice(0, 3)) +
      (hints.length > 3 ? `<a href="#" data-tab="hints" class="more">${T.allHints(hints.length)}</a>` : "") : `<div>${T.noHints}</div>`);
    return h + `<div class="tnote" style="margin-top:12px">${T.foot(listData.count)}</div>`;
  }
  function hintsHtml(hints) {
    return (hints.length ? hintTable(hints) : `<div>${T.noHints}</div>`) + muted(T.hintsNote + " " + T.stabNote(HINT_DAYS)) + dismissedHtml();
  }
  // one row per device: role, parent (or the router links of a router), signal, firmware
  function deviceRows() {
    const isRouterId = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || extraIds.has(id);
    const order = { routing_end_device: 0, end_device: 1, sleepy_end_device: 2, wifi: 3 };
    const rows = Object.values(nodeById).map(n => {
      const p = n.type === "routing_end_device" ? null : listData.parents.find(x => x.childId === n.id);
      const rl = (linksOf[n.id] || []).filter(l => l.kind === "neighbour" && isRouterId(l.id));
      const best = rl.length ? Math.max(...rl.map(l => l.rssi)) : null;
      return { id: n.id, type: n.type, available: n.available, role: (T.types[n.type] || n.type), filter: n.type === "routing_end_device" ? "routers" : n.type === "end_device" ? "mains" : "battery",
               conn: p ? devLink(p.parentId) : n.type !== "sleepy_end_device" && rl.length ? esc(T.rLinksShort(rl.length)) : "–",   // the best one is in the signal column
               connSort: p ? nameOf(p.parentId) : "", rssi: p ? p.rssi : n.type !== "sleepy_end_device" ? best : null, self: p && p.src === "device", sw: (n.info || {}).sw || "",
               msgs: (m => m.up + m.down)(msgsLastHour(n.id)) };
    });
    for (const w of Object.values(wifiById)) rows.push({ id: w.id, type: "wifi", available: w.available, role: w.kind === "ethernet" ? T.roleEth : T.roleWifi, filter: "wifi",
      conn: "–", connSort: "", rssi: null, self: false, sw: (w.info || {}).sw || "", msgs: (m => m.up + m.down)(msgsLastHour(w.id)) });
    const k = devSort.key, d = devSort.dir;
    const val = r => k === "name" ? nameOf(r.id) : k === "conn" ? r.connSort : k === "rssi" ? (r.rssi === null ? -999 : r.rssi) : k === "fw" ? r.sw : k === "msgs" ? r.msgs : order[r.type];
    return rows.sort((a, b) => { const x = val(a), y = val(b);
      return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), lang, { numeric: true })) * d || nameOf(a.id).localeCompare(nameOf(b.id), lang); });
  }
  function devicesHtml() {
    const rows = deviceRows(), kinds = ["all", "routers", "mains", "battery", "wifi"].filter(f => f === "all" || rows.some(r => r.filter === f));
    if (!kinds.includes(devFilter)) devFilter = "all";
    const shown = rows.filter(r => devFilter === "all" || r.filter === devFilter);
    const th = (key, label) => `<th><a href="#" data-sort="${key}">${label}${devSort.key === key ? (devSort.dir > 0 ? " ▲" : " ▼") : ""}</a></th>`;
    let h = `<div class="chips">${kinds.map(f => `<button data-filter="${f}"${f === devFilter ? ' class="on"' : ""}>${T.devFilters[f]} <span>${f === "all" ? rows.length : rows.filter(r => r.filter === f).length}</span></button>`).join("")}</div>`;
    h += `<div class="tscroll"><table class="devs"><tr>${th("name", T.thDevice)}${th("role", T.rRole)}${th("conn", T.rConnection)}${th("rssi", T.thSignal)}${th("msgs", T.thMsgs)}${th("fw", T.firmware)}</tr>` +
      shown.map(r => {
        const u = fwOf[r.id], q = r.rssi !== null ? QUAL(r.rssi) : null;
        return `<tr><td>${devLink(r.id)}</td><td>${esc(r.role)}${r.available ? "" : ` <span class="r">${esc(T.unreachable.replace(/^\s*[–-]\s*/, ""))}</span>`}</td><td>${r.conn}</td>` +
          `<td${q ? ` class="${q[1]}"` : ""} style="white-space:nowrap">${r.rssi !== null ? `${r.rssi} dBm` : "–"}${r.self ? ` <span class="tnote" style="display:inline">*</span>` : ""}</td>` +
          `<td style="text-align:right">${r.msgs || "–"}</td>` +
          `<td style="white-space:nowrap">${esc(r.sw || "–")}${u && (u.available || u.progress !== null) ? ` <span class="o">→ ${esc(u.latest)}</span>` : ""}</td></tr>`;
      }).join("") + `</table></div>`;
    if (rows.some(r => r.self)) h += muted("* " + T.selfMeasured.replace(/^\(|\)$/g, ""));
    return h + chattyHtml() + firmwareListHtml();
  }
  function linksHtml() {
    const weakParents = listData.parents.filter(p => p.rssi < -80 && nodeById[p.childId]);
    let h = "";
    const linkRow = (a, b, r, self) => `<tr class="mark" data-mark="${esc(a + "," + b)}" title="${esc(T.markHint)}"><td>${esc(nameOf(a))} ↔ ${esc(nameOf(b))}</td>` +
      `<td class="${QUAL(r)[1]}" style="white-space:nowrap">${r} dBm${self ? ` <span class="tnote" style="display:inline">${T.selfMeasured}</span>` : ""}</td></tr>`;
    if (listData.weak.length) h += `<h4>${T.weakHead} ${T.weakSub}</h4><table class="lk">${listData.weak.map(w => linkRow(w.a, w.b, w.r)).join("")}</table>`;
    if (weakParents.length) h += `<h4>${T.weakParentHead} ${T.weakSub}</h4><table class="lk">${weakParents.map(p => linkRow(p.childId, p.parentId, p.rssi, p.src === "device")).join("")}</table>`;
    return spectrumSection() + (h || `<div>${T.noWeakLinks}</div>`) + muted(T.linksNote) + dependHtml();
  }
  // the panel below the map – rebuilt when the data changes (refresh, border router names #71, firmware every minute)
  function renderList() {
    if (!listData) return;
    hintsOf = computeHints(listData.parents);
    const hints = allHints();
    hintCount = hints.length;
    const body = { overview: () => overviewHtml(hints), hints: () => hintsHtml(hints), devices: devicesHtml, links: linksHtml, changes: () => `<div id="changes"></div>` };
    const open = $("info").querySelector("details.okf[open]");
    $("info").innerHTML = `<div id="tabbar" role="tablist" aria-label="${esc(T.netBtn.replace(/^\S+\s/, ""))}"></div>` +
      TABS.map(t => `<div class="tabp" id="tab-${t}" role="tabpanel"${t === tab ? "" : " hidden"}>${body[t]()}</div>`).join("");
    if (open) { const d = $("info").querySelector("details.okf"); if (d) d.open = true; }
    renderTabBar(); renderChanges();
  }
  root.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-tab],[data-sort],[data-filter],[data-mark]");
    if (!t || !($("info").contains(t) || $("panel").contains(t))) return;     // data-mark also in the router panel (#77)
    if (e.target.closest("a[data-open]")) return;              // a device name inside a marked row opens the device
    e.preventDefault();
    if (t.dataset.tab) setTab(t.dataset.tab);
    else if (t.dataset.sort) { devSort = { key: t.dataset.sort, dir: devSort.key === t.dataset.sort ? -devSort.dir : 1 }; renderList(); }
    else if (t.dataset.filter) { devFilter = t.dataset.filter; renderList(); }
    else if (t.dataset.mark) markDevices(t.dataset.mark.split(","));
  });
