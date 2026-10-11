//# Search (issue #9).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- search (issue #9) ----------
  // Matches device name and area (case and accents ignored). Matches stay bright and are selected, the rest fades out,
  // the map zooms to the matches. Enter opens the first match, Esc clears the search.
  const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function dimExcept(ids) {                     // ids: devices that stay bright; null: all bright
    const fg = getComputedStyle(host.styleTarget).getPropertyValue("--fg").trim() || "#1f2733";
    searchActive = !!ids; searchHits = ids || [];
    const hit = new Set(searchHits), upd = [];
    network.body.data.nodes.forEach(v => {
      const on = !ids || hit.has(v.id);
      upd.push({ id: v.id, opacity: on ? 1 : 0.18, font: { color: on ? fg : "rgba(128,128,128,.35)" } });
    });
    network.body.data.nodes.update(upd);
  }
  function fitTo(ids) {
    if (ids.length === 1) { network.selectNodes(ids); network.focus(ids[0], { scale: 1.3, animation: { duration: 400 } }); }
    else if (ids.length) { network.selectNodes(ids); network.fit({ nodes: ids, animation: { duration: 400 } }); }
  }
  function applySearch() {
    if (!network) return;
    const q = norm($("search").value.trim());
    if (q) { markedIds = null; $("markchip").hidden = true; }
    dimExcept(q ? Object.values(nodeById).concat(Object.values(wifiById)).filter(n => norm(n.name).includes(q) || norm(n.area).includes(q)).map(n => n.id) : null);
    $("hits").textContent = q ? T.hits(searchHits.length) : "";
    if (q) fitTo(searchHits);
    else { network.unselectAll(); network.fit({ animation: { duration: 400 } }); }
  }
  // devices marked from the panel below the map (issue #108): a factor of the mesh health, a weak link …
  // shown like search results; "Show all" (or Esc) ends it
  let markedIds = null;
  function markDevices(ids, fit = true) {
    if (!network || !ids.length) return;
    $("search").value = ""; markedIds = ids.slice();
    dimExcept(markedIds);
    $("hits").textContent = "";
    const c = $("markchip"); c.hidden = false;      // on the map, not in the toolbar – the toolbar must stay one row on phones
    c.innerHTML = `${esc(T.marked(markedIds.length))} · <a href="#" data-act="unmark">${esc(T.unmark)}</a>`;
    if (fit) fitTo(markedIds);
  }
  function clearMarks() {
    if (!markedIds && $("markchip").hidden) return;
    markedIds = null; $("markchip").hidden = true;
    if (network) { dimExcept(null); network.unselectAll(); network.fit({ animation: { duration: 400 } }); }
  }
  let searchTimer = null;
  $("search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(applySearch, 150); });
  $("search").addEventListener("keydown", e => {
    if (e.key === "Enter" && searchHits.length) { e.preventDefault(); openPanel(searchHits[0]); }
    else if (e.key === "Escape") { e.preventDefault(); $("search").value = ""; markedIds = null; $("markchip").hidden = true; applySearch(); $("search").blur(); }
  });
