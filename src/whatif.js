//# "What if this router fails?" – single points of failure (issue #77).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- what if a router fails (issue #77) ----------
  // An estimate from the last reported neighbour tables: the router is removed from the graph of router-to-router
  // links, and every router that no longer reaches the border router is cut off (with its devices). Devices that use the
  // router as parent: mains devices report their neighbours – another router in reach is an alternative; battery
  // devices only report their parent, so whether another router can reach them is unknown. Thread repairs itself:
  // a device may find a parent that is not in its current table.
  const ALT_MIN = -85; // weaker links rarely carry a connection for long
  const isRouterNode = id => (nodeById[id] && nodeById[id].type === "routing_end_device") || extraIds.has(id);
  function routerGraph() {
    const g = {};
    for (const [id, links] of Object.entries(linksOf))
      if (isRouterNode(id))
        for (const l of links)
          if (l.kind === "neighbour" && isRouterNode(l.id)) {
            (g[id] = g[id] || new Set()).add(l.id);
            (g[l.id] = g[l.id] || new Set()).add(id);
          }
    return g;
  }
  function whatIf(failId, g = routerGraph()) {
    let cut = [],
      brKnown = !!(brExt && g[brExt]);
    if (brKnown && failId !== brExt) {
      const seen = new Set([brExt]),
        q = [brExt];
      while (q.length) {
        const x = q.shift();
        for (const y of g[x] || [])
          if (y !== failId && !seen.has(y)) {
            seen.add(y);
            q.push(y);
          }
      }
      cut = Object.keys(g).filter(id => id !== failId && !seen.has(id));
    }
    const lost = new Set([failId, ...cut]);
    const kids = (listData ? listData.parents : []).filter(p => lost.has(p.parentId) && nodeById[p.childId]);
    const children = kids
      .filter(p => p.parentId === failId)
      .map(p => {
        const n = nodeById[p.childId];
        const alt =
          (linksOf[p.childId] || [])
            .filter(l => l.kind === "neighbour" && isRouterNode(l.id) && !lost.has(l.id) && l.rssi >= ALT_MIN)
            .sort((a, b) => b.rssi - a.rssi)[0] || null;
        return { id: p.childId, alt, battery: n.type === "sleepy_end_device" };
      });
    const viaCut = kids.filter(p => p.parentId !== failId).map(p => p.childId);
    const noAlt = children.filter(c => !c.alt).length + cut.length + viaCut.length;
    return {
      failId,
      cut,
      children,
      viaCut,
      brKnown,
      noAlt,
      total: children.length + cut.length + viaCut.length,
      ids: [failId, ...children.map(c => c.id), ...cut, ...viaCut],
    };
  }
  function whatIfHtml(id) {
    // section in the panel of a router
    if (id === brExt || !listData) return "";
    const w = whatIf(id),
      names = ids => ids.map(x => esc(nameOf(x))).join(", ");
    let h = `<h4>${T.secWhatIf}</h4>`;
    if (!w.total) h += `<div>${T.wiNone}</div>`;
    if (w.children.length)
      h +=
        `<div>${T.wiKids(w.children.length)}</div><ul class="wi">` +
        w.children
          .map(
            c =>
              `<li>${esc(nameOf(c.id))} – ` +
              (c.alt
                ? `<span class="g">${esc(T.wiAlt(nameOf(c.alt.id), c.alt.rssi))}</span>`
                : `<span class="o">${esc(c.battery ? T.wiBattUnknown : T.wiNoAlt)}</span>`) +
              `</li>`,
          )
          .join("") +
        `</ul>`;
    if (w.cut.length)
      h +=
        `<div><span class="r">${T.wiCut(w.cut.length)}</span> ${names(w.cut)}` +
        (w.viaCut.length ? ` · ${esc(T.wiViaCut(w.viaCut.length))}: ${names(w.viaCut)}` : "") +
        `</div>`;
    if (!w.brKnown) h += `<div class="note">${T.wiBrUnknown}</div>`;
    if (w.total) h += `<button class="btn" data-mark="${esc(w.ids.join(","))}">${T.wiShow}</button>`;
    return h + `<div class="note">${T.wiNote}</div>`;
  }
  function dependHtml() {
    // ranking in the "Links" tab of the network panel
    const g = routerGraph();
    const rows = Object.keys(g)
      .filter(id => id !== brExt)
      .map(id => whatIf(id, g))
      .filter(w => w.total)
      .sort((a, b) => b.noAlt - a.noAlt || b.total - a.total);
    if (!rows.length) return "";
    return (
      `<h4>${T.wiHead}</h4><table class="lk"><tr><th>${T.thRouter}</th><th>${T.thDepend}</th><th>${T.thNoAlt}</th></tr>` +
      rows
        .map(
          w =>
            `<tr class="mark" data-mark="${esc(w.ids.join(","))}" title="${esc(T.markHint)}"><td>${esc(nameOf(w.failId))}</td><td>${w.total}</td>` +
            `<td class="${w.noAlt ? "o" : "g"}">${w.noAlt}</td></tr>`,
        )
        .join("") +
      `</table>` +
      `<div class="tnote">${T.wiTabNote}</div>`
    );
  }
