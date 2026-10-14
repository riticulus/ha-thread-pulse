// Change log (issue #7).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { $, COLORS, DEMO, QUAL, esc, every, extraName, loadHa, prefs, render, trackGrade } = tp;
  Object.assign(tp, {
    clearChanges,
    diffSnaps,
    drawFlashes,
    initChangeStore,
    liveAvailability,
    logChange,
    renderChanges,
    snapshotOf,
  });
  // ---------- change log (issue #7) ----------
  // Every 5 minutes the data is loaded again (map positions kept) and compared with the previous state. Reachability
  // changes are logged live from Home Assistant. The list is stored in Home Assistant per user (issue #86), so it is
  // the same on every device, and synchronised live between open pages; until that connection is up (and as a
  // fallback without it) it is kept in the browser. Max. 200 entries.
  const REFRESH_MS = DEMO ? 40000 : 5 * 60000;
  const STORE_KEY = "thread_pulse_changes",
    MAX_CHANGES = 200,
    SAME_MS = 10 * 60000;
  tp.lastSnap = null;
  tp.changes = [];
  let flashes = [];
  let flashing = false;
  let refreshing = false;
  tp.store = null;
  tp.saveTimer = null;
  let clearedAt = 0; // store: { conn, unsub } once Home Assistant's user data is used
  const availNow = {};
  tp.changes = DEMO ? [] : prefs.get("changes");
  // Several open pages (phone, tablet, desktop) see the same change – keep it once: an entry is a duplicate when the
  // next newer entry of the same device says the same within 10 minutes (so a device going offline, online and
  // offline again still shows all three).
  const sameChange = (a, b) => a.kind === b.kind && a.text === b.text && Math.abs(a.t - b.t) < SAME_MS;
  function mergeChanges(...lists) {
    const out = [],
      newest = {};
    for (const c of lists
      .flat()
      .filter(c => c && c.t > clearedAt)
      .sort((a, b) => b.t - a.t)) {
      const prev = newest[c.id];
      if (prev && sameChange(prev, c)) continue;
      newest[c.id] = c;
      out.push(c);
    }
    return out.slice(0, MAX_CHANGES);
  }
  function fromStore(value) {
    // { entries, cleared } as stored in Home Assistant
    if (!value) return [];
    clearedAt = Math.max(clearedAt, value.cleared || 0);
    return Array.isArray(value.entries) ? value.entries : [];
  }
  async function initChangeStore(hass) {
    if (DEMO || tp.store || !hass || !hass.connection) return;
    const conn = hass.connection;
    try {
      const r = await conn.sendMessagePromise({ type: "frontend/get_user_data", key: STORE_KEY });
      const remote = fromStore(r && r.value),
        local = prefs.get("changes");
      tp.changes = mergeChanges(tp.changes, remote, local);
      tp.store = { conn, unsub: null };
      if (local.length || tp.changes.length !== remote.length) saveChanges(true); // migrate the entries of this browser once
      prefs.remove("changes");
      tp.store.unsub = await conn.subscribeMessage(
        ev => {
          // changes logged or cleared on another device
          const remote2 = fromStore(ev && ev.value);
          const merged = mergeChanges(tp.changes, remote2);
          if (JSON.stringify(merged) !== JSON.stringify(tp.changes)) {
            tp.changes = merged;
            renderChanges();
          }
        },
        { type: "frontend/subscribe_user_data", key: STORE_KEY },
      );
      renderChanges();
    } catch (e) {
      tp.store = null;
    } // older Home Assistant or no permission: keep using the browser
  }
  function saveChanges(now = false) {
    if (DEMO) return;
    if (!tp.store) {
      prefs.set("changes", tp.changes.slice(0, MAX_CHANGES));
      return;
    }
    clearTimeout(tp.saveTimer);
    const write = async () => {
      try {
        // read first: another device may have added entries since the last sync
        const r = await tp.store.conn.sendMessagePromise({ type: "frontend/get_user_data", key: STORE_KEY });
        const before = tp.changes.length;
        tp.changes = mergeChanges(tp.changes, fromStore(r && r.value));
        if (tp.changes.length !== before) renderChanges();
        await tp.store.conn.sendMessagePromise({
          type: "frontend/set_user_data",
          key: STORE_KEY,
          value: { version: 1, entries: tp.changes, cleared: clearedAt },
        });
      } catch (e) {
        prefs.set("changes", tp.changes);
      } // keep them in the browser if Home Assistant refuses
    };
    if (now) write();
    else tp.saveTimer = setTimeout(write, 2000);
  }
  function clearChanges() {
    clearedAt = Date.now();
    tp.changes = [];
    prefs.remove("changes");
    saveChanges(true);
    renderChanges();
  }
  function snapshotOf(nodes, edges, byId) {
    const snap = { nodes: {}, parent: {}, links: {} };
    for (const n of nodes) snap.nodes[n.id] = { name: n.name, available: n.available, role: n.role, type: n.type };
    for (const e of Object.values(edges)) {
      const r = Math.round(e.rssi.reduce((a, v) => a + v, 0) / e.rssi.length);
      if (e.parent) snap.parent[e.a] = { id: e.b, rssi: r };
      else if (
        r >= -80 &&
        byId[e.a] &&
        byId[e.b] &&
        byId[e.a].type === "routing_end_device" &&
        byId[e.b].type === "routing_end_device"
      )
        snap.links[e.a < e.b ? e.a + "|" + e.b : e.b + "|" + e.a] = r; // usable router-to-router links only (less noise)
    }
    for (const n of nodes) if (availNow[n.id] === undefined) availNow[n.id] = n.available;
    return snap;
  }
  const nameIn = (snap, id) => (snap.nodes[id] || {}).name || extraName(id);
  function diffSnaps(a, b) {
    if (b) trackGrade(b.grade);
    if (!a || !b) return;
    for (const id in b.nodes) if (!a.nodes[id]) logChange(id, b.nodes[id].name, tp.T.chNew, "new");
    for (const id in a.nodes) if (!b.nodes[id]) logChange(id, a.nodes[id].name, tp.T.chGone, "gone");
    for (const id in b.nodes) {
      const x = a.nodes[id],
        y = b.nodes[id];
      if (!x) continue;
      if (x.available !== y.available && availNow[id] !== y.available) {
        availNow[id] = y.available;
        logChange(id, y.name, y.available ? tp.T.chOnline : tp.T.chOffline, y.available ? "online" : "offline");
      }
      if (x.role !== y.role && x.role !== undefined && y.role !== undefined)
        logChange(id, y.name, tp.T.chRole(tp.T.roles[x.role] || x.role, tp.T.roles[y.role] || y.role), "role");
      const p = a.parent[id],
        q = b.parent[id];
      if (p && q && p.id !== q.id)
        logChange(id, y.name, tp.T.chParent(nameIn(a, p.id), nameIn(b, q.id), q.rssi), "parent");
      else if (p && q && QUAL(p.rssi)[2] !== QUAL(q.rssi)[2])
        logChange(id, y.name, tp.T.chSignal(nameIn(b, q.id), QUAL(p.rssi)[2], QUAL(q.rssi)[2], q.rssi), "signal");
    }
    for (const k in b.links)
      if (!(k in a.links)) {
        const [u, v] = k.split("|");
        logChange(u, nameIn(b, u), tp.T.chLinkNew(nameIn(b, v)), "link");
      }
    for (const k in a.links)
      if (!(k in b.links) && b.nodes[k.split("|")[0]] && b.nodes[k.split("|")[1]]) {
        const [u, v] = k.split("|");
        logChange(u, nameIn(b, u), tp.T.chLinkGone(nameIn(b, v)), "link");
      }
  }
  const CH_COLOR = {
    new: COLORS.good,
    online: COLORS.good,
    gone: COLORS.weak,
    offline: COLORS.weak,
    parent: COLORS.change,
    role: COLORS.change,
    signal: COLORS.medium,
    link: COLORS.medium,
    gradeUp: COLORS.good,
    gradeDown: COLORS.weak,
  };
  function logChange(id, name, text, kind) {
    tp.changes = mergeChanges([{ t: Date.now(), id, name, text, kind }], tp.changes);
    saveChanges();
    flashes.push({ id, t0: performance.now(), color: CH_COLOR[kind] || COLORS.change });
    if (!flashing) {
      flashing = true;
      requestAnimationFrame(flashTick);
    }
    renderChanges();
  }
  function flashTick() {
    const now = performance.now();
    flashes = flashes.filter(f => now - f.t0 < 3000);
    if (tp.network) tp.network.redraw();
    if (flashes.length && !tp.destroyed) requestAnimationFrame(flashTick);
    else flashing = false;
  }
  function drawFlashes(ctx) {
    if (!flashes.length) return;
    const pos = tp.network.getPositions(),
      now = performance.now();
    for (const f of flashes) {
      const p = pos[f.id];
      if (!p) continue;
      const k = ((now - f.t0) % 1000) / 1000; // three pulses
      ctx.save();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16 + k * 30, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  }
  function renderChanges() {
    const el = $("changes");
    if (!el) return;
    const fmt = t =>
      new Date(t).toLocaleString(tp.lang, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    el.innerHTML =
      `<b>${tp.T.changesHead}</b>` +
      (tp.changes.length
        ? ` <a href="#" data-act="clearchanges" style="font-size:12px;margin-left:8px">${tp.T.changesClear}</a><table>` +
          tp.changes
            .slice(0, 30)
            .map(
              c =>
                `<tr><td style="white-space:nowrap;color:var(--muted);vertical-align:top">${fmt(c.t)}</td><td style="white-space:nowrap;vertical-align:top"><span style="color:${CH_COLOR[c.kind] || "inherit"}">●</span> ` +
                (tp.nodeById[c.id] ? `<a href="#" data-open="${c.id}">${esc(c.name)}</a>` : esc(c.name)) +
                `</td><td>${esc(c.text)}</td></tr>`,
            )
            .join("") +
          `</table>`
        : `<div>${tp.T.changesNone}</div>`) +
      `<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">${tp.T.changesNote}</div>`;
    tp.renderTabBar(); // counter of new entries on the tab (#108)
  }
  async function refresh() {
    if (refreshing || tp.destroyed || !tp.network) return;
    refreshing = true;
    try {
      const keep = tp.network.getPositions();
      keep.__view = { position: tp.network.getViewPosition(), scale: tp.network.getScale() };
      const prev = tp.lastSnap;
      const m = DEMO ? tp.demoMutate() : await loadHa();
      render(m, keep);
      diffSnaps(prev, tp.lastSnap);
    } catch (e) {
      console.warn("Thread Pulse refresh:", e);
    }
    refreshing = false;
  }
  every(refresh, REFRESH_MS);
  // live reachability from Home Assistant (called by the state_changed handler)
  function liveAvailability(nodeId, available) {
    if (availNow[nodeId] === available || !tp.nodeById[nodeId]) return;
    availNow[nodeId] = available;
    const n = tp.nodeById[nodeId];
    logChange(nodeId, n.name, available ? tp.T.chOnline : tp.T.chOffline, available ? "online" : "offline");
  }
}
