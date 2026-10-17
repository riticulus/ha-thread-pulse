// Guided diagnosis: why is a device offline or unstable? (issue #123)
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.
// Turns the numbers Thread Pulse already has into likely causes, each with what to do next. Rule-based: every finding
// says "likely" or "possible", never certain. Checked in this order: drop-outs in the change log, signal to the parent,
// the parent losing power or being unreachable, the device itself losing power, unstable connection, battery, radio
// channel overlap, another Thread network.

export default function install(tp) {
  const { esc, nameOf } = tp;
  Object.assign(tp, { diagnose, diagnoseHtml });
  const DAY_MS = 86400000;

  // the Thread network most devices are in (extended PAN ID)
  function mainNetwork() {
    const ids = Object.values(tp.nodeById)
      .map(n => ((n.info || {}).net || {}).extPanId)
      .filter(x => x !== undefined && x !== null)
      .map(String);
    return ids.sort((a, b) => ids.filter(x => x === b).length - ids.filter(x => x === a).length)[0] || null;
  }

  // → { offline: number of drop-outs in the window, findings: [{ level: "likely" | "possible", text, todo }] }
  function diagnose(n, nm = nameOf) {
    const T = tp.T,
      days = tp.HINT_DAYS,
      since = Date.now() - days * DAY_MS,
      out = [];
    const add = (level, text, todo) => out.push({ level, text, todo });
    const offline = (tp.changes || []).filter(c => c.id === n.id && c.kind === "offline" && c.t >= since).length;

    // signal to the parent, and the parent itself
    if (n.type !== "routing_end_device" && tp.listData) {
      const p = tp.listData.parents.find(x => x.childId === n.id);
      if (p) {
        if (p.rssi < -80) add("likely", T.dgWeak(nm(p.parentId), p.rssi), T.dgWeakTodo);
        else if (p.rssi < -75) add("possible", T.dgWeak(nm(p.parentId), p.rssi), T.dgWeakTodo);
        const parent = tp.nodeById[p.parentId];
        if (parent && !parent.available) add("likely", T.dgParentDown(nm(p.parentId)), T.dgParentDownTodo);
        else if (parent && tp.powerCutOf(parent)) {
          const s = tp.stabilityOf(parent);
          add("likely", T.dgParentPower(nm(p.parentId), s.reboots), T.dgPowerTodo);
        }
      }
    }
    // the device itself
    if (n.type === "routing_end_device" && tp.powerCutOf(n))
      add("likely", T.dgOwnPower(tp.stabilityOf(n).reboots), T.dgPowerTodo);
    if (tp.unstableOf(n) && !out.length) {
      const s = tp.stabilityOf(n);
      add("possible", T.dgUnstable(s.attach, s.detached), T.dgUnstableTodo);
    }
    // battery
    const b = tp.battOf[n.id],
      f = tp.battForecast[n.id];
    if (b !== undefined && b < 20) add("likely", T.dgBattery(b), T.dgBatteryTodo);
    else if (f && f.state === "ok" && f.days <= 30) add("possible", T.dgBatterySoon(f.days), T.dgBatteryTodo);
    // radio channels (#78, #120): Thread inside a Wi-Fi channel or on the Zigbee channel
    if (tp.spectrumIssues().some(x => x.kinds.includes("thread"))) add("possible", T.dgChannel, T.dgChannelTodo);
    // another Thread network than the others
    const own = ((n.info || {}).net || {}).extPanId,
      main = mainNetwork();
    if (own !== undefined && own !== null && main && String(own) !== main)
      add("likely", T.dgOtherNet(((n.info || {}).net || {}).name || "?"), T.dgOtherNetTodo);

    if (!n.available && !out.length) add("possible", T.dgUnknown, T.dgUnknownTodo);
    out.sort((a, c) => (a.level === c.level ? 0 : a.level === "likely" ? -1 : 1));
    return { offline, days, findings: out };
  }

  // section in the device panel: only for a device that is offline, dropped out or is unstable
  function diagnoseHtml(n) {
    const d = diagnose(n);
    if (n.available && !d.offline && !d.findings.length) return "";
    const T = tp.T;
    let h = `<h4>${T.secDiag}</h4>`;
    if (!n.available) h += `<div><b class="r">${esc(T.dgNow)}</b></div>`;
    if (d.offline) h += `<div>${esc(T.dgOffline(d.offline, d.days))}</div>`;
    if (!d.findings.length) h += `<div>${esc(T.dgNothing)}</div>`;
    for (const x of d.findings)
      h +=
        `<div class="dg"><b class="${x.level === "likely" ? "r" : "o"}">${esc(x.level === "likely" ? T.dgLikely : T.dgPossible)}:</b> ${esc(x.text)}` +
        `<div class="note">→ ${esc(x.todo)}</div></div>`;
    return h + `<div class="note">${T.dgNote}</div>`;
  }
}
