//# Badges on the map and the detail panel.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- badges and detail panel ----------
  let panelNode = null;
  function freshHass() { try { return host.hass(); } catch (e) { return null; } }
  function refreshBattery(hass) {
    battOf = {};
    for (const n of Object.values(nodeById)) {
      if (n.demoBattery !== undefined) { battOf[n.id] = n.demoBattery; continue; }
      if (!hass) continue;
      for (const id of n.entities || []) {
        const st = hass.states[id];
        if (st && st.attributes.device_class === "battery" && st.attributes.unit_of_measurement === "%" && !isNaN(parseFloat(st.state))) { battOf[n.id] = Math.round(parseFloat(st.state)); break; }
      }
    }
  }
  function warningsOf(n) {
    const w = [], i = n.info || {};
    if (i.attach >= 5) w.push(T.warnAttach(i.attach));            // thresholds from real networks: normal is 0–2 attempts, 1–2 drop-offs
    if (i.detached >= 3) w.push(T.warnDetached(i.detached));
    if (battOf[n.id] !== undefined && battOf[n.id] < 20) w.push(T.warnBattery(battOf[n.id]));
    return w;
  }
  function pill(ctx, x, y, text, bg) {
    ctx.font = "600 10px -apple-system, Segoe UI, Roboto, sans-serif";
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = bg; ctx.strokeStyle = "white"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y - 7, w, 14, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 4, y + 0.5);
  }
  function drawBadges(ctx) {
    const pos = network.getPositions();
    for (const n of Object.values(nodeById)) {
      const p = pos[n.id]; if (!p) continue;
      const r = n.type === "routing_end_device" ? 20 : 14;
      ctx.save();
      if (searchActive && !searchHits.includes(n.id)) ctx.globalAlpha = 0.18;
      if (battOf[n.id] !== undefined) {
        const b = battOf[n.id];
        pill(ctx, p.x + r * 0.55, p.y + r * 0.75, b + "%", b < 20 ? "#e53935" : b < 40 ? "#fb8c00" : "#607d8b");
      }
      if (!warningsOf(n).length && ((hintsOf[n.id] || []).length || slowHint(n))) {
        const x = p.x + r * 0.75, y = p.y - r * 0.85;
        ctx.fillStyle = "#1e88e5"; ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 10px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("i", x, y + 0.5);
      }
      if (warningsOf(n).length) {
        ctx.fillStyle = "#fb8c00"; ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        const x = p.x + r * 0.75, y = p.y - r * 0.95;
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", x, y + 1.5);
      }
      ctx.restore();
    }
  }

  let ambientClose = null;
  function openPanel(id) {
    panelNode = id; renderPanel(); $("panel").hidden = false;
    if (AMBIENT) { clearTimeout(ambientClose); ambientClose = setTimeout(closePanel, 15000); }    // ambient: close by itself
  }
  function closePanel() { panelNode = null; $("panel").hidden = true; if (network) network.unselectAll(); }
  function row(k, v) { return v === undefined || v === null || v === "" ? "" : `<dt>${esc(k)}</dt><dd>${v}</dd>`; }
  function rssiTxt(r) { const [, cls, txt] = QUAL(r); return `<span class="${cls}">${r} dBm · ${txt}</span>`; }
  function renderPanel() {
    const n = nodeById[panelNode]; if (!n) return closePanel();
    const i = n.info || {}, hass = DEMO ? null : freshHass();
    if (hass) refreshBattery(hass);
    const color = !n.available ? COLORS.off : n.type === "routing_end_device" ? COLORS.router : n.type === "end_device" ? COLORS.end : COLORS.sleepy;
    let h = `<div class="hd"><img src="${iconImg(n.icon, color, 80)}" alt=""><div><div class="t">${esc(n.name)}</div>` +
            `<div class="s">${esc(T.roles[n.role] || T.types[n.type] || "")}${n.area ? " · " + esc(n.area) : ""}${n.available ? "" : esc(T.unreachable)}</div></div>` +
            `<button class="x" title="×" data-act="close">×</button></div>`;
    for (const w of warningsOf(n)) h += `<div class="warn">⚠ ${esc(w)}</div>`;
    const hs = (hintsOf[n.id] || []).concat(slowHint(n) || []);
    if (hs.length) h += `<h4>${T.secHints}</h4>` + hs.map(t => `<div class="hint">💡 ${esc(t)}</div>`).join("") + `<div class="note">${T.hintsNote}</div>`;
    // live
    const c = counts[n.id], now = Date.now();
    h += `<h4>${T.secLive}</h4><dl>`;
    if (c) {
      const inWin = (arr, ms) => arr.filter(t => now - t < ms).length;
      h += row(T.msgsTotal, `${c.total}`) +
           row(T.msgsMin, `${inWin(c.up, 60000)} ${T.toHa} · ${inWin(c.down, 60000)} ${T.fromHa}`) +
           row(T.msgsHour, `${inWin(c.up, 3600000)} ${T.toHa} · ${inWin(c.down, 3600000)} ${T.fromHa}`) +
           row(T.lastMsg, `${T.ago(Math.round((now - c.last.t) / 1000))} (${c.last.down ? T.fromHa : T.toHa})`);
    } else h += row(T.msgsTotal, T.none);
    const rs = respSummary(n.id);
    if (rs) h += row(T.respTime, T.respVal(rs.last, rs.med, rs.n));
    else if (controllable(n) || n.demoValues) h += row(T.respTime, `<span style="color:var(--muted)">${T.respNone}</span>`);
    if (n.type === "routing_end_device") {
      const f = fwdHits[n.id] || [];
      h += row(T.forwarded, T.forwardedVal(f.filter(t => now - t < HEAT_MS).length, f.length));
    }
    h += `</dl>`;
    // current values
    if (hass && (n.mainEntities || []).length) {
      let v = "";
      for (const id of n.mainEntities.slice(0, 10)) {
        const st = hass.states[id]; if (!st) continue;
        const name = deName((st.attributes.friendly_name || id).replace(n.name, "").trim()) || T.state;
        v += row(name, `${esc(fmtState(st))} <span style="color:var(--muted)">· ${T.ago(Math.max(0, Math.round((now - new Date(st.last_changed)) / 1000)))}</span>`);
      }
      if (v) h += `<h4>${T.secValues}</h4><dl>${v}</dl>`;
    } else if (DEMO && n.demoValues) {
      h += `<h4>${T.secValues}</h4><dl>` + n.demoValues.map(([k, v, ago]) => row(k, `${esc(v)} <span style="color:var(--muted)">· ${T.ago(ago)}</span>`)).join("") + `</dl>`;
    }
    // battery
    if (battOf[n.id] !== undefined || i.batType) {
      const b = battOf[n.id];
      h += `<h4>${T.secBattery}</h4><dl>` + row(T.level, b !== undefined ? `<span class="${b < 20 ? "r" : b < 40 ? "o" : "g"}">${b} %</span>` : "") + row(T.type, esc(i.batType)) + `</dl>`;
    }
    // thread
    const links = (linksOf[n.id] || []).slice().sort((p, q) => q.rssi - p.rssi);
    const par = links.filter(l => l.kind === "parent"), kids = links.filter(l => l.kind === "child"), nb = links.filter(l => l.kind === "neighbour");
    h += `<h4>${T.secThread}</h4><dl>` + row(T.role, esc(T.roles[n.role] || T.types[n.type] || ""));
    for (const l of par) h += row(T.parent, `${esc(l.name)} · ${rssiTxt(l.rssi)}`);
    if (nb.length) h += row(`${T.neighbours} (${nb.length})`, nb.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (kids.length) h += row(`${T.children} (${kids.length})`, kids.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    h += row(T.address, `<span style="font-family:monospace">${esc(n.id)}</span>`) + `</dl><div class="note">${T.stale}</div>`;
    // stability
    if ([i.reboots, i.detached, i.attach, i.parentChanges].some(x => x !== undefined && x !== null)) {
      h += `<h4>${T.secStability}</h4><dl>` + row(T.reboots, i.reboots) + row(T.bootReason, i.bootReason !== undefined && i.bootReason !== null ? esc(T.bootReasons[i.bootReason] || i.bootReason) : "") +
           row(T.detached, i.detached) + row(T.attach, i.attach) + row(T.parentChanges, i.parentChanges) + `</dl><div class="note">${T.sinceRestart}</div>`;
    }
    // device
    h += `<h4>${T.secDevice}</h4><dl>` + row(T.manufacturer, esc(i.vendor || "")) + row(T.model, esc(i.product || "")) +
         row(T.firmware, esc(i.sw || "")) + row(T.hardware, esc(i.hw || "")) + row(T.area, esc(n.area || "")) + `</dl>`;
    if (n.devId && !DEMO) h += `<button class="btn" data-device="${esc(n.devId)}">${T.openDevice} ↗</button>`;
    $("panel").innerHTML = h;
  }
  function openDevice(devId) {
    host.navigate("/config/devices/device/" + devId);
  }
  every(() => { if (panelNode) renderPanel(); }, 5000);
