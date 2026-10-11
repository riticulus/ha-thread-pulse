//# Matter devices on Wi-Fi / Ethernet (issue #43).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- Matter devices on Wi-Fi / Ethernet (issue #43) ----------
  // They do not take part in the Thread mesh: shown as a separate group in a column to the right of the mesh,
  // without links and without path animation (their messages are only counted). Hidden with show_wifi: false / ?nowifi.
  const WIFI_STD = ["802.11a", "802.11b", "802.11g", "802.11n", "802.11ac", "802.11ax", "802.11ah"];
  const isWifiId = id => String(id).startsWith("wifi:");
  function placeWifi() {                            // column to the right of the mesh, sorted by name
    const ids = Object.keys(wifiById); if (!ids.length || !network) return;
    const pos = network.getPositions(), mesh = Object.keys(pos).filter(id => !isWifiId(id) && !String(id).startsWith("room:"));
    if (!mesh.length) return;
    const xs = mesh.map(id => pos[id].x), ys = mesh.map(id => pos[id].y);
    const x = Math.max(...xs) + 170, step = 75, y0 = (Math.min(...ys) + Math.max(...ys)) / 2 - (ids.length - 1) * step / 2;
    ids.sort((a, b) => wifiById[a].name.localeCompare(wifiById[b].name)).forEach((id, i) => network.moveNode(id, x, y0 + i * step));
  }
  function drawWifiLabel(ctx) {
    const ids = Object.keys(wifiById); if (!ids.length || !network) return;
    const pos = network.getPositions(), top = ids.map(id => pos[id]).filter(Boolean).reduce((a, p) => (!a || p.y < a.y ? p : a), null);
    if (!top) return;
    ctx.save(); ctx.font = "600 12px -apple-system, Segoe UI, Roboto, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = COLORS.wifi; ctx.fillText(T.lgWifi.toUpperCase(), top.x, top.y - 30); ctx.restore();
  }
  const wifiQual = r => r >= -60 ? ["g", T.good] : r >= -70 ? ["o", T.medium] : ["r", T.weak];   // Wi-Fi uses other limits than Thread
  function renderWifiPanel(id) {
    const w = wifiById[id], i = w.info || {}, hass = DEMO ? null : freshHass(), now = Date.now();
    let h = `<div class="hd"><img src="${iconImg(w.icon, w.available ? COLORS.wifi : COLORS.off, 80)}" alt=""><div><div class="t">${esc(w.name)}</div>` +
            `<div class="s">${esc(w.kind === "ethernet" ? T.ethSub : T.wifiSub)}${w.area ? " · " + esc(w.area) : ""}${w.available ? "" : esc(T.unreachable)}</div></div>` +
            `<button class="x" title="×" data-act="close">×</button></div>`;
    const rs = respSummary(id);
    h += `<h4>${T.secLive}</h4><dl>` + liveRows(id) + (rs ? row(T.respTime, T.respVal(rs.last, rs.med, rs.n)) : "") + `</dl>`;
    let v = "";
    if (hass) for (const e of (w.mainEntities || []).slice(0, 10)) {
      const st = hass.states[e]; if (!st) continue;
      const name = localName((st.attributes.friendly_name || e).replace(w.name, "").trim()) || T.state;
      v += row(name, `${esc(fmtState(st))} <span style="color:var(--muted)">· ${T.ago(Math.max(0, Math.round((now - new Date(st.last_changed)) / 1000)))}</span>`);
    }
    else if (DEMO && w.demoValues) v = w.demoValues.map(([k, val, ago]) => row(k, `${esc(val)} <span style="color:var(--muted)">· ${T.ago(ago)}</span>`)).join("");
    if (v) h += `<h4>${T.secValues}</h4><dl>${v}</dl>`;
    if (w.kind === "wifi" && (i.rssi !== undefined || i.channel !== undefined)) {
      const q = typeof i.rssi === "number" ? wifiQual(i.rssi) : null;
      h += `<h4>${T.secWifi}</h4><dl>` + row(T.thSignal, q ? `<span class="${q[0]}">${i.rssi} dBm · ${q[1]}</span>` : "") +
           row(T.channel, i.channel !== undefined && i.channel !== null ? esc(String(i.channel)) : "") + row(T.wifiStd, esc(WIFI_STD[i.wifiVersion] || "")) +
           `</dl><div class="note">${T.wifiNote}</div>`;
    }
    if (i.reboots !== undefined && i.reboots !== null)
      h += `<h4>${T.secStability}</h4><dl>` + row(T.reboots, i.reboots) + row(T.bootReason, i.bootReason !== undefined && i.bootReason !== null ? esc(T.bootReasons[i.bootReason] || i.bootReason) : "") + `</dl>`;
    h += `<h4>${T.secDevice}</h4><dl>` + row(T.manufacturer, esc(i.vendor || "")) + row(T.model, esc(i.product || "")) +
         row(T.firmware, esc(i.sw || "")) + row(T.fwUpdate, updateText(updateOf(w, hass))) + row(T.hardware, esc(i.hw || "")) + row(T.area, esc(w.area || "")) + `</dl>`;
    h += fabricsHtml(w);
    h += identifyHtml(w, hass);
    if (w.devId && !DEMO) h += `<button class="btn" data-device="${esc(w.devId)}">${T.openDevice} ↗</button>`;
    $("panel").innerHTML = h;
  }
