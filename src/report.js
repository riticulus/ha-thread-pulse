//# Text report of the mesh for forum posts and issues, anonymised by default (issue #85).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- text report (issue #85) ----------
  // A Markdown summary of what the map shows: devices and roles, border routers, channel, links, weak spots. Shown in a
  // window with a preview before it is copied, so the user sees exactly what is shared. Anonymised: the same device and
  // room labels as the anonymised image (as long as the map has not moved). Never contains the network key, network
  // name, PAN IDs or addresses – not even in the version with names.
  let reportAnon = true;
  const md = t => String(t).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();     // one table cell
  function reportNames(anon) {                  // map id → name in the report
    const names = {};
    if (anon) for (const l of anonLabels()) names[l.id] = l.label;
    else for (const id of Object.keys(nodeById).concat(Object.keys(wifiById))) names[id] = nameOf(id);
    // other routers: no address suffix; numbered when the same label occurs more than once
    const extras = [...extraIds].filter(id => id !== brExt).map(id => {
      const d = brInfo[id];
      return { id, label: d ? (anon ? usefulModel(d) || T.brLabel : brTitleOf(d)) : T.foreignLabel(id).split("\n")[0] };
    });
    const count = {}, seen = {};
    for (const x of extras) count[x.label] = (count[x.label] || 0) + 1;
    for (const x of extras) names[x.id] = count[x.label] > 1 ? `${x.label} ${seen[x.label] = (seen[x.label] || 0) + 1}` : x.label;
    if (brExt) names[brExt] = T.brLabel;
    return id => names[id] || T.foreignLabel(id).split("\n")[0];
  }
  function reportText(anon) {
    if (!listData) return "";
    const nm = reportNames(anon), rooms = anon ? anonRoomMap() : null, hass = DEMO ? null : freshHass();
    const nodes = Object.values(nodeById), routers = nodes.filter(n => n.type === "routing_end_device");
    const isRouterId = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || extraIds.has(id);
    const cnt = t => nodes.filter(n => n.type === t).length;
    const when = new Date().toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
    const haVer = hass && hass.config && hass.config.version;
    const L = [`### ${T.rTitle} – Thread Pulse ${VERSION}`,
               [haVer && `Home Assistant ${haVer}`, when, anon && T.rAnonNote].filter(Boolean).join(" · "), "", "| | |", "|---|---|"];
    const row = (k, v) => L.push(`| ${md(k)} | ${md(v)} |`);
    row(T.rThreadDevices, T.rDevices(nodes.length, routers.length, cnt("end_device"), cnt("sleepy_end_device")));
    const off = nodes.filter(n => !n.available).length;
    if (off) row(T.rUnreachable, String(off));
    const others = [...extraIds].filter(id => id !== brExt), brs = others.filter(id => brInfo[id]);
    const brList = (brExt ? [threadInfo && threadInfo.otbr ? T.rOtbr : T.brLabel] : []).concat(brs.map(nm));
    if (brList.length) row(T.rBorderRouters, brList.join(", "));
    if (others.length > brs.length) row(T.rOtherRouters, String(others.length - brs.length));
    // channel: from the OpenThread add-on, else the preferred dataset, else what most devices report
    const ds = ((threadInfo && threadInfo.datasets) || []).find(d => d.preferred);
    const chs = nodes.map(n => ((n.info || {}).net || {}).channel).filter(c => c !== undefined && c !== null);
    const ch = (threadInfo && threadInfo.otbr && threadInfo.otbr.channel) || (ds && ds.channel) ||
               chs.sort((a, b) => chs.filter(c => c === b).length - chs.filter(c => c === a).length)[0];
    if (ch) row(T.channel, String(ch));
    const wifi = Object.keys(wifiById).length;
    if (wifi) row(T.rWifi, String(wifi));

    // devices: routers first, then by name (numeric: "Device 2" before "Device 10")
    const order = { routing_end_device: 0, end_device: 1, sleepy_end_device: 2 };
    const sorted = nodes.slice().sort((a, b) => order[a.type] - order[b.type] || nm(a.id).localeCompare(nm(b.id), lang, { numeric: true }));
    L.push("", `**${T.rDevicesHead}**`, "", `| ${T.thDevice} | ${T.area} | ${T.model} | ${T.firmware} | ${T.rRole} | ${T.rConnection} |`, "|---|---|---|---|---|---|");
    for (const n of sorted) {
      const i = n.info || {}, area = n.area ? (rooms ? rooms[n.area] : n.area) : "–";
      // routers: their links to other routers; other devices: their parent – mains end devices without one (empty
      // neighbour table) are only known from the routers' tables, so their router links are shown instead
      const p = n.type === "routing_end_device" ? null : listData.parents.find(x => x.childId === n.id);
      const rl = (linksOf[n.id] || []).filter(l => l.kind === "neighbour" && isRouterId(l.id));
      const conn = p ? `${T.thVia} ${nm(p.parentId)} · ${p.rssi} dBm${p.src === "device" ? " " + T.selfMeasured : ""}`
        : n.type !== "sleepy_end_device" ? T.rRouterLinks(rl.length, rl.length ? Math.max(...rl.map(l => l.rssi)) : 0) : "–";
      const role = (T.types[n.type] || n.type) + (n.available ? "" : T.unreachable);
      L.push(`| ${[nm(n.id), area, [i.vendor, i.product].filter(Boolean).join(" ") || "–", i.sw || "–", role, conn].map(md).join(" | ")} |`);
    }

    if (listData.weak.length) {
      L.push("", `**${T.weakHead}** ${T.weakSub}`, "");
      for (const w of listData.weak) L.push(`- ${md(nm(w.a))} ↔ ${md(nm(w.b))}: ${w.r} dBm`);
    }
    const hs = computeHints(listData.parents, nm);
    const items = sorted.flatMap(n => warningsOf(n).concat(hs[n.id] || [], slowHint(n) || [], batteryHint(n) || []).map(t => `- **${md(nm(n.id))}**: ${md(t)}`));
    L.push("", `**${T.rWarnHead}**`, "", ...(items.length ? items : [T.noHints]));
    return L.join("\n") + "\n";
  }
  function showReport() {
    setExportMenu(false);
    if (!network || !listData) return;
    const box = $("report");
    box.innerHTML = `<div class="hd"><b>${T.reportHead}</b><button class="x" data-act="reportclose" aria-label="${T.reportClose}">×</button></div>` +
      `<label class="chk"><input type="checkbox" id="reportanon"${reportAnon ? " checked" : ""}> ${T.reportAnon}</label>` +
      `<textarea id="reporttext" readonly spellcheck="false"></textarea>` +
      `<div class="ft"><button class="btn" data-act="reportcopy">${T.reportCopy}</button> <span id="reportmsg"></span></div>` +
      `<div class="note">${T.reportNote}</div>`;
    $("reporttext").value = reportText(reportAnon);
    $("reportanon").onchange = e => { reportAnon = e.target.checked; $("reporttext").value = reportText(reportAnon); $("reportmsg").textContent = ""; };
    box.hidden = false;
  }
  function closeReport() { const b = $("report"); if (b) b.hidden = true; }
  async function copyReport() {
    const ta = $("reporttext"), msg = $("reportmsg");
    const ok = (good, t) => { msg.className = good ? "g" : ""; msg.textContent = t; };
    // the clipboard API needs a secure context (https) – Home Assistant is often opened via plain http in the home network
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(ta.value); return ok(true, T.reportCopied); } } catch (e) {}
    ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
    let done = false;
    try { done = document.execCommand("copy"); } catch (e) {}
    ok(done, done ? T.reportCopied : T.reportCopyManual);
  }
