//# Change log (issue #7).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- change log (issue #7) ----------
  // Every 5 minutes the data is loaded again (map positions kept) and compared with the previous state. Reachability
  // changes are logged live from Home Assistant. The list is kept in this browser (localStorage), max. 100 entries.
  const REFRESH_MS = DEMO ? 40000 : 5 * 60000, LOG_KEY = "threadPulseChanges";
  let lastSnap = null, changes = [], flashes = [], flashing = false, refreshing = false;
  const availNow = {};
  try { changes = JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch (e) { changes = []; }
  if (DEMO) changes = [];
  function snapshotOf(nodes, edges, byId) {
    const snap = { nodes: {}, parent: {}, links: {} };
    for (const n of nodes) snap.nodes[n.id] = { name: n.name, available: n.available, role: n.role, type: n.type };
    for (const e of Object.values(edges)) {
      const r = Math.round(e.rssi.reduce((a, v) => a + v, 0) / e.rssi.length);
      if (e.parent) snap.parent[e.a] = { id: e.b, rssi: r };
      else if (r >= -80 && byId[e.a] && byId[e.b] && byId[e.a].type === "routing_end_device" && byId[e.b].type === "routing_end_device")
        snap.links[e.a < e.b ? e.a + "|" + e.b : e.b + "|" + e.a] = r;      // usable router-to-router links only (less noise)
    }
    for (const n of nodes) if (availNow[n.id] === undefined) availNow[n.id] = n.available;
    return snap;
  }
  const nameIn = (snap, id) => (snap.nodes[id] || {}).name || (id === brExt ? T.brLabel : "…" + id.slice(-4));
  function diffSnaps(a, b) {
    if (!a || !b) return;
    for (const id in b.nodes) if (!a.nodes[id]) logChange(id, b.nodes[id].name, T.chNew, "new");
    for (const id in a.nodes) if (!b.nodes[id]) logChange(id, a.nodes[id].name, T.chGone, "gone");
    for (const id in b.nodes) {
      const x = a.nodes[id], y = b.nodes[id]; if (!x) continue;
      if (x.available !== y.available && availNow[id] !== y.available) { availNow[id] = y.available; logChange(id, y.name, y.available ? T.chOnline : T.chOffline, y.available ? "online" : "offline"); }
      if (x.role !== y.role && x.role !== undefined && y.role !== undefined)
        logChange(id, y.name, T.chRole(T.roles[x.role] || x.role, T.roles[y.role] || y.role), "role");
      const p = a.parent[id], q = b.parent[id];
      if (p && q && p.id !== q.id) logChange(id, y.name, T.chParent(nameIn(a, p.id), nameIn(b, q.id), q.rssi), "parent");
      else if (p && q && QUAL(p.rssi)[2] !== QUAL(q.rssi)[2]) logChange(id, y.name, T.chSignal(nameIn(b, q.id), QUAL(p.rssi)[2], QUAL(q.rssi)[2], q.rssi), "signal");
    }
    for (const k in b.links) if (!(k in a.links)) { const [u, v] = k.split("|"); logChange(u, nameIn(b, u), T.chLinkNew(nameIn(b, v)), "link"); }
    for (const k in a.links) if (!(k in b.links) && b.nodes[k.split("|")[0]] && b.nodes[k.split("|")[1]]) { const [u, v] = k.split("|"); logChange(u, nameIn(b, u), T.chLinkGone(nameIn(b, v)), "link"); }
  }
  const CH_COLOR = { new: "#43a047", online: "#43a047", gone: "#e53935", offline: "#e53935", parent: "#ab47bc", role: "#ab47bc", signal: "#fb8c00", link: "#fb8c00" };
  function logChange(id, name, text, kind) {
    changes.unshift({ t: Date.now(), id, name, text, kind });
    changes = changes.slice(0, 100);
    if (!DEMO) try { localStorage.setItem(LOG_KEY, JSON.stringify(changes)); } catch (e) {}
    flashes.push({ id, t0: performance.now(), color: CH_COLOR[kind] || "#ab47bc" });
    if (!flashing) { flashing = true; requestAnimationFrame(flashTick); }
    renderChanges();
  }
  function flashTick() {
    const now = performance.now();
    flashes = flashes.filter(f => now - f.t0 < 3000);
    if (network) network.redraw();
    if (flashes.length && !destroyed) requestAnimationFrame(flashTick); else flashing = false;
  }
  function drawFlashes(ctx) {
    if (!flashes.length) return;
    const pos = network.getPositions(), now = performance.now();
    for (const f of flashes) {
      const p = pos[f.id]; if (!p) continue;
      const k = ((now - f.t0) % 1000) / 1000;              // three pulses
      ctx.save(); ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.arc(p.x, p.y, 16 + k * 30, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }
  }
  function renderChanges() {
    const el = $("changes"); if (!el) return;
    const fmt = t => new Date(t).toLocaleString(lang, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    el.innerHTML = `<b>${T.changesHead}</b>` + (changes.length
      ? ` <a href="#" data-act="clearchanges" style="font-size:12px;margin-left:8px">${T.changesClear}</a><table>` + changes.slice(0, 30).map(c =>
          `<tr><td style="white-space:nowrap;color:var(--muted);vertical-align:top">${fmt(c.t)}</td><td style="white-space:nowrap;vertical-align:top"><span style="color:${CH_COLOR[c.kind] || "inherit"}">●</span> ` +
          (nodeById[c.id] ? `<a href="#" data-open="${c.id}">${esc(c.name)}</a>` : esc(c.name)) + `</td><td>${esc(c.text)}</td></tr>`).join("") + `</table>`
      : `<div>${T.changesNone}</div>`) + `<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">${T.changesNote}</div>`;
  }
  async function refresh() {
    if (refreshing || destroyed || !network) return;
    refreshing = true;
    try {
      const keep = network.getPositions(); keep.__view = { position: network.getViewPosition(), scale: network.getScale() };
      const prev = lastSnap;
      const m = DEMO ? demoMutate() : await loadHa();
      render(m, keep);
      diffSnaps(prev, lastSnap);
    } catch (e) { console.warn("Thread Pulse refresh:", e); }
    refreshing = false;
  }
  every(refresh, REFRESH_MS);
  // live reachability from Home Assistant (called by the state_changed handler)
  function liveAvailability(nodeId, available) {
    if (availNow[nodeId] === available || !nodeById[nodeId]) return;
    availNow[nodeId] = available;
    const n = nodeById[nodeId];
    logChange(nodeId, n.name, available ? T.chOnline : T.chOffline, available ? "online" : "offline");
  }
