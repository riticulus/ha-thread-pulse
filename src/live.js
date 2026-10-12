//# Live data flow: routing tables, path calculation, animated messages, ticker, subscription to Home Assistant events.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- live data flow ----------
  // Shown: every message a Matter device sends to Home Assistant (state report) and every command HA sends to a device.
  // Path: device -> its parent router -> (next hops from the routers' route tables) -> border router. Thread picks the
  // route itself; this is the most likely path according to the last route-table snapshot, not a radio capture.
  let packets = [], liveOn = true, unsub = null, recent = [], lastPkt = {}, animating = false;
  const HOP_MS = 550;

  function buildRouting(nodes) {
    ridToId = {}; routeOf = {}; parentRid = {}; ownRid = {};
    for (const n of nodes) for (const x of n.routes) if (x["0"] && x["0"] !== "0") ridToId[x["2"]] = hex16(x["0"]);
    for (const n of nodes) {
      const own = n.routes.find(x => x["3"] === 63 && x["4"] === 0);   // own entry: no next hop, cost 0
      if (n.role >= 5 && own) { ownRid[n.id] = own["2"]; routeOf[own["2"]] = Object.fromEntries(n.routes.map(x => [x["2"], x])); }
      else if (n.routes.length) parentRid[n.id] = (own || n.routes.find(x => x["9"]) || n.routes[0])["2"];
    }
  }
  function pathToBr(nodeId) {
    if (isWifiId(nodeId)) return null;                 // Matter over Wi-Fi: counted, but no Thread path
    if (!brExt) {
      // border router unknown (no OpenThread add-on, several or no unknown routers – e.g. Apple border routers only):
      // only the first hop is known, from the device to its parent (issue #71)
      const p = parentOf[nodeId];
      return p && onMap.has(p) ? [nodeId, p] : null;
    }
    const br = Object.keys(ridToId).find(r => ridToId[r] === brExt);
    const ids = [nodeId];
    let r = ownRid[nodeId] ?? parentRid[nodeId];
    if (r === undefined || br === undefined) return onMap.has(brExt) ? [nodeId, brExt] : null;
    if (ownRid[nodeId] === undefined) ids.push(ridToId[r]);
    for (let i = 0; i < 6 && String(r) !== br; i++) {
      const e = (routeOf[r] || {})[br];
      // direct link to the border router with usable quality -> one hop; otherwise follow the next hop
      if (!e || (e["9"] && Math.min(e["5"], e["6"]) >= 2) || e["3"] === 63) r = Number(br);
      else r = e["3"];
      ids.push(ridToId[r]);
    }
    const p = ids.filter((id, i) => id && onMap.has(id) && id !== ids[i - 1]);
    return p.length > 1 ? p : null;
  }
  const counts = {};   // per device: timestamps of messages since the page was opened

  function launch(nodeId, down, html) {
    const now = performance.now(), key = nodeId + down;
    if (lastPkt[key] && now - lastPkt[key] < 400) return;        // one radio message often updates several entities
    lastPkt[key] = now;
    const c = counts[nodeId] = counts[nodeId] || { up: [], down: [], last: null };
    (down ? c.down : c.up).push(Date.now()); c.last = { t: Date.now(), down };
    const cut = Date.now() - 3600000; c.up = c.up.filter(t => t > cut); c.down = c.down.filter(t => t > cut);
    c.total = (c.total || 0) + 1;
    let path = network ? pathToBr(nodeId) : null;
    if (path) {
      if (down) path = path.slice().reverse();
      recordTraffic(path);
      const via = brExt && path.includes(brExt) ? brExt : extraIds.has(path[down ? 0 : path.length - 1]) ? path[down ? 0 : path.length - 1] : null;
      if (via) {                                       // every animated message passes the border router (or, if unknown, the parent router)
        const b = counts[via] = counts[via] || { up: [], down: [], last: null };
        (down ? b.down : b.up).push(Date.now()); b.last = { t: Date.now(), down };
        b.up = b.up.filter(t => t > cut); b.down = b.down.filter(t => t > cut); b.total = (b.total || 0) + 1;
      }
    }
    if (panelNode === nodeId || (panelNode && extraIds.has(panelNode))) renderPanel();
    if (!liveOn || !network || !path) return;
    playTick(down);
    // response-time view (issue #89): a command travels as long as the device's median response time takes
    const rt = down && respView ? respSummary(nodeId) : null;
    const hopMs = rt ? Math.min(3000, Math.max(250, rt.med)) / Math.max(1, path.length - 1) : HOP_MS;
    packets.push({ path, t0: now, color: down ? COLORS.down : COLORS.up, origin: down ? path[path.length - 1] : nodeId, hopMs });
    recent.unshift({ t: new Date(), html, down }); recent = recent.slice(0, 60);
    showTicker();
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  }
  function tick() {
    const now = performance.now();
    packets = packets.filter(p => now - p.t0 < (p.path.length - 1) * p.hopMs + 900);
    if (network) network.redraw();
    if (packets.length && !destroyed) requestAnimationFrame(tick); else animating = false;
  }

  function drawPackets(ctx) {
    if (!packets.length) return;
    const now = performance.now(), pos = network.getPositions();
    for (const p of packets) {
      const el = now - p.t0, hops = p.path.length - 1, f = Math.min(el / p.hopMs, hops);
      const i = Math.min(Math.floor(f), hops - 1), k = f - i, a = pos[p.path[i]], b = pos[p.path[i + 1]];
      if (!a || !b) continue;
      // trail along the hops already travelled
      ctx.save(); ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.globalAlpha = Math.max(0, 0.6 - Math.max(0, el - hops * p.hopMs) / 1500);
      ctx.beginPath(); ctx.moveTo(pos[p.path[0]].x, pos[p.path[0]].y);
      for (let j = 1; j <= i; j++) ctx.lineTo(pos[p.path[j]].x, pos[p.path[j]].y);
      ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); ctx.stroke(); ctx.restore();
      // ring around the sender
      const o = pos[p.origin], ring = Math.min(el / 700, 1);
      if (o && ring < 1) { ctx.save(); ctx.strokeStyle = p.color; ctx.globalAlpha = 1 - ring; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(o.x, o.y, 18 + ring * 22, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
      // the packet itself
      if (el <= hops * p.hopMs) { const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
        ctx.save(); ctx.shadowColor = p.color; ctx.shadowBlur = 14; ctx.fillStyle = p.color; ctx.strokeStyle = "white"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
  }
  function showTicker() {
    const now = Date.now(), perMin = recent.filter(r => now - r.t < 60000).length;
    $("live").innerHTML = `<div><b>Live</b> · ${T.perMin(perMin)}</div>` +
      recent.slice(0, 3).map(r => `<div><span style="color:${r.down ? COLORS.down : COLORS.up}">●</span> ${r.t.toLocaleTimeString(lang)} ${r.html}</div>`).join("");
  }
  function localName(t) {        // translate common English entity names into the dashboard language (LOCAL_NAMES)
    const list = LOCAL_NAMES[lang]; if (!list) return t;
    for (const [en, tr] of list) if (t.toLowerCase().startsWith(en.toLowerCase())) return tr + t.slice(en.length);
    return t;
  }
  function fmtState(st) {
    const u = st.attributes && st.attributes.unit_of_measurement;
    return (T.states[st.state] || st.state) + (u ? " " + u : "");
  }

  async function subscribeLive(hass) {
    if (unsub) return;
    const conn = hass.connection;
    const u1 = await conn.subscribeEvents(ev => {
      const d = ev.data, n = entToNode[d.entity_id];
      if (n && d.new_state && d.old_state && (d.new_state.state === "unavailable") !== (d.old_state.state === "unavailable")) {
        const mainIds = (nodeById[n] && nodeById[n].mainEntities) || [];
        if (!mainIds.length || mainIds.includes(d.entity_id)) liveAvailability(n, d.new_state.state !== "unavailable");
      }
      if (!n || !d.new_state || !d.old_state || d.new_state.state === "unavailable" || d.old_state.state === "unavailable") return;
      if (d.entity_id.startsWith("button.") || d.entity_id.startsWith("update.")) return;   // set by HA itself (press time, versions found online) – not messages from the device   // the state of a button is the time of the last press, set by HA itself – not a message from the device
      if (d.new_state.state === d.old_state.state && JSON.stringify(d.new_state.attributes) === JSON.stringify(d.old_state.attributes)) return;
      const what = localName((d.new_state.attributes.friendly_name || d.entity_id).replace(nodeName[n], "").trim()) || T.state;
      let resp = "";
      const p = pendingCmd[d.entity_id];
      if (p) {
        const tState = haTime(ev.time_fired), ctxMatch = p.ctx && d.new_state.context && d.new_state.context.id === p.ctx;
        const ms = tState - p.t;
        if (ms >= 0 && (ctxMatch || ms <= RESP_WINDOW)) { recordResponse(n, ms); resp = ` · ${Math.round(ms)} ms`; }
        if (ms >= 0) delete pendingCmd[d.entity_id];
      }
      launch(n, false, `<b>${esc(nodeName[n])}</b> → HA: ${esc(what)} ${esc(fmtState(d.new_state))}${resp}`);
    }, "state_changed");
    const u2 = await conn.subscribeEvents(ev => {
      const sd = ev.data.service_data || {};
      const t = haTime(ev.time_fired), now = Date.now();
      for (const e of [].concat(sd.entity_id || [])) if (entToNode[e] && !isNaN(t) && !e.startsWith("button.")) pendingCmd[e] = { t, ctx: ev.context && ev.context.id, at: now };
      for (const e in pendingCmd) if (now - pendingCmd[e].at > RESP_WINDOW) delete pendingCmd[e];
      const targets = new Set([].concat(sd.entity_id || []).map(e => entToNode[e]).filter(Boolean));
      for (const dv of [].concat(sd.device_id || [])) if (devToNode[dv]) targets.add(devToNode[dv]);
      for (const n of targets) launch(n, true, `HA → <b>${esc(nodeName[n])}</b>: ${esc(ev.data.domain + "." + ev.data.service)}`);
    }, "call_service");
    unsub = () => { u1(); u2(); };
    showTicker();
    every(showTicker, 10000);
  }
