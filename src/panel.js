// Badges on the map and the detail panel.
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const {
    $,
    AMBIENT,
    COLORS,
    DEMO,
    HEAT_MS,
    QUAL,
    counts,
    esc,
    every,
    extraLabel,
    extraName,
    fmtState,
    fwdHits,
    host,
    iconImg,
    localName,
    prefs,
  } = tp;
  Object.assign(tp, {
    closePanel,
    drawBadges,
    freshHass,
    liveRows,
    openDevice,
    openPanel,
    pill,
    refreshBattery,
    renderPanel,
    row,
    warningsOf,
  });
  // ---------- badges and detail panel ----------
  tp.panelNode = null;
  function freshHass() {
    try {
      return host.hass();
    } catch (e) {
      return null;
    }
  }
  function refreshBattery(hass) {
    tp.battOf = {};
    for (const n of Object.values(tp.nodeById)) {
      if (n.demoBattery !== undefined) {
        tp.battOf[n.id] = n.demoBattery;
        continue;
      }
      if (!hass) continue;
      for (const id of n.entities || []) {
        const st = hass.states[id];
        if (
          st &&
          st.attributes.device_class === "battery" &&
          st.attributes.unit_of_measurement === "%" &&
          !isNaN(parseFloat(st.state))
        ) {
          tp.battOf[n.id] = Math.round(parseFloat(st.state));
          break;
        }
      }
    }
  }
  function warningsOf(n) {
    const w = [];
    // thresholds from real networks: normal is 0–2 attempts, 1–2 drop-offs; counted within the time window (#24)
    const s = tp.stabilityOf(n),
      off = tp.isDismissed(n, "unstable");
    if (s.attach >= 5 && !off) w.push(s.known ? tp.T.warnAttachRecent(s.attach, s.days) : tp.T.warnAttach(s.attach));
    if (s.detached >= 3 && !off)
      w.push(s.known ? tp.T.warnDetachedRecent(s.detached, s.days) : tp.T.warnDetached(s.detached));
    if (tp.battOf[n.id] !== undefined && tp.battOf[n.id] < 20) w.push(tp.T.warnBattery(tp.battOf[n.id]));
    return w;
  }
  function pill(ctx, x, y, text, bg) {
    ctx.font = "600 10px -apple-system, Segoe UI, Roboto, sans-serif";
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = bg;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y - 7, w, 14, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 4, y + 0.5);
  }
  function drawBadges(ctx) {
    const pos = tp.network.getPositions();
    for (const n of Object.values(tp.nodeById)) {
      const p = pos[n.id];
      if (!p) continue;
      const r = n.type === "routing_end_device" ? 20 : 14;
      ctx.save();
      if (tp.searchActive && !tp.searchHits.includes(n.id)) ctx.globalAlpha = 0.18;
      if (tp.battOf[n.id] !== undefined) {
        const b = tp.battOf[n.id];
        pill(
          ctx,
          p.x + r * 0.55,
          p.y + r * 0.75,
          b + "%",
          b < 20 ? COLORS.weak : b < 40 ? COLORS.medium : COLORS.battOk,
        );
      }
      if (!warningsOf(n).length && ((tp.hintsOf[n.id] || []).length || tp.slowHint(n) || tp.batteryHint(n))) {
        const x = p.x + r * 0.75,
          y = p.y - r * 0.85;
        ctx.fillStyle = COLORS.hint;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 10px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("i", x, y + 0.5);
      }
      if (warningsOf(n).length) {
        ctx.fillStyle = COLORS.warn;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        const x = p.x + r * 0.75,
          y = p.y - r * 0.95;
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 8, y + 6);
        ctx.lineTo(x - 8, y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", x, y + 1.5);
      }
      tp.drawUpdateBadge(ctx, p, r, n.id);
      ctx.restore();
    }
  }

  let ambientClose = null;
  function openPanel(id) {
    if (id !== tp.panelNode) $("panel").scrollTop = 0;
    tp.panelNode = id;
    renderPanel();
    $("panel").hidden = false;
    if (!prefs.get("tapped")) prefs.set("tapped", true);
    if (AMBIENT) {
      clearTimeout(ambientClose);
      ambientClose = setTimeout(closePanel, 15000);
    } // ambient: close by itself
  }
  function closePanel() {
    tp.panelNode = null;
    $("panel").hidden = true;
    if (tp.network) tp.network.unselectAll();
  }
  function row(k, v) {
    return v === undefined || v === null || v === "" ? "" : `<dt>${esc(k)}</dt><dd>${v}</dd>`;
  }
  function rssiTxt(r) {
    const [, cls, txt] = QUAL(r);
    return `<span class="${cls}">${r} dBm · ${txt}</span>`;
  }
  // ---------- detail panel of the border router and other Thread routers (issue #36) ----------
  function liveRows(id) {
    const c = counts[id],
      now = Date.now(),
      inWin = (arr, ms) => arr.filter(t => now - t < ms).length;
    if (!c) return row(tp.T.msgsTotal, tp.T.none);
    return (
      row(tp.T.msgsTotal, `${c.total}`) +
      row(tp.T.msgsMin, `${inWin(c.up, 60000)} ${tp.T.toHa} · ${inWin(c.down, 60000)} ${tp.T.fromHa}`) +
      row(tp.T.msgsHour, `${inWin(c.up, 3600000)} ${tp.T.toHa} · ${inWin(c.down, 3600000)} ${tp.T.fromHa}`) +
      row(tp.T.lastMsg, `${tp.T.ago(Math.round((now - c.last.t) / 1000))} (${c.last.down ? tp.T.fromHa : tp.T.toHa})`)
    );
  }
  function discRows(d, withNetwork = true) {
    // what the border router announces on the network (issue #37)
    if (!d) return "";
    return (
      row(tp.T.manufacturer, esc(d.vendor)) +
      row(tp.T.model, esc(d.model)) +
      row(tp.T.brName, esc(d.name)) +
      row(tp.T.threadVersion, esc(d.version)) +
      (withNetwork ? row(tp.T.networkName, esc(d.network)) : "")
    );
  }
  function renderRouterPanel(id) {
    const isBr = id === tp.brExt,
      nodes = Object.values(tp.nodeById);
    const disc = tp.brInfo[id];
    let h =
      tp.backHtml() +
      `<div class="hd"><img src="${iconImg(isBr || disc ? "access-point-network" : "router-wireless", isBr ? COLORS.br : COLORS.off, 80)}" alt=""><div>` +
      `<div class="t">${esc(extraLabel(id).replaceAll("\n", " "))}</div><div class="s">${esc(isBr ? tp.T.brSub : tp.brInfo[id] ? tp.T.brOtherSub : tp.T.foreignSub)}</div></div>` +
      `<button class="x" title="×" data-act="close">×</button></div>`;
    if (isBr || counts[id])
      h +=
        `<h4>${tp.T.secLive} · ${tp.T.msgsThrough}</h4><dl>` +
        liveRows(id) +
        `</dl>` +
        (isBr ? "" : `<div class="note">${tp.T.parentHopNote}</div>`);
    if (isBr) {
      // network values: OTBR / preferred dataset first, else what the Matter devices report
      const ds =
        ((tp.threadInfo && tp.threadInfo.datasets) || []).find(d => d.preferred) ||
        ((tp.threadInfo && tp.threadInfo.datasets) || [])[0];
      const nets = nodes.map(n => (n.info || {}).net).filter(x => x && x.name);
      const net = nets[0] || {};
      // datasets give hex strings, the Matter diagnostics give decimal numbers
      const fromHex = (v, len) => String(v).toLowerCase().padStart(len, "0").toUpperCase();
      const fromDec = (v, len) => BigInt(v).toString(16).padStart(len, "0").toUpperCase();
      const panId =
        ds && ds.panId
          ? fromHex(ds.panId, 4)
          : net.panId !== undefined && net.panId !== null
            ? fromDec(net.panId, 4)
            : "";
      const extPanId = ds && ds.extPanId ? fromHex(ds.extPanId, 16) : net.extPanId ? fromDec(net.extPanId, 16) : "";
      const leaders = nodes.map(n => (n.info || {}).leader).filter(x => x !== undefined && x !== null);
      const leaderRid = leaders.sort(
        (a, b) => leaders.filter(x => x === b).length - leaders.filter(x => x === a).length,
      )[0];
      const leaderId = leaderRid !== undefined ? tp.ridToId[leaderRid] : null;
      const leaderName = !leaderId ? "" : tp.nodeById[leaderId] ? tp.nodeById[leaderId].name : extraName(leaderId);
      const routers = tp.routerCount();
      h +=
        `<h4>${tp.T.secNetwork}</h4><dl>` +
        row(tp.T.networkName, esc((ds && ds.name) || net.name || "")) +
        row(
          tp.T.channel,
          esc(
            String(
              (tp.threadInfo && tp.threadInfo.otbr && tp.threadInfo.otbr.channel) ||
                (ds && ds.channel) ||
                net.channel ||
                "",
            ),
          ),
        ) +
        row(tp.T.panId, panId ? `<span style="font-family:monospace">0x${esc(panId)}</span>` : "") +
        row(tp.T.extPanId, extPanId ? `<span style="font-family:monospace">${esc(extPanId)}</span>` : "") +
        row(tp.T.routersInMesh, tp.T.ofMax(routers)) +
        row(tp.T.devicesInMesh, String(nodes.length + tp.extraIds.size)) +
        row(tp.T.leader, esc(leaderName)) +
        `</dl>` +
        tp.healthHtml(true) +
        tp.spectrumSection();
      const o =
        tp.threadInfo &&
        tp.threadInfo.otbr &&
        tp.threadInfo.otbr.extAddr &&
        tp.threadInfo.otbr.extAddr.toLowerCase() === id
          ? tp.threadInfo.otbr
          : null;
      h +=
        `<h4>${tp.T.secBorderRouter}</h4><dl>` +
        row(tp.T.brKind, o ? esc(tp.T.brOtbr) : "") +
        discRows(disc, false) +
        row(tp.T.address, `<span style="font-family:monospace">${esc(id)}</span>`) +
        row(
          tp.T.borderAgent,
          o && o.borderAgentId ? `<span style="font-family:monospace">${esc(o.borderAgentId)}</span>` : "",
        );
      const dsl = (tp.threadInfo && tp.threadInfo.datasets) || [];
      if (dsl.length)
        h += row(
          tp.T.datasets,
          dsl
            .map(
              d =>
                `${esc(d.name)} · ${esc(tp.T.channel)} ${esc(String(d.channel))}${d.preferred ? ` · <b>${tp.T.preferred}</b>` : ""}`,
            )
            .join("<br>"),
        );
      h += `</dl>`;
    }
    if (!isBr && disc)
      h +=
        `<h4>${tp.T.secBorderRouter}</h4><dl>` +
        discRows(disc) +
        (tp.brExt ? row(tp.T.usedByHa, esc(tp.T.usedByHaNo)) : "") +
        `</dl><div class="note">${tp.T.brOtherNote}</div>`;
    if (!isBr) h += tp.whatIfHtml(id); // issue #77
    const links = (tp.linksOf[id] || []).slice().sort((p, q) => q.rssi - p.rssi);
    const nb = links.filter(l => l.kind === "neighbour"),
      kids = links.filter(l => l.kind === "child");
    h += `<h4>${tp.T.secThread}</h4><dl>`;
    if (nb.length)
      h += row(`${tp.T.neighbours} (${nb.length})`, nb.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (kids.length)
      h += row(`${tp.T.children} (${kids.length})`, kids.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (!isBr) h += row(tp.T.address, `<span style="font-family:monospace">${esc(id)}</span>`);
    h += `</dl><div class="note">${isBr ? tp.T.stale : tp.T.foreignNote}</div>`;
    $("panel").innerHTML = h;
  }
  function renderPanel() {
    if (tp.wifiById[tp.panelNode]) return tp.renderWifiPanel(tp.panelNode);
    if (!tp.nodeById[tp.panelNode] && tp.extraIds.has(tp.panelNode)) return renderRouterPanel(tp.panelNode);
    const n = tp.nodeById[tp.panelNode];
    if (!n) return closePanel();
    const i = n.info || {},
      hass = DEMO ? null : freshHass();
    if (hass) refreshBattery(hass);
    const color = !n.available
      ? COLORS.off
      : n.type === "routing_end_device"
        ? COLORS.router
        : n.type === "end_device"
          ? COLORS.end
          : COLORS.sleepy;
    const sec = [],
      add = (g, x) => {
        if (x) sec.push([g, x]);
      }; // groups for the tabbed panel (layouts B and D)
    let h =
      `<div class="hd"><img src="${iconImg(n.icon, color, 80)}" alt=""><div><div class="t">${esc(n.name)}</div>` +
      `<div class="s">${esc(tp.T.roles[n.role] || tp.T.types[n.type] || "")}${n.area ? " · " + esc(n.area) : ""}${n.available ? "" : esc(tp.T.unreachable)}</div></div>` +
      `<button class="x" title="×" data-act="close">×</button></div>`;
    for (const w of warningsOf(n)) h += `<div class="warn">⚠ ${esc(w)}</div>`;
    add("top", h);
    h = "";
    const hs = (tp.hintsOf[n.id] || []).concat(tp.slowHint(n) || [], tp.batteryHint(n) || []);
    if (hs.length)
      h +=
        `<h4>${tp.T.secHints}</h4>` +
        hs
          .map(t => {
            const k = tp.hintKind(n.id, t);
            return `<div class="hint">💡 ${esc(t)}${k ? `<div><button class="btn small" data-dismiss="${esc(n.id + "|" + k)}">${tp.T.hintDone}</button></div>` : ""}</div>`;
          })
          .join("") +
        `<div class="note">${tp.T.hintsNote}</div>`;
    add("status", h);
    h = "";
    // live
    const now = Date.now();
    h += `<h4>${tp.T.secLive}</h4><dl>` + liveRows(n.id);
    const rs = tp.respSummary(n.id);
    if (rs) h += row(tp.T.respTime, tp.T.respVal(rs.last, rs.med, rs.n));
    else if (tp.controllable(n) || n.demoValues)
      h += row(tp.T.respTime, `<span style="color:var(--muted)">${tp.T.respNone}</span>`);
    if (n.type === "routing_end_device") {
      const f = fwdHits[n.id] || [];
      h += row(tp.T.forwarded, tp.T.forwardedVal(f.filter(t => now - t < HEAT_MS).length, f.length));
    }
    h += `</dl>`;
    add("link", h);
    h = "";
    // current values
    if (hass && (n.mainEntities || []).length) {
      let v = "";
      for (const id of n.mainEntities.slice(0, 10)) {
        const st = hass.states[id];
        if (!st) continue;
        const name = localName((st.attributes.friendly_name || id).replace(n.name, "").trim()) || tp.T.state;
        v += row(
          name,
          `${esc(fmtState(st))} <span style="color:var(--muted)">· ${tp.T.ago(Math.max(0, Math.round((now - new Date(st.last_changed)) / 1000)))}</span>`,
        );
      }
      if (v) h += `<h4>${tp.T.secValues}</h4><dl>${v}</dl>`;
    } else if (DEMO && n.demoValues) {
      h +=
        `<h4>${tp.T.secValues}</h4><dl>` +
        n.demoValues
          .map(([k, v, ago]) => row(k, `${esc(v)} <span style="color:var(--muted)">· ${tp.T.ago(ago)}</span>`))
          .join("") +
        `</dl>`;
    }
    // battery
    if (tp.battOf[n.id] !== undefined || i.batType) {
      const b = tp.battOf[n.id];
      h +=
        `<h4>${tp.T.secBattery}</h4><dl>` +
        row(tp.T.level, b !== undefined ? `<span class="${b < 20 ? "r" : b < 40 ? "o" : "g"}">${b} %</span>` : "") +
        row(tp.T.type, esc(i.batType)) +
        row(tp.T.bfLabel, tp.forecastText(tp.battForecast[n.id])) +
        `</dl>` +
        (tp.battForecast[n.id] && tp.battForecast[n.id].state === "ok"
          ? `<div class="note">${tp.T.bfNote}</div>`
          : "") +
        tp.batteryTrendHtml(n);
    }
    add("status", h);
    h = "";
    // thread
    const links = (tp.linksOf[n.id] || []).slice().sort((p, q) => q.rssi - p.rssi);
    const par = links.filter(l => l.kind === "parent"),
      kids = links.filter(l => l.kind === "child"),
      nb = links.filter(l => l.kind === "neighbour");
    h += `<h4>${tp.T.secThread}</h4><dl>` + row(tp.T.role, esc(tp.T.roles[n.role] || tp.T.types[n.type] || ""));
    for (const l of par) h += row(tp.T.parent, `${esc(l.name)} · ${rssiTxt(l.rssi)}`);
    if (nb.length)
      h += row(`${tp.T.neighbours} (${nb.length})`, nb.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    if (kids.length)
      h += row(`${tp.T.children} (${kids.length})`, kids.map(l => `${esc(l.name)} · ${rssiTxt(l.rssi)}`).join("<br>"));
    h +=
      row(tp.T.address, `<span style="font-family:monospace">${esc(n.hwAddr || n.id)}</span>`) +
      `</dl><div class="note">${tp.T.stale}</div>`;
    h += tp.signalTrendHtml(n);
    if (n.type === "routing_end_device") h += tp.whatIfHtml(n.id); // issue #77
    add("link", h);
    h = "";
    // stability
    if ([i.reboots, i.detached, i.attach, i.parentChanges].some(x => x !== undefined && x !== null)) {
      h +=
        `<h4>${tp.T.secStability}</h4><dl>` +
        row(tp.T.reboots, i.reboots) +
        row(
          tp.T.bootReason,
          i.bootReason !== undefined && i.bootReason !== null
            ? esc(tp.T.bootReasons[i.bootReason] || i.bootReason)
            : "",
        ) +
        row(tp.T.detached, i.detached) +
        row(tp.T.attach, i.attach) +
        row(tp.T.parentChanges, i.parentChanges) +
        (st =>
          row(
            tp.T.stabWindow(st.days),
            st.known
              ? esc(tp.T.stabWindowVal(st.reboots, st.attach, st.detached))
              : `<span style="color:var(--muted)">${tp.T.trendUnknown}</span>`,
          ))(tp.stabilityOf(n)) +
        `</dl><div class="note">${tp.T.sinceRestart} ${tp.T.stabNote(tp.HINT_DAYS)}</div>`;
    }
    add("status", h);
    h = "";
    // device
    h +=
      `<h4>${tp.T.secDevice}</h4><dl>` +
      row(tp.T.manufacturer, esc(i.vendor || "")) +
      row(tp.T.model, esc(i.product || "")) +
      row(tp.T.firmware, esc(i.sw || "")) +
      row(tp.T.fwUpdate, tp.updateText(tp.updateOf(n, hass))) +
      row(tp.T.hardware, esc(i.hw || "")) +
      row(tp.T.area, esc(n.area || "")) +
      `</dl>`;
    h += tp.fabricsHtml(n);
    h += tp.identifyHtml(n, hass);
    if (n.devId && !DEMO) h += `<button class="btn" data-device="${esc(n.devId)}">${tp.T.openDevice} ↗</button>`;
    add("device", h);
    $("panel").innerHTML = tp.panelLayout(n, sec);
  }
  function openDevice(devId) {
    host.navigate("/config/devices/device/" + devId);
  }
  every(() => {
    if (tp.panelNode) renderPanel();
  }, 5000);
}
