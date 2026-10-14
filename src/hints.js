//# Weak-spot hints (issue #10).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- weak-spot hints (issue #10) ----------
  // Rules of thumb from the reported data. Thresholds: signal below −80 dBm is "weak" (same as the link colours);
  // ≥ 5 attach attempts / ≥ 3 drop-offs as for the warnings; ≥ 50 restarts in total for a router suggests it loses power regularly.
  // Note: switching a smart plug off does NOT stop it from routing – only its socket is switched – so that is not a hint.
  // nm: id → name shown in the hint (the anonymised text report passes its own, issue #85)
  // kinds of hints that can be dismissed ("Done", #24) – only for the UI (the anonymised report passes another nm)
  let hintKinds = {};
  const hintKind = (id, text) => hintKinds[id + "|" + text] || null;
  function computeHints(parents, nm = nameOf) {
    const kinds = {};
    const out = {},
      add = (id, t, kind) => {
        (out[id] = out[id] || []).push(t);
        if (kind) kinds[id + "|" + t] = kind;
      };
    const isRouterId = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || id === brExt;
    for (const n of Object.values(nodeById)) {
      const i = n.info || {},
        links = linksOf[n.id] || [];
      if (n.type !== "routing_end_device") {
        const par = links.find(l => l.kind === "parent") || links.slice().sort((a, b) => b.rssi - a.rssi)[0];
        const pinfo = parents.find(p => p.childId === n.id);
        if (par && par.rssi < -80) add(n.id, T.hWeakParent(nm(par.id), par.rssi, pinfo && pinfo.src === "device"));
      } else {
        if (powerCutOf(n) && !isDismissed(n, "power")) {
          // restarts within the time window (#24)
          const kids = links.filter(l => l.kind === "child").map(l => nm(l.id)),
            s = stabilityOf(n);
          add(
            n.id,
            s.known ? T.hPowerCutRecent(s.reboots, s.days, kids) : T.hPowerCut(i.reboots, kids) + " " + T.trendUnknown,
            "power",
          );
        }
        const rl = links.filter(l => l.kind === "neighbour" && isRouterId(l.id));
        if (rl.length) {
          const best = Math.max(...rl.map(l => l.rssi));
          if (best < -80) add(n.id, T.hEdge(best));
        }
      }
      if (unstableOf(n) && !isDismissed(n, "unstable")) add(n.id, T.hUnstable, "unstable");
      if (n.dupWith) add(n.id, T.hDupAddr(n.dupWith.map(nm).join(", ")));
      const ch = chattyHint(n);
      if (ch) add(n.id, ch); // reports unusually often (#80)
    }
    if (nm === nameOf) hintKinds = kinds;
    return out;
  }
