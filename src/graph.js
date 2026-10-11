//# Building and drawing the map, the list below it.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- graph ----------
  let searchHits = [], searchActive = false;
  let extraIds = new Set(), threadInfo = null, wifiById = {}, parentOf = {}, listData = null;
  let hintsOf = {}, nodeById = {}, linksOf = {}, battOf = {}, brExt = null, devToNode = {}, entToNode = {}, nodeName = {}, onMap = new Set(), ridToId = {}, routeOf = {}, parentRid = {}, ownRid = {};

  // Some devices report the same hardware address (e.g. two Aqara P2 motion sensors, issue #98). The map needs unique
  // ids: such devices get "<address>-<device id>" and a hint; the reported address is kept for the panel.
  function uniqueIds(nodes) {
    const by = {};
    for (const n of nodes) (by[n.hwAddr || n.id] = by[n.hwAddr || n.id] || []).push(n);
    for (const [addr, list] of Object.entries(by)) {
      if (list.length < 2) continue;
      list.forEach((n, i) => { n.hwAddr = addr; n.dupWith = list.filter(x => x !== n).map(x => x.name); n.id = addr + "-" + (n.devId || i); });
    }
  }
  function render(model, keep) {      // keep: positions of the previous map (refresh without layout jump)
    const { nodes } = model;
    uniqueIds(nodes);
    brExt = model.brExt;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const isRouter = n => n.type === "routing_end_device";
    const visNodes = [], edges = {}, extra = {}, parents = [];
    for (const n of nodes) {
      const color = !n.available ? COLORS.off : isRouter(n) ? COLORS.router : n.type === "end_device" ? COLORS.end : COLORS.sleepy;
      visNodes.push({ id: n.id, label: n.name, shape: "image", image: iconImg(n.icon, color, 64), size: isRouter(n) ? 20 : 14,
                      ...(keep && keep[n.id] ? { x: keep[n.id].x, y: keep[n.id].y } : {}),
                      shapeProperties: { useBorderWithImage: false },
                      title: `${n.name}\n${T.types[n.type] || n.type}${n.available ? "" : T.unreachable}` });
    }
    // router <-> router links (from the routers' neighbour tables, both directions averaged)
    for (const n of nodes.filter(isRouter)) {
      for (const x of n.neigh) {
        if (x["13"]) continue;                                   // children: taken from the child's own view below
        const other = hex16(x["0"]);
        if (!byId[other] && x["11"]) extra[other] = true;        // full Thread device that is not a Matter node of HA
        if (!byId[other] && !extra[other]) continue;
        if (byId[other] && !isRouter(byId[other]) && byId[other].type !== "end_device") continue;
        const key = [n.id, other].sort().join("|");
        (edges[key] = edges[key] || { a: n.id, b: other, rssi: [] }).rssi.push(x["6"]);
      }
    }
    let extras = Object.keys(extra);
    threadInfo = model.thread || null;
    if (!brExt && extras.length === 1) brExt = extras[0];         // no OTBR info: a single unknown router is most likely the border router
    // the parent of a device that is not a Matter device of HA (e.g. an Apple TV / HomePod) is not in any neighbour table of
    // a Matter router when the mesh has no Matter routers: add it from the device's own neighbour table (issue #71)
    parentOf = {};
    const bestOf = n => [...n.neigh].sort((p, q) => q["6"] - p["6"])[0];
    for (const n of nodes.filter(n => !isRouter(n))) {
      const best = bestOf(n); if (!best) continue;
      const pid = hex16(best["0"]);
      parentOf[n.id] = pid;
      if (!byId[pid]) extra[pid] = true;
    }
    extras = Object.keys(extra);
    extraIds = new Set(extras);
    for (const id of extras) {
      const isBr = id === brExt;
      visNodes.push({ id, label: extraLabel(id), shape: "image",
        image: iconImg(isBr || brInfo[id] ? "access-point-network" : "router-wireless", isBr ? COLORS.br : COLORS.off, 64), size: isBr ? 24 : 16,
        title: extraTitle(id) });
    }
    // child signal as measured by the parent router (sleepy devices report their own RSSI unreliably)
    const childRssi = {};
    for (const n of nodes.filter(isRouter)) for (const x of n.neigh) if (x["13"]) childRssi[n.id + "|" + hex16(x["0"])] = x["6"];
    for (const n of nodes.filter(n => !isRouter(n))) {
      const best = bestOf(n);
      if (!best) continue;
      const pid = hex16(best["0"]);
      let rssi = best["6"], src = "device";
      if (childRssi[pid + "|" + n.id] !== undefined) { rssi = childRssi[pid + "|" + n.id]; src = "router"; }
      if (n.type === "end_device") {                             // mains end devices: show all their links like routers
        for (const x of n.neigh) { const o = hex16(x["0"]); if (!byId[o]) continue;
          const key = [n.id, o].sort().join("|"); (edges[key] = edges[key] || { a: n.id, b: o, rssi: [] }).rssi.push(x["6"]); }
        if (!byId[pid]) edges["p|" + n.id] = { a: n.id, b: pid, rssi: [rssi], parent: true };     // parent outside HA (issue #71)
      } else {
        edges["p|" + n.id] = { a: n.id, b: pid, rssi: [rssi], parent: true };
      }
      parents.push({ child: n.name, type: n.type, parentId: pid, get parent() { return nameOf(this.parentId); }, rssi, src });   // name resolved when shown (#71)
    }
    wifiById = {};
    if (SHOW_WIFI) for (const w of model.wifi || []) {
      wifiById[w.id] = w;
      visNodes.push({ id: w.id, label: w.name, shape: "image", image: iconImg(w.icon, w.available ? COLORS.wifi : COLORS.off, 64), size: 14, physics: false,
                      shapeProperties: { useBorderWithImage: false }, x: 0, y: 0, ...(keep && keep[w.id] ? { x: keep[w.id].x, y: keep[w.id].y } : {}),
                      title: `${w.name}\n${w.kind === "ethernet" ? T.ethSub : T.wifiSub}${w.available ? "" : T.unreachable}` });
    }
    const ids = new Set(visNodes.map(v => v.id));
    const avg = e => Math.round(e.rssi.reduce((s, v) => s + v, 0) / e.rssi.length);
    const seenEdge = new Set();
    const visEdges = Object.values(edges).filter(e => ids.has(e.b)).filter(e => { const k = linkKey(e.a, e.b); if (seenEdge.has(k)) return false; seenEdge.add(k); return true; }).map(e => {
      const r = avg(e), [c] = QUAL(r);
      return { id: linkKey(e.a, e.b), rssiTitle: `${r} dBm`, from: e.a, to: e.b, color: { color: c, highlight: c, hover: c, opacity: e.parent ? 0.95 : 0.55 }, width: e.parent ? 3 : 1.5,
               dashes: !!e.parent, title: `${r} dBm`, length: e.parent ? 90 : 180 };
    });
    const fg = getComputedStyle(host.styleTarget).getPropertyValue("--fg").trim() || "#1f2733";
    // last line of defence: one duplicate id must never leave the whole map empty (issue #98)
    const seenIds = new Set();
    const uniqueNodes = visNodes.filter(v => { if (seenIds.has(v.id)) { console.warn("Thread Pulse: duplicate id skipped", v.id); return false; } seenIds.add(v.id); return true; });
    const data = { nodes: new VIS.DataSet(uniqueNodes), edges: new VIS.DataSet(visEdges) };
    const opts = { nodes: { font: { color: fg, size: 13 } }, edges: { smooth: false },
                   physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -60, springLength: 140 }, stabilization: keep ? false : { iterations: 300 } },
                   interaction: { hover: true, tooltipDelay: 120 } };
    if (network) network.destroy();
    network = new VIS.Network($("net"), data, opts);
    if (keep) { placeWifi(); const view = keep.__view; if (view) network.moveTo({ position: view.position, scale: view.scale, animation: false }); }
    else {
      network.once("stabilizationIterationsDone", placeWifi);       // before the fit below
      network.once("stabilizationIterationsDone", () => network.fit({ animation: false }));
      network.once("stabilized", () => network.fit({ animation: { duration: 300 } }));
    }
    network.on("beforeDrawing", ctx => { drawRooms(ctx); drawHeat(ctx); drawWifiLabel(ctx); });
    if (roomOn) applyRooms(true, false);
    network.on("afterDrawing", ctx => { drawBadges(ctx); drawFlashes(ctx); drawPackets(ctx); });
    network.on("click", p => { if (p.nodes.length && (nodeById[p.nodes[0]] || extraIds.has(p.nodes[0]) || wifiById[p.nodes[0]])) openPanel(p.nodes[0]); else closePanel(); });
    // double click / double tap (issue #23): on empty space center and fit the whole mesh, on a device zoom to it
    network.on("doubleClick", p => {
      if (p.nodes.length && !String(p.nodes[0]).startsWith("room:")) {
        // center the device in the part of the map that the detail panel does not cover
        const pn = $("panel"), st = $("stage").getBoundingClientRect(), r = pn.hidden ? null : pn.getBoundingClientRect();
        const offset = !r ? { x: 0, y: 0 } : r.width < st.width * 0.8 ? { x: -(r.width + 8) / 2, y: 0 } : { x: 0, y: -(r.height) / 2 };
        network.focus(p.nodes[0], { scale: Math.max(1.2, network.getScale()), offset, animation: { duration: 400 } });
      }
      else network.fit({ animation: { duration: 400 } });
    });
    network.on("hoverNode", () => { $("net").style.cursor = "pointer"; });
    network.on("blurNode", () => { $("net").style.cursor = ""; });
    nodeById = byId;
    linksOf = {};
    // names are resolved when shown: border router names from the discovery arrive after the map is drawn (#71)
    for (const e of Object.values(edges)) {
      if (!ids.has(e.b)) continue;
      const r = avg(e);
      (linksOf[e.a] = linksOf[e.a] || []).push({ id: e.b, get name() { return nameOf(this.id); }, rssi: r, kind: e.parent ? "parent" : "neighbour" });
      (linksOf[e.b] = linksOf[e.b] || []).push({ id: e.a, get name() { return nameOf(this.id); }, rssi: r, kind: e.parent ? "child" : "neighbour" });
    }
    refreshBattery(model.hass);
    onMap = ids;
    buildRouting(nodes);
    devToNode = Object.fromEntries(nodes.filter(n => n.devId).map(n => [n.devId, n.id]));
    entToNode = {}; for (const n of nodes) for (const e of n.entities || []) entToNode[e] = n.id;
    nodeName = Object.fromEntries(nodes.map(n => [n.id, n.name]));
    for (const w of Object.values(wifiById)) { devToNode[w.devId] = w.id; for (const e of w.entities) entToNode[e] = w.id; nodeName[w.id] = w.name; }
    { const lw = $("lgwifi"); if (lw) lw.hidden = !Object.keys(wifiById).length; }
    parents.sort((p, q) => p.rssi - q.rssi);
    listData = { parents, count: nodes.length,
                 weak: Object.values(edges).filter(e => !e.parent && ids.has(e.b)).map(e => ({ a: e.a, b: e.b, r: avg(e) })).filter(e => e.r < -80).sort((p, q) => p.r - q.r) };
    renderList();
    const time = new Date().toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    if ($("search").value.trim()) network.once("stabilizationIterationsDone", () => setTimeout(applySearch, 50));
    renderChanges();
    if (panelNode && (nodeById[panelNode] || extraIds.has(panelNode) || wifiById[panelNode])) renderPanel(); else if (panelNode) closePanel();
    lastSnap = snapshotOf(nodes, edges, byId);
    $("status").textContent = (DEMO ? T.demo + " · " : "") + T.asOf(time, nodes.length) + " · " + T.tapHint + " · v" + VERSION;
  }

  // hints and the list below the map – rebuilt when names of border routers arrive (#71)
  function renderList() {
    if (!listData) return;
    const { parents, weak, count } = listData;
    hintsOf = computeHints(parents);
    const allHints = Object.entries(hintsOf).flatMap(([id, hs]) => hs.map(t => [id, t]));
    let h = `<div id="changes"></div><b>${T.hintsHead}</b>` + (allHints.length
      ? `<table>${allHints.map(([id, t]) => `<tr><td style="white-space:nowrap;vertical-align:top"><a href="#" data-open="${id}">${esc(nodeById[id].name)}</a></td><td>${esc(t)}</td></tr>`).join("")}</table>`
      : `<div>${T.noHints}</div>`) + `<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">${T.hintsNote}</div>`;
    hintCount = allHints.length; setList(!$("info").classList.contains("hidden"), false);
    h += `<b>${T.parentsHead}</b> ${T.parentsSub}<table><tr><th>${T.thDevice}</th><th>${T.thVia}</th><th>${T.thSignal}</th></tr>`;
    for (const p of parents.filter(p => p.type !== "end_device")) {
      const [, cls, txt] = QUAL(p.rssi);
      h += `<tr><td>${esc(p.child)}</td><td>${esc(p.parent)}</td><td class="${cls}">${p.rssi} dBm · ${txt}${p.src === "device" ? ` <span style="color:var(--muted)">${T.selfMeasured}</span>` : ""}</td></tr>`;
    }
    h += `</table>`;
    if (weak.length) {
      h += `<br><b>${T.weakHead}</b> ${T.weakSub}<table>`;
      for (const w of weak) h += `<tr><td>${esc(nameOf(w.a))} ↔ ${esc(nameOf(w.b))}</td><td class="r">${w.r} dBm</td></tr>`;
      h += `</table>`;
    }
    h += `<br><span style="color:var(--muted);font-size:12px">${T.foot(count)}</span>`;
    $("info").innerHTML = h;
  }
