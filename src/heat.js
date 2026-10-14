// Traffic heat on the links (issue #3).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { COLORS, every } = tp;
  Object.assign(tp, { drawHeat, recordTraffic });
  // ---------- traffic heat (issue #3) ----------
  // Every message counts on each link of its (computed) path. Shown as a glow under the links, window HEAT_MS.
  // This is an estimate of where traffic flows, based on the most likely paths – not measured radio traffic.
  const HEAT_MS = 10 * 60000;
  tp.HEAT_MS = HEAT_MS;
  tp.heatOn = true;
  let linkHits = {};
  let fwdHits = {};
  tp.fwdHits = fwdHits;
  const linkKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  tp.linkKey = linkKey;
  function recordTraffic(path) {
    const t = Date.now();
    for (let i = 0; i < path.length - 1; i++)
      (linkHits[linkKey(path[i], path[i + 1])] = linkHits[linkKey(path[i], path[i + 1])] || []).push(t);
    for (const id of path.slice(1, -1)) (fwdHits[id] = fwdHits[id] || []).push(t); // routers in the middle forwarded the message
    if (!tp.animating && tp.network) tp.network.redraw();
  }
  function pruneHeat() {
    const cut = Date.now() - HEAT_MS,
      cutH = Date.now() - 3600000;
    for (const k in linkHits) {
      linkHits[k] = linkHits[k].filter(t => t > cut);
      if (!linkHits[k].length) delete linkHits[k];
    }
    for (const k in fwdHits) {
      fwdHits[k] = fwdHits[k].filter(t => t > cutH);
      if (!fwdHits[k].length) delete fwdHits[k];
    }
  }
  function drawHeat(ctx) {
    if (!tp.heatOn || !tp.network) return;
    const keys = Object.keys(linkHits);
    if (!keys.length) return;
    const pos = tp.network.getPositions(),
      max = Math.max(...keys.map(k => linkHits[k].length));
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = COLORS.heat;
    for (const k of keys) {
      const [a, b] = k.split("|"),
        pa = pos[a],
        pb = pos[b];
      if (!pa || !pb) continue;
      const f = Math.sqrt(linkHits[k].length / max);
      ctx.globalAlpha = 0.1 + 0.3 * f;
      ctx.lineWidth = 3 + 11 * f;
      ctx.shadowColor = COLORS.heat;
      ctx.shadowBlur = 6 + 10 * f;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function updateEdgeTitles() {
    if (!tp.network) return;
    const ds = tp.network.body.data.edges,
      upd = [];
    ds.forEach(e => {
      if (e.room) return;
      const n = (linkHits[e.id] || []).length;
      const title = e.rssiTitle + (n ? "\n" + tp.T.heatTitle(n) : "");
      if (title !== e.title) upd.push({ id: e.id, title });
    });
    if (upd.length) ds.update(upd);
  }
  every(() => {
    pruneHeat();
    updateEdgeTitles();
    if (tp.network && !tp.animating) tp.network.redraw();
  }, 5000);
}
