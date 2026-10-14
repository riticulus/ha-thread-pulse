// Building and drawing the map, the list below it.
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { $, COLORS, DEMO, QUAL, SHOW_WIFI, VIS, hex16, host, iconImg, prefs } = tp;
  Object.assign(tp, { render, zoomTo });
  // zoom to a device (double-click, the device card's link #126) – the panel is next to the map, so the centre is free
  function zoomTo(id) {
    if (!tp.network) return;
    tp.network.focus(id, { scale: Math.max(1.2, tp.network.getScale()), animation: { duration: 400 } });
  }
  // ---------- graph ----------
  tp.searchHits = [];
  tp.searchActive = false;
  tp.extraIds = new Set();
  tp.threadInfo = null;
  tp.wifiById = {};
  tp.parentOf = {};
  tp.listData = null;
  tp.hintsOf = {};
  tp.nodeById = {};
  tp.linksOf = {};
  tp.battOf = {};
  tp.brExt = null;
  tp.devToNode = {};
  tp.entToNode = {};
  tp.nodeName = {};
  tp.onMap = new Set();
  tp.ridToId = {};
  tp.routeOf = {};
  tp.parentRid = {};
  tp.ownRid = {};

  // Some devices report the same hardware address (e.g. two Aqara P2 motion sensors, issue #98). The map needs unique
  // ids: such devices get "<address>-<device id>" and a hint; the reported address is kept for the panel.
  function uniqueIds(nodes) {
    const by = {};
    for (const n of nodes) (by[n.hwAddr || n.id] = by[n.hwAddr || n.id] || []).push(n);
    for (const [addr, list] of Object.entries(by)) {
      if (list.length < 2) continue;
      list.forEach((n, i) => {
        n.hwAddr = addr;
        n.id = addr + "-" + (n.devId || i);
      });
      list.forEach(n => {
        n.dupWith = list.filter(x => x !== n).map(x => x.id);
      }); // ids: the text report shows other names (#85)
    }
  }
  function render(model, keep) {
    // keep: positions of the previous map (refresh without layout jump)
    const { nodes } = model;
    uniqueIds(nodes);
    tp.brExt = model.brExt;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const isRouter = n => n.type === "routing_end_device";
    const visNodes = [],
      edges = {},
      extra = {},
      parents = [];
    for (const n of nodes) {
      const color = !n.available
        ? COLORS.off
        : isRouter(n)
          ? COLORS.router
          : n.type === "end_device"
            ? COLORS.end
            : COLORS.sleepy;
      visNodes.push({
        id: n.id,
        label: n.name,
        shape: "image",
        image: iconImg(n.icon, color, 64),
        size: isRouter(n) ? 20 : 14,
        ...(keep && keep[n.id] ? { x: keep[n.id].x, y: keep[n.id].y } : {}),
        shapeProperties: { useBorderWithImage: false },
        title: `${n.name}\n${tp.T.types[n.type] || n.type}${n.available ? "" : tp.T.unreachable}`,
      });
    }
    // router <-> router links (from the routers' neighbour tables, both directions averaged)
    for (const n of nodes.filter(isRouter)) {
      for (const x of n.neigh) {
        if (x["13"]) continue; // children: taken from the child's own view below
        const other = hex16(x["0"]);
        if (!byId[other] && x["11"]) extra[other] = true; // full Thread device that is not a Matter node of HA
        if (!byId[other] && !extra[other]) continue;
        if (byId[other] && !isRouter(byId[other]) && byId[other].type !== "end_device") continue;
        const key = [n.id, other].sort().join("|");
        (edges[key] = edges[key] || { a: n.id, b: other, rssi: [] }).rssi.push(x["6"]);
      }
    }
    let extras = Object.keys(extra);
    tp.threadInfo = model.thread || null;
    tp.zigbeeInfo = model.zigbee || null;
    if (!tp.brExt && extras.length === 1) tp.brExt = extras[0]; // no OTBR info: a single unknown router is most likely the border router
    // the parent of a device that is not a Matter device of HA (e.g. an Apple TV / HomePod) is not in any neighbour table of
    // a Matter router when the mesh has no Matter routers: add it from the device's own neighbour table (issue #71)
    tp.parentOf = {};
    const bestOf = n => [...n.neigh].sort((p, q) => q["6"] - p["6"])[0];
    for (const n of nodes.filter(n => !isRouter(n))) {
      const best = bestOf(n);
      if (!best) continue;
      const pid = hex16(best["0"]);
      tp.parentOf[n.id] = pid;
      if (!byId[pid]) extra[pid] = true;
    }
    extras = Object.keys(extra);
    tp.extraIds = new Set(extras);
    for (const id of extras) {
      const isBr = id === tp.brExt;
      visNodes.push({
        id,
        label: tp.extraLabel(id),
        shape: "image",
        image: iconImg(
          isBr || tp.brInfo[id] ? "access-point-network" : "router-wireless",
          isBr ? COLORS.br : COLORS.off,
          64,
        ),
        size: isBr ? 24 : 16,
        title: tp.extraTitle(id),
      });
    }
    // child signal as measured by the parent router (sleepy devices report their own RSSI unreliably)
    const childRssi = {};
    for (const n of nodes.filter(isRouter))
      for (const x of n.neigh) if (x["13"]) childRssi[n.id + "|" + hex16(x["0"])] = x["6"];
    for (const n of nodes.filter(n => !isRouter(n))) {
      const best = bestOf(n);
      if (!best) continue;
      const pid = hex16(best["0"]);
      let rssi = best["6"],
        src = "device";
      if (childRssi[pid + "|" + n.id] !== undefined) {
        rssi = childRssi[pid + "|" + n.id];
        src = "router";
      }
      if (n.type === "end_device") {
        // mains end devices: show all their links like routers
        for (const x of n.neigh) {
          const o = hex16(x["0"]);
          if (!byId[o]) continue;
          const key = [n.id, o].sort().join("|");
          (edges[key] = edges[key] || { a: n.id, b: o, rssi: [] }).rssi.push(x["6"]);
        }
        if (!byId[pid]) edges["p|" + n.id] = { a: n.id, b: pid, rssi: [rssi], parent: true }; // parent outside HA (issue #71)
      } else {
        edges["p|" + n.id] = { a: n.id, b: pid, rssi: [rssi], parent: true };
      }
      parents.push({
        child: n.name,
        childId: n.id,
        type: n.type,
        parentId: pid,
        get parent() {
          return tp.nameOf(this.parentId);
        },
        rssi,
        src,
      }); // name resolved when shown (#71)
    }
    tp.wifiById = {};
    if (SHOW_WIFI)
      for (const w of model.wifi || []) {
        tp.wifiById[w.id] = w;
        visNodes.push({
          id: w.id,
          label: w.name,
          shape: "image",
          image: iconImg(w.icon, w.available ? COLORS.wifi : COLORS.off, 64),
          size: 14,
          physics: false,
          shapeProperties: { useBorderWithImage: false },
          x: 0,
          y: 0,
          ...(keep && keep[w.id] ? { x: keep[w.id].x, y: keep[w.id].y } : {}),
          title: `${w.name}\n${w.kind === "ethernet" ? tp.T.ethSub : tp.T.wifiSub}${w.available ? "" : tp.T.unreachable}`,
        });
      }
    const ids = new Set(visNodes.map(v => v.id));
    const avg = e => Math.round(e.rssi.reduce((s, v) => s + v, 0) / e.rssi.length);
    const seenEdge = new Set();
    const visEdges = Object.values(edges)
      .filter(e => ids.has(e.b))
      .filter(e => {
        const k = tp.linkKey(e.a, e.b);
        if (seenEdge.has(k)) return false;
        seenEdge.add(k);
        return true;
      })
      .map(e => {
        const r = avg(e),
          [c] = QUAL(r);
        return {
          id: tp.linkKey(e.a, e.b),
          rssiTitle: `${r} dBm`,
          from: e.a,
          to: e.b,
          color: { color: c, highlight: c, hover: c, opacity: e.parent ? 0.95 : 0.55 },
          width: e.parent ? 3 : 1.5,
          dashes: !!e.parent,
          title: `${r} dBm`,
          length: e.parent ? 90 : 180,
        };
      });
    const fg = getComputedStyle(host.styleTarget).getPropertyValue("--fg").trim() || "#1f2733";
    // last line of defence: one duplicate id must never leave the whole map empty (issue #98)
    const seenIds = new Set();
    const uniqueNodes = visNodes.filter(v => {
      if (seenIds.has(v.id)) {
        console.warn("Thread Pulse: duplicate id skipped", v.id);
        return false;
      }
      seenIds.add(v.id);
      return true;
    });
    const data = { nodes: new VIS.DataSet(uniqueNodes), edges: new VIS.DataSet(visEdges) };
    const opts = {
      nodes: { font: { color: fg, size: 13 } },
      edges: { smooth: false },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -60, springLength: 140 },
        stabilization: keep ? false : { iterations: 300 },
      },
      interaction: { hover: true, tooltipDelay: 120 },
    };
    if (tp.network) tp.network.destroy();
    tp.network = new VIS.Network($("net"), data, opts);
    if (keep) {
      tp.placeWifi();
      const view = keep.__view;
      if (view) tp.network.moveTo({ position: view.position, scale: view.scale, animation: false });
    } else {
      tp.network.once("stabilizationIterationsDone", tp.placeWifi); // before the fit below
      tp.network.once("stabilizationIterationsDone", () => tp.network.fit({ animation: false }));
      tp.network.once("stabilized", () => tp.network.fit({ animation: { duration: 300 } }));
    }
    tp.network.on("beforeDrawing", ctx => {
      tp.drawRooms(ctx);
      tp.drawHeat(ctx);
      tp.drawWifiLabel(ctx);
    });
    if (tp.roomOn) tp.applyRooms(true, false);
    tp.network.on("afterDrawing", ctx => {
      tp.drawBadges(ctx);
      tp.drawResponseRings(ctx);
      tp.drawFlashes(ctx);
      tp.drawPackets(ctx);
    });
    tp.network.on("click", p => {
      if (p.nodes.length && (tp.nodeById[p.nodes[0]] || tp.extraIds.has(p.nodes[0]) || tp.wifiById[p.nodes[0]]))
        tp.openPanel(p.nodes[0]);
      else tp.closePanel();
    });
    // double click / double tap (issue #23): on empty space center and fit the whole mesh, on a device zoom to it
    tp.network.on("doubleClick", p => {
      if (p.nodes.length && !String(p.nodes[0]).startsWith("room:")) zoomTo(p.nodes[0]);
      else tp.network.fit({ animation: { duration: 400 } });
    });
    tp.network.on("hoverNode", () => {
      $("net").style.cursor = "pointer";
    });
    tp.network.on("blurNode", () => {
      $("net").style.cursor = "";
    });
    tp.nodeById = byId;
    tp.linksOf = {};
    // names are resolved when shown: border router names from the discovery arrive after the map is drawn (#71)
    for (const e of Object.values(edges)) {
      if (!ids.has(e.b)) continue;
      const r = avg(e);
      (tp.linksOf[e.a] = tp.linksOf[e.a] || []).push({
        id: e.b,
        get name() {
          return tp.nameOf(this.id);
        },
        rssi: r,
        kind: e.parent ? "parent" : "neighbour",
      });
      (tp.linksOf[e.b] = tp.linksOf[e.b] || []).push({
        id: e.a,
        get name() {
          return tp.nameOf(this.id);
        },
        rssi: r,
        kind: e.parent ? "child" : "neighbour",
      });
    }
    tp.refreshBattery(model.hass);
    tp.onMap = ids;
    tp.buildRouting(nodes);
    tp.devToNode = Object.fromEntries(nodes.filter(n => n.devId).map(n => [n.devId, n.id]));
    tp.entToNode = {};
    for (const n of nodes) for (const e of n.entities || []) tp.entToNode[e] = n.id;
    tp.nodeName = Object.fromEntries(nodes.map(n => [n.id, n.name]));
    for (const w of Object.values(tp.wifiById)) {
      tp.devToNode[w.devId] = w.id;
      for (const e of w.entities) tp.entToNode[e] = w.id;
      tp.nodeName[w.id] = w.name;
    }
    {
      const lw = $("lgwifi");
      if (lw) lw.hidden = !Object.keys(tp.wifiById).length;
    }
    parents.sort((p, q) => p.rssi - q.rssi);
    tp.listData = {
      parents,
      count: nodes.length,
      weak: Object.values(edges)
        .filter(e => !e.parent && ids.has(e.b))
        .map(e => ({ a: e.a, b: e.b, r: avg(e) }))
        .filter(e => e.r < -80)
        .sort((p, q) => p.r - q.r),
    };
    tp.refreshFirmware(model.hass);
    tp.recordSignal(); // signal trend (issue #38)
    tp.recordCounters(); // stability counters over a time window (issue #24)
    tp.renderList();
    const time = new Date().toLocaleTimeString(tp.lang, { hour: "2-digit", minute: "2-digit" });
    if ($("search").value.trim()) tp.network.once("stabilizationIterationsDone", () => setTimeout(tp.applySearch, 50));
    else if (tp.markedIds) {
      // devices marked from the panel below the map (#108) stay marked after a refresh
      const keepIds = tp.markedIds.filter(id => tp.onMap.has(id));
      tp.markedIds = null;
      if (keepIds.length) setTimeout(() => tp.markDevices(keepIds, false), 50);
      else tp.clearMarks();
    }
    tp.renderChanges();
    if (tp.panelNode && (tp.nodeById[tp.panelNode] || tp.extraIds.has(tp.panelNode) || tp.wifiById[tp.panelNode]))
      tp.renderPanel();
    else if (tp.panelNode) tp.closePanel();
    tp.lastSnap = tp.snapshotOf(nodes, edges, byId);
    tp.lastSnap.grade = (tp.computeHealth() || {}).grade; // grade changes go to the change log (issue #84)
    // short (issue #107): the version is in the ⋯ menu; the tap hint only until a device was opened once
    $("status").textContent =
      (DEMO ? tp.T.demo + " · " : "") +
      tp.T.asOf(time, nodes.length) +
      (prefs.get("tapped") ? "" : " · " + tp.T.tapHint);
  }
}
