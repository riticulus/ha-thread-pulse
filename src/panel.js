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
    // thresholds from real networks: normal is 0–2 attempts, 1–2 drop-offs; counted within the time window (#24)
    const s = stabilityOf(n), off = isDismissed(n, "unstable");
    if (s.attach >= 5 && !off) w.push(s.known ? T.warnAttachRecent(s.attach, s.days) : T.warnAttach(s.attach));
    if (s.detached >= 3 && !off) w.push(s.known ? T.warnDetachedRecent(s.detached, s.days) : T.warnDetached(s.detached));
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
        pill(ctx, p.x + r * 0.55, p.y + r * 0.75, b + "%", b < 20 ? COLORS.weak : b < 40 ? COLORS.medium : COLORS.battOk);
      }
      if (!warningsOf(n).length && ((hintsOf[n.id] || []).length || slowHint(n) || batteryHint(n))) {
        const x = p.x + r * 0.75, y = p.y - r * 0.85;
        ctx.fillStyle = COLORS.hint; ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 10px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("i", x, y + 0.5);
      }
      if (warningsOf(n).length) {
        ctx.fillStyle = COLORS.warn; ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
        const x = p.x + r * 0.75, y = p.y - r * 0.95;
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", x, y + 1.5);
      }
      drawUpdateBadge(ctx, p, r, n.id);
      ctx.restore();
    }
  }

  let ambientClose = null;
  function openPanel(id) {
    if (id !== panelNode) $("panel").scrollTop = 0;
    panelNode = id; renderPanel(); $("panel").hidden = false;
    if (!prefs.get("tapped")) prefs.set("tapped", true);
    if (AMBIENT) { clearTimeout(ambientClose); ambientClose = setTimeout(closePanel, 15000); }    // ambient: close by itself
  }
  function closePanel() { panelNode = null; $("panel").hidden = true; if (network) network.unselectAll(); }
  function row(k, v) { return v === undefined || v === null || v === "" ? "" : `<dt>${esc(k)}</dt><dd>${v}</dd>`; }
  function rssiTxt(r) { const [, cls, txt] = QUAL(r); return `<span class="${cls}">${r} dBm · ${txt}</span>`; }
  // ---------- detail panel of the border router and other Thread routers (issue #36) ----------
  function liveRows(id) {
    const c = counts[id], now = Date.now(), inWin = (arr, ms) => arr.filter(t => now - t < ms).length;
    if (!c) return row(T.msgsTotal, T.none);
    return row(T.msgsTotal, `${c.total}`) +
      row(T.msgsMin, `${inWin(c.up, 60000)} ${T.toHa} · ${inWin(c.down, 60000)} ${T.fromHa}`) +
      row(T.msgsHour, `${inWin(c.up, 3600000)} ${T.toHa} · ${inWin(c.down, 3600000)} ${T.fromHa}`) +
      row(T.lastMsg, `${T.ago(Math.round((now - c.last.t) / 1000))} (${c.last.down ? T.fromHa : T.toHa})`);
  }
  function discRows(d, withNetwork = true) {   // what the border router announces on the network (issue #37)
    if (!d) return "";
    return row(T.manufacturer, esc(d.vendor)) + row(T.model, esc(d.model)) + row(T.brName, esc(d.name)) +
           row(T.threadVersion, esc(d.version)) + (withNetwork ? row(T.networkName, esc(d.network)) : "");
  }
  function renderRouterPanel(id) {
    const isBr = id === brExt, nodes = Object.values(nodeById);
    const disc = brInfo[id];
    let h = backHtml() + `<div class="hd"><img src="${iconImg(isBr || disc ? "access-point-network" : "router-wireless", isBr ? COLORS.br : COLORS.off, 80)}" alt=""><div>` +
            `<div class="t">${esc(extraLabel(id).replaceAll("\n", " "))}</div><div class="s">${esc(isBr ? T.brSub : brInfo[id] ? T.brOtherSub : T.foreignSub)}</div></div>` +
            `<button class="x" title="×" data-act="close">×</button></div>`;
    if (isBr || counts[id]) h += `<h4>${T.secLive} · ${T.msgsThrough}</h4><dl>` + liveRows(id) + `</dl>` + (isBr ? "" : `<div class="note">${T.parentHopNote}</div>`);
    if (isBr) {
      // network values: OTBR / preferred dataset first, else what the Matter devices report
      const ds = (threadInfo && threadInfo.datasets || []).find(d => d.preferred) || (threadInfo && threadInfo.datasets || [])[0];
      const nets = nodes.map(n => (n.info || {}).net).filter(x => x && x.name);
      const net = nets[0] || {};
      // datasets give hex strings, the Matter diagnostics give decimal numbers
      const fromHex = (v, len) => String(v).toLowerCase().padStart(len, "0").toUpperCase();
      const fromDec = (v, len) => BigInt(v).toString(16).padStart(len, "0").toUpperCase();
      const panId = ds && ds.panId ? fromHex(ds.panId, 4) : net.panId !== undefined && net.panId !== null ? fromDec(net.panId, 4) : "";
      const extPanId = ds && ds.extPanId ? fromHex(ds.extPanId, 16) : net.extPanId ? fromDec(net.extPanId, 16) : "";
      const leaders = nodes.map(n => (n.info || {}).leader).filter(x => x !== undefined && x !== null);
      const leaderRid = leaders.sort((a, b) => leaders.filter(x => x === b).length - leaders.filter(x => x === a).length)[0];
      const leaderId = leaderRid !== undefined ? ridToId[leaderRid] : null;
      const leaderName = !leaderId ? "" : nodeById[leaderId] ? nodeById[leaderId].name : extraName(leaderId);
      const routers = routerCount();
      h += `<h4>${T.secNetwork}</h4><dl>` +
        row(T.networkName, esc((ds && ds.name) || net.name || "")) +
        row(T.channel, esc(String((threadInfo && threadInfo.otbr && threadInfo.otbr.channel) || (ds && ds.channel) || net.channel || ""))) +
        row(T.panId, panId ? `<span style="font-family:monospace">0x${esc(panId)}</span>` : "") +
        row(T.extPanId, extPanId ? `<span style="font-family:monospace">${esc(extPanId)}</span>` : "") +
        row(T.routersInMesh, T.ofMax(routers)) +
        row(T.devicesInMesh, String(nodes.length + extraIds.size)) +
        row(T.leader, esc(leaderName)) + `</dl>` + healthHtml(true) + spectrumSection();
      const o = threadInfo && threadInfo.otbr && threadInfo.otbr.extAddr && threadInfo.otbr.extAddr.toLowerCase() === id ? threadInfo.otbr : null;
      h += `<h4>${T.secBorderRouter}</h4><dl>` + row(T.brKind, o ? esc(T.brOtbr) : "") + discRows(disc, false) +
        row(T.address, `<span style="font-family:monospace">${esc(id)}</span>`) +
        row(T.borderAgent, o && o.borderAgentId ? `<span style="font-family:monospace">${esc(o.borderAgentId)}</span>` : "");
      const dsl = threadInfo && threadInfo.datasets || [];
      if (dsl.length) h += row(T.datasets, dsl.map(d => `${esc(d.name)} · ${esc(T.channel)} ${esc(String(d.channel))}${d.preferred ? ` · <b>${T.preferred}</b>` : ""}`).join("<br>"));
      h += `</dl>`;
    }
    if (!isBr && disc) h += `<h4>${T.secBorderRouter}</h4><dl>` + discRows(disc) +
      (brExt ? row(T.usedByHa, esc(T.usedByHaNo)) : "") + `</dl><div class="note">${T.brOtherNote}</div>`;
    if (!isBr) h += whatIfHtml(id);                                       // issue #77
    const links = (linksOf[id] || []).slice().sort((p, q) => q.rssi - p.rssi);
    const nb = links.filter(l => l.kind === "neighbour"), kids = links.filter(l => l.kind === "child");
    h += `<h4>${T.secThread}</h4><dl>`;
    if (nb.length) h += row(`${T.neighbours} (${nb.length})`, nb.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (kids.length) h += row(`${T.children} (${kids.length})`, kids.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (!isBr) h += row(T.address, `<span style="font-family:monospace">${esc(id)}</span>`);
    h += `</dl><div class="note">${isBr ? T.stale : T.foreignNote}</div>`;
    $("panel").innerHTML = h;
  }
  function renderPanel() {
    if (wifiById[panelNode]) return renderWifiPanel(panelNode);
    if (!nodeById[panelNode] && extraIds.has(panelNode)) return renderRouterPanel(panelNode);
    const n = nodeById[panelNode]; if (!n) return closePanel();
    const i = n.info || {}, hass = DEMO ? null : freshHass();
    if (hass) refreshBattery(hass);
    const color = !n.available ? COLORS.off : n.type === "routing_end_device" ? COLORS.router : n.type === "end_device" ? COLORS.end : COLORS.sleepy;
    const sec = [], add = (g, x) => { if (x) sec.push([g, x]); };      // groups for the tabbed panel (layouts B and D)
    let h = `<div class="hd"><img src="${iconImg(n.icon, color, 80)}" alt=""><div><div class="t">${esc(n.name)}</div>` +
            `<div class="s">${esc(T.roles[n.role] || T.types[n.type] || "")}${n.area ? " · " + esc(n.area) : ""}${n.available ? "" : esc(T.unreachable)}</div></div>` +
            `<button class="x" title="×" data-act="close">×</button></div>`;
    for (const w of warningsOf(n)) h += `<div class="warn">⚠ ${esc(w)}</div>`;
    add("top", h); h = "";
    const hs = (hintsOf[n.id] || []).concat(slowHint(n) || [], batteryHint(n) || []);
    if (hs.length) h += `<h4>${T.secHints}</h4>` + hs.map(t => { const k = hintKind(n.id, t);
      return `<div class="hint">💡 ${esc(t)}${k ? `<div><button class="btn small" data-dismiss="${esc(n.id + "|" + k)}">${T.hintDone}</button></div>` : ""}</div>`; }).join("") + `<div class="note">${T.hintsNote}</div>`;
    add("status", h); h = "";
    // live
    const now = Date.now();
    h += `<h4>${T.secLive}</h4><dl>` + liveRows(n.id);
    const rs = respSummary(n.id);
    if (rs) h += row(T.respTime, T.respVal(rs.last, rs.med, rs.n));
    else if (controllable(n) || n.demoValues) h += row(T.respTime, `<span style="color:var(--muted)">${T.respNone}</span>`);
    if (n.type === "routing_end_device") {
      const f = fwdHits[n.id] || [];
      h += row(T.forwarded, T.forwardedVal(f.filter(t => now - t < HEAT_MS).length, f.length));
    }
    h += `</dl>`;
    add("link", h); h = "";
    // current values
    if (hass && (n.mainEntities || []).length) {
      let v = "";
      for (const id of n.mainEntities.slice(0, 10)) {
        const st = hass.states[id]; if (!st) continue;
        const name = localName((st.attributes.friendly_name || id).replace(n.name, "").trim()) || T.state;
        v += row(name, `${esc(fmtState(st))} <span style="color:var(--muted)">· ${T.ago(Math.max(0, Math.round((now - new Date(st.last_changed)) / 1000)))}</span>`);
      }
      if (v) h += `<h4>${T.secValues}</h4><dl>${v}</dl>`;
    } else if (DEMO && n.demoValues) {
      h += `<h4>${T.secValues}</h4><dl>` + n.demoValues.map(([k, v, ago]) => row(k, `${esc(v)} <span style="color:var(--muted)">· ${T.ago(ago)}</span>`)).join("") + `</dl>`;
    }
    // battery
    if (battOf[n.id] !== undefined || i.batType) {
      const b = battOf[n.id];
      h += `<h4>${T.secBattery}</h4><dl>` + row(T.level, b !== undefined ? `<span class="${b < 20 ? "r" : b < 40 ? "o" : "g"}">${b} %</span>` : "") + row(T.type, esc(i.batType)) +
           row(T.bfLabel, forecastText(battForecast[n.id])) + `</dl>` + (battForecast[n.id] && battForecast[n.id].state === "ok" ? `<div class="note">${T.bfNote}</div>` : "") +
           batteryTrendHtml(n);
    }
    add("status", h); h = "";
    // thread
    const links = (linksOf[n.id] || []).slice().sort((p, q) => q.rssi - p.rssi);
    const par = links.filter(l => l.kind === "parent"), kids = links.filter(l => l.kind === "child"), nb = links.filter(l => l.kind === "neighbour");
    h += `<h4>${T.secThread}</h4><dl>` + row(T.role, esc(T.roles[n.role] || T.types[n.type] || ""));
    for (const l of par) h += row(T.parent, `${esc(l.name)} · ${rssiTxt(l.rssi)}`);
    if (nb.length) h += row(`${T.neighbours} (${nb.length})`, nb.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (kids.length) h += row(`${T.children} (${kids.length})`, kids.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    h += row(T.address, `<span style="font-family:monospace">${esc(n.hwAddr || n.id)}</span>`) + `</dl><div class="note">${T.stale}</div>`;
    h += signalTrendHtml(n);
    if (n.type === "routing_end_device") h += whatIfHtml(n.id);          // issue #77
    add("link", h); h = "";
    // stability
    if ([i.reboots, i.detached, i.attach, i.parentChanges].some(x => x !== undefined && x !== null)) {
      h += `<h4>${T.secStability}</h4><dl>` + row(T.reboots, i.reboots) + row(T.bootReason, i.bootReason !== undefined && i.bootReason !== null ? esc(T.bootReasons[i.bootReason] || i.bootReason) : "") +
           row(T.detached, i.detached) + row(T.attach, i.attach) + row(T.parentChanges, i.parentChanges) +
           (st => row(T.stabWindow(st.days), st.known ? esc(T.stabWindowVal(st.reboots, st.attach, st.detached)) : `<span style="color:var(--muted)">${T.trendUnknown}</span>`))(stabilityOf(n)) +
           `</dl><div class="note">${T.sinceRestart} ${T.stabNote(HINT_DAYS)}</div>`;
    }
    add("status", h); h = "";
    // device
    h += `<h4>${T.secDevice}</h4><dl>` + row(T.manufacturer, esc(i.vendor || "")) + row(T.model, esc(i.product || "")) +
         row(T.firmware, esc(i.sw || "")) + row(T.fwUpdate, updateText(updateOf(n, hass))) + row(T.hardware, esc(i.hw || "")) + row(T.area, esc(n.area || "")) + `</dl>`;
    h += fabricsHtml(n);
    h += identifyHtml(n, hass);
    if (n.devId && !DEMO) h += `<button class="btn" data-device="${esc(n.devId)}">${T.openDevice} ↗</button>`;
    add("device", h);
    $("panel").innerHTML = panelLayout(n, sec);
  }
  function openDevice(devId) {
    host.navigate("/config/devices/device/" + devId);
  }
  every(() => { if (panelNode) renderPanel(); }, 5000);
