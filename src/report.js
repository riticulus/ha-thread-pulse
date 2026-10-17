// Text report of the mesh for forum posts and issues, anonymised by default (issue #85).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.
import { VERSION } from "./version.js";

export default function install(tp) {
  const {
    $,
    DEMO,
    anonLabels,
    anonRoomMap,
    batteryHint,
    brTitleOf,
    computeHealth,
    computeHints,
    freshHass,
    nameOf,
    setMoreMenu,
    slowHint,
    spectrumIssues,
    spectrumNets,
    threadChannel,
    usefulModel,
    warningsOf,
  } = tp;
  Object.assign(tp, { closeReport, copyReport, showReport });
  // ---------- text report (issue #85) ----------
  // A Markdown summary of what the map shows: devices and roles, border routers, channel, links, weak spots. Shown in a
  // window with a preview before it is copied, so the user sees exactly what is shared. Anonymised: the same device and
  // room labels as the anonymised image (as long as the map has not moved). Never contains the network key, network
  // name, PAN IDs or addresses – not even in the version with names.
  let reportAnon = true;
  const md = t =>
    String(t)
      .replace(/\|/g, "\\|")
      .replace(/\s*\n\s*/g, " ")
      .trim(); // one table cell
  function reportNames(anon) {
    // map id → name in the report
    const names = {};
    if (anon) for (const l of anonLabels()) names[l.id] = l.label;
    else for (const id of Object.keys(tp.nodeById).concat(Object.keys(tp.wifiById))) names[id] = nameOf(id);
    // other routers: no address suffix; numbered when the same label occurs more than once
    const extras = [...tp.extraIds]
      .filter(id => id !== tp.brExt)
      .map(id => {
        const d = tp.brInfo[id];
        return {
          id,
          label: d ? (anon ? usefulModel(d) || tp.T.brLabel : brTitleOf(d)) : tp.T.foreignLabel(id).split("\n")[0],
        };
      });
    const count = {},
      seen = {};
    for (const x of extras) count[x.label] = (count[x.label] || 0) + 1;
    for (const x of extras)
      names[x.id] = count[x.label] > 1 ? `${x.label} ${(seen[x.label] = (seen[x.label] || 0) + 1)}` : x.label;
    if (tp.brExt) names[tp.brExt] = tp.T.brLabel;
    return id => names[id] || tp.T.foreignLabel(id).split("\n")[0];
  }
  function reportText(anon) {
    if (!tp.listData) return "";
    const nm = reportNames(anon),
      rooms = anon ? anonRoomMap() : null,
      hass = DEMO ? null : freshHass();
    const nodes = Object.values(tp.nodeById),
      routers = nodes.filter(n => n.type === "routing_end_device");
    const isRouterId = id => (tp.nodeById[id] && tp.nodeById[id].type === "routing_end_device") || tp.extraIds.has(id);
    const cnt = t => nodes.filter(n => n.type === t).length;
    const when = new Date().toLocaleString(tp.lang, { dateStyle: "medium", timeStyle: "short" });
    const haVer = hass && hass.config && hass.config.version;
    const L = [
      `### ${tp.T.rTitle} – Thread Pulse ${VERSION}`,
      [haVer && `Home Assistant ${haVer}`, when, anon && tp.T.rAnonNote].filter(Boolean).join(" · "),
      "",
      "| | |",
      "|---|---|",
    ];
    const row = (k, v) => L.push(`| ${md(k)} | ${md(v)} |`);
    row(tp.T.rThreadDevices, tp.T.rDevices(nodes.length, routers.length, cnt("end_device"), cnt("sleepy_end_device")));
    const off = nodes.filter(n => !n.available).length;
    if (off) row(tp.T.rUnreachable, String(off));
    const others = [...tp.extraIds].filter(id => id !== tp.brExt),
      brs = others.filter(id => tp.brInfo[id]);
    const brList = (tp.brExt ? [tp.threadInfo && tp.threadInfo.otbr ? tp.T.rOtbr : tp.T.brLabel] : []).concat(
      brs.map(nm),
    );
    if (brList.length) row(tp.T.rBorderRouters, brList.join(", "));
    if (others.length > brs.length) row(tp.T.rOtherRouters, String(others.length - brs.length));
    // channel: from the OpenThread add-on, else the preferred dataset, else what most devices report
    const ch = threadChannel();
    if (ch) row(tp.T.channel, String(ch));
    const sp = spectrumNets().filter(n => n.kind !== "thread"); // #120
    if (sp.length) row(tp.T.rChannels, sp.map(n => `${tp.T.spNames[n.kind]} ${n.ch}`).join(" · "));
    const wifi = Object.keys(tp.wifiById).length;
    if (wifi) row(tp.T.rWifi, String(wifi));
    const health = computeHealth(nm);
    if (health)
      row(
        tp.T.healthHead,
        health.grade +
          (health.known < health.factors.length
            ? " (" + tp.T.healthPartial(health.known, health.factors.length) + ")"
            : ""),
      );

    // devices: routers first, then by name (numeric: "Device 2" before "Device 10")
    const order = { routing_end_device: 0, end_device: 1, sleepy_end_device: 2 };
    const sorted = nodes
      .slice()
      .sort((a, b) => order[a.type] - order[b.type] || nm(a.id).localeCompare(nm(b.id), tp.lang, { numeric: true }));
    L.push(
      "",
      `**${tp.T.rDevicesHead}**`,
      "",
      `| ${tp.T.thDevice} | ${tp.T.area} | ${tp.T.model} | ${tp.T.firmware} | ${tp.T.rRole} | ${tp.T.rConnection} |`,
      "|---|---|---|---|---|---|",
    );
    for (const n of sorted) {
      const i = n.info || {},
        area = n.area ? (rooms ? rooms[n.area] : n.area) : "–";
      // routers: their links to other routers; other devices: their parent – mains end devices without one (empty
      // neighbour table) are only known from the routers' tables, so their router links are shown instead
      const p = n.type === "routing_end_device" ? null : tp.listData.parents.find(x => x.childId === n.id);
      const rl = (tp.linksOf[n.id] || []).filter(l => l.kind === "neighbour" && isRouterId(l.id));
      const conn = p
        ? `${tp.T.thVia} ${nm(p.parentId)} · ${p.rssi} dBm${p.src === "device" ? " " + tp.T.selfMeasured : ""}`
        : n.type !== "sleepy_end_device"
          ? tp.T.rRouterLinks(rl.length, rl.length ? Math.max(...rl.map(l => l.rssi)) : 0)
          : "–";
      const role = (tp.T.types[n.type] || n.type) + (n.available ? "" : tp.T.unreachable);
      L.push(
        `| ${[nm(n.id), area, [i.vendor, i.product].filter(Boolean).join(" ") || "–", i.sw || "–", role, conn].map(md).join(" | ")} |`,
      );
    }

    if (health) {
      L.push(
        "",
        `**${tp.T.healthHead}: ${health.grade}** (${tp.T.rHealthNote}${health.known < health.factors.length ? "; " + tp.T.healthPartial(health.known, health.factors.length) : ""})`,
        "",
      );
      for (const f of health.factors)
        L.push(
          `- ${tp.T.hlLevel[f.level]} · ${tp.T.hfTitle[f.key]}: ${f.level === "na" ? "" : md(f.value) + " – "}${md(f.text)}`,
        );
    }
    if (tp.listData.weak.length) {
      L.push("", `**${tp.T.weakHead}** ${tp.T.weakSub}`, "");
      for (const w of tp.listData.weak) L.push(`- ${md(nm(w.a))} ↔ ${md(nm(w.b))}: ${w.r} dBm`);
    }
    const hs = computeHints(tp.listData.parents, nm);
    const items = sorted.flatMap(n =>
      warningsOf(n)
        .concat(hs[n.id] || [], slowHint(n) || [], batteryHint(n) || [])
        .map(t => `- **${md(nm(n.id))}**: ${md(t)}`),
    );
    for (const n of sorted.filter(n => !n.available)) // #123: likely causes for devices that are offline
      for (const f of tp.diagnose(n, nm).findings)
        items.push(
          `- **${md(nm(n.id))}**: ${md(f.level === "likely" ? tp.T.dgLikely : tp.T.dgPossible)}: ${md(f.text)} → ${md(f.todo)}`,
        );
    for (const x of spectrumIssues(nm)) items.push(`- **${md(tp.T.secSpectrum)}**: ${md(x.text)}`);
    L.push("", `**${tp.T.rWarnHead}**`, "", ...(items.length ? items : [tp.T.noHints]));
    return L.join("\n") + "\n";
  }
  function showReport() {
    setMoreMenu(false);
    if (!tp.network || !tp.listData) return;
    const box = $("report");
    box.innerHTML =
      `<div class="hd"><b>${tp.T.reportHead}</b><button class="x" data-act="reportclose" aria-label="${tp.T.reportClose}">×</button></div>` +
      `<label class="chk"><input type="checkbox" id="reportanon"${reportAnon ? " checked" : ""}> ${tp.T.reportAnon}</label>` +
      `<textarea id="reporttext" readonly spellcheck="false"></textarea>` +
      `<div class="ft"><button class="btn" data-act="reportcopy">${tp.T.reportCopy}</button> <span id="reportmsg"></span></div>` +
      `<div class="note">${tp.T.reportNote}</div>`;
    $("reporttext").value = reportText(reportAnon);
    $("reportanon").onchange = e => {
      reportAnon = e.target.checked;
      $("reporttext").value = reportText(reportAnon);
      $("reportmsg").textContent = "";
    };
    box.hidden = false;
  }
  function closeReport() {
    const b = $("report");
    if (b) b.hidden = true;
  }
  async function copyReport() {
    const ta = $("reporttext"),
      msg = $("reportmsg");
    const ok = (good, t) => {
      msg.className = good ? "g" : "";
      msg.textContent = t;
    };
    // the clipboard API needs a secure context (https) – Home Assistant is often opened via plain http in the home network
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ta.value);
        return ok(true, tp.T.reportCopied);
      }
    } catch (e) {}
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let done = false;
    try {
      done = document.execCommand("copy");
    } catch (e) {}
    ok(done, done ? tp.T.reportCopied : tp.T.reportCopyManual);
  }
}
