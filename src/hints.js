//# Weak-spot hints (issue #10).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- weak-spot hints (issue #10) ----------
  // Rules of thumb from the reported data. Thresholds: signal below −80 dBm is "weak" (same as the link colours);
  // ≥ 5 attach attempts / ≥ 3 drop-offs as for the warnings; ≥ 50 restarts in total for a router suggests it loses power regularly.
  // Note: switching a smart plug off does NOT stop it from routing – only its socket is switched – so that is not a hint.
  // nm: id → name shown in the hint (the anonymised text report passes its own, issue #85)
  function computeHints(parents, nm = nameOf) {
    const out = {}, add = (id, t) => (out[id] = out[id] || []).push(t);
    const isRouterId = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || id === brExt;
    for (const n of Object.values(nodeById)) {
      const i = n.info || {}, links = linksOf[n.id] || [];
      if (n.type !== "routing_end_device") {
        const par = links.find(l => l.kind === "parent") || links.slice().sort((a, b) => b.rssi - a.rssi)[0];
        const pinfo = parents.find(p => p.childId === n.id);
        if (par && par.rssi < -80) add(n.id, T.hWeakParent(nm(par.id), par.rssi, pinfo && pinfo.src === "device"));
      } else {
        if (i.reboots >= 50) {
          const kids = links.filter(l => l.kind === "child").map(l => nm(l.id));
          add(n.id, T.hPowerCut(i.reboots, kids));
        }
        const rl = links.filter(l => l.kind === "neighbour" && isRouterId(l.id));
        if (rl.length) { const best = Math.max(...rl.map(l => l.rssi)); if (best < -80) add(n.id, T.hEdge(best)); }
      }
      if (i.attach >= 5 || i.detached >= 3) add(n.id, T.hUnstable);
      if (n.dupWith) add(n.id, T.hDupAddr(n.dupWith.map(nm).join(", ")));
      const ch = chattyHint(n); if (ch) add(n.id, ch);                  // reports unusually often (#80)
    }
    return out;
  }
