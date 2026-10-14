// Mesh health: one grade (A–E) with the factors behind it (issue #84).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { esc, nameOf, pathToBr, powerCutOf, unstableOf } = tp;
  Object.assign(tp, { computeHealth, healthHtml, trackGrade });
  // ---------- mesh health (issue #84) ----------
  // A rule of thumb, not a measurement: six factors from the same data as the map, each "ok", "check" or "problem".
  // check = 1 point, problem = 2; 0 → A, 1 → B, 2–3 → C, 4–5 → D, 6+ → E. The factors are always shown next to the
  // grade – a single letter hides too much. Battery devices only report their parent, so redundancy can only be
  // judged for routers. Thresholds: weak = below −80 dBm (as the link colours); unstable as for the warnings.
  const HEALTH_POINTS = { ok: 0, warn: 1, bad: 2, na: 0 };
  const HEALTH_COLOR = { ok: "#2e7d32", warn: "#ef6c00", bad: "#c62828", na: "var(--muted)" };
  tp.HEALTH_COLOR = HEALTH_COLOR;
  // routers in the mesh: from the routing tables (also routers Home Assistant has no device for), else what the map shows
  const routerCount = () =>
    Object.keys(tp.ridToId).length ||
    Object.values(tp.nodeById).filter(n => n.type === "routing_end_device").length + tp.extraIds.size;
  tp.routerCount = routerCount;
  const gradeOf = p => (p === 0 ? "A" : p === 1 ? "B" : p <= 3 ? "C" : p <= 5 ? "D" : "E");
  function computeHealth(nm = nameOf) {
    if (!tp.listData) return null;
    const nodes = Object.values(tp.nodeById),
      routers = nodes.filter(n => n.type === "routing_end_device");
    const isRouterId = id => (tp.nodeById[id] && tp.nodeById[id].type === "routing_end_device") || tp.extraIds.has(id);
    const list = ids => ids.map(nm).join(", ");
    const factors = [];
    const add = (key, level, value, text, ids = []) => factors.push({ key, level, value, text, ids }); // ids: shown on the map (#108)

    // 1. routers: every mains-powered Thread device can route; with only the border router everything depends on it
    const nR = routerCount();
    add(
      "routers",
      nR <= 1 ? "bad" : nR === 2 ? "warn" : "ok",
      tp.T.hvRouters(nR),
      nR <= 1 ? tp.T.htRoutersOne : nR === 2 ? tp.T.htRoutersTwo : tp.T.htRoutersOk,
    );

    // 2. redundancy: routers with fewer than two good links to other routers lose their part of the mesh with one router
    if (!routers.length)
      add("redundancy", "na", "–", tp.T.htRedundancyNoData); // e.g. only Apple border routers: their links are not reported
    else if (nR < 3) add("redundancy", "na", "–", tp.T.htRedundancyNa);
    else {
      const single = routers
        .filter(
          r =>
            (tp.linksOf[r.id] || []).filter(l => l.kind === "neighbour" && isRouterId(l.id) && l.rssi >= -80).length <
            2,
        )
        .map(r => r.id);
      add(
        "redundancy",
        !single.length ? "ok" : single.length === 1 || single.length / routers.length <= 0.25 ? "warn" : "bad",
        tp.T.hvOf(routers.length - single.length, routers.length),
        single.length ? tp.T.htRedundancyBad(list(single)) : tp.T.htRedundancyOk,
        single,
      );
    }

    // 3. weak parent signal
    const kids = tp.listData.parents.filter(p => tp.nodeById[p.childId]);
    const weak = kids.filter(p => p.rssi < -80).map(p => p.childId);
    add(
      "weak",
      !weak.length ? "ok" : weak.length <= 2 || weak.length / Math.max(kids.length, 1) <= 0.15 ? "warn" : "bad",
      tp.T.hvOf(weak.length, kids.length),
      weak.length ? tp.T.htWeakBad(list(weak)) : tp.T.htWeakOk,
      weak,
    );

    // 4. hops to the border router (only when the border router is known)
    if (!tp.brExt) add("depth", "na", "–", tp.T.htDepthNa);
    else {
      const hops = nodes
        .map(n => {
          const p = pathToBr(n.id);
          return p ? { id: n.id, h: p.length - 1 } : null;
        })
        .filter(Boolean);
      const max = Math.max(0, ...hops.map(x => x.h)),
        deep = hops.filter(x => x.h >= 4).map(x => x.id);
      add(
        "depth",
        max <= 3 ? "ok" : max === 4 ? "warn" : "bad",
        tp.T.hvHops(max),
        deep.length ? tp.T.htDepthBad(list(deep)) : tp.T.htDepthOk,
        deep,
      );
    }

    // 5. children per router: many devices on one router = many devices affected when it fails
    const per = {};
    for (const p of kids) per[p.parentId] = (per[p.parentId] || 0) + 1;
    const [topId, top] = Object.entries(per).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    const crowded =
      top > 20 ? "bad" : top > 10 || (kids.length >= 6 && top / kids.length > 0.6 && nR >= 3) ? "warn" : "ok";
    add(
      "children",
      crowded,
      tp.T.hvMax(top),
      topId && crowded !== "ok" ? tp.T.htChildrenBad(nm(topId), top, kids.length) : tp.T.htChildrenOk,
      topId && crowded !== "ok" ? [topId, ...kids.filter(p => p.parentId === topId).map(p => p.childId)] : [],
    );

    // 6. stability: unstable connection, not reachable, router that loses power regularly
    const shaky = nodes
      .filter(n => {
        return !n.available || unstableOf(n) || powerCutOf(n);
      })
      .map(n => n.id); // within the time window (#24)
    add(
      "stability",
      !shaky.length ? "ok" : shaky.length <= 2 ? "warn" : "bad",
      tp.T.hvOf(shaky.length, nodes.length),
      shaky.length ? tp.T.htStabilityBad(list(shaky)) : tp.T.htStabilityOk,
      shaky,
    );

    const points = factors.reduce((s, f) => s + HEALTH_POINTS[f.level], 0);
    return { grade: gradeOf(points), points, factors, known: factors.filter(f => f.level !== "na").length };
  }
  const gradeColor = g => (g <= "B" ? HEALTH_COLOR.ok : g === "C" ? HEALTH_COLOR.warn : HEALTH_COLOR.bad);
  tp.gradeColor = gradeColor;
  function healthHtml(inPanel = false) {
    // section in the list and in the border router panel
    const h = computeHealth();
    if (!h) return "";
    // with unknown factors the grade is incomplete – say so next to it, an "A" must not look better than the data
    const grade =
      `<span class="grade" style="background:${gradeColor(h.grade)}">${h.grade}</span>` +
      (h.known < h.factors.length
        ? ` <span style="color:var(--muted);font-weight:400;font-size:12px">${tp.T.healthPartial(h.known, h.factors.length)}</span>`
        : "");
    return (
      `<div class="health">` +
      (inPanel
        ? `<h4>${tp.T.healthHead}</h4><div>${tp.T.healthGrade} ${grade}</div>`
        : `<b>${tp.T.healthHead}: ${grade}</b>`) +
      `<table>${h.factors
        .map(
          f =>
            `<tr><td style="vertical-align:top;white-space:nowrap"><span style="color:${HEALTH_COLOR[f.level]}">●</span> ${tp.T.hfTitle[f.key]}</td>` +
            `<td>${f.level === "na" ? "" : `<b style="color:${HEALTH_COLOR[f.level]}">${esc(f.value)}</b> · `}${esc(f.text)}</td></tr>`,
        )
        .join("")}</table>` +
      `<div style="color:var(--muted);font-size:12px;margin:2px 0 10px">${tp.T.healthNote}</div></div>`
    );
  }
  // grade changes in the change log – only when the new grade was seen on two refreshes in a row (no flapping)
  let gradeLogged,
    gradePending = null;
  function trackGrade(g) {
    if (!g) return;
    if (gradeLogged === undefined) {
      gradeLogged = g;
      return;
    }
    if (g === gradeLogged) {
      gradePending = null;
      return;
    }
    if (gradePending !== g) {
      gradePending = g;
      return;
    }
    tp.logChange("mesh", tp.T.meshName, tp.T.chGrade(gradeLogged, g), g < gradeLogged ? "gradeUp" : "gradeDown");
    gradeLogged = g;
    gradePending = null;
  }
}
