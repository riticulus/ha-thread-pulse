// Search (issue #9).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { $, esc, host, openPanel } = tp;
  Object.assign(tp, { applySearch, clearMarks, markDevices });
  // ---------- search (issue #9) ----------
  // Matches device name and area (case and accents ignored). Matches stay bright and are selected, the rest fades out,
  // the map zooms to the matches. Enter opens the first match, Esc clears the search.
  const norm = t =>
    String(t || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  function dimExcept(ids) {
    // ids: devices that stay bright; null: all bright
    const fg = getComputedStyle(host.styleTarget).getPropertyValue("--fg").trim() || "#1f2733";
    tp.searchActive = !!ids;
    tp.searchHits = ids || [];
    const hit = new Set(tp.searchHits),
      upd = [];
    tp.network.body.data.nodes.forEach(v => {
      const on = !ids || hit.has(v.id);
      upd.push({ id: v.id, opacity: on ? 1 : 0.18, font: { color: on ? fg : "rgba(128,128,128,.35)" } });
    });
    tp.network.body.data.nodes.update(upd);
  }
  function fitTo(ids) {
    if (ids.length === 1) {
      tp.network.selectNodes(ids);
      tp.network.focus(ids[0], { scale: 1.3, animation: { duration: 400 } });
    } else if (ids.length) {
      tp.network.selectNodes(ids);
      tp.network.fit({ nodes: ids, animation: { duration: 400 } });
    }
  }
  function applySearch() {
    if (!tp.network) return;
    const q = norm($("search").value.trim());
    if (q) {
      tp.markedIds = null;
      $("markchip").hidden = true;
    }
    dimExcept(
      q
        ? Object.values(tp.nodeById)
            .concat(Object.values(tp.wifiById))
            .filter(n => norm(n.name).includes(q) || norm(n.area).includes(q))
            .map(n => n.id)
        : null,
    );
    $("hits").textContent = q ? tp.T.hits(tp.searchHits.length) : "";
    if (q) fitTo(tp.searchHits);
    else {
      tp.network.unselectAll();
      tp.network.fit({ animation: { duration: 400 } });
    }
  }
  // devices marked from the panel below the map (issue #108): a factor of the mesh health, a weak link …
  // shown like search results; "Show all" (or Esc) ends it
  tp.markedIds = null;
  function markDevices(ids, fit = true) {
    if (!tp.network || !ids.length) return;
    $("search").value = "";
    tp.markedIds = ids.slice();
    dimExcept(tp.markedIds);
    $("hits").textContent = "";
    const c = $("markchip");
    c.hidden = false; // on the map, not in the toolbar – the toolbar must stay one row on phones
    c.innerHTML = `${esc(tp.T.marked(tp.markedIds.length))} · <a href="#" data-act="unmark">${esc(tp.T.unmark)}</a>`;
    if (fit) fitTo(tp.markedIds);
  }
  function clearMarks() {
    if (!tp.markedIds && $("markchip").hidden) return;
    tp.markedIds = null;
    $("markchip").hidden = true;
    if (tp.network) {
      dimExcept(null);
      tp.network.unselectAll();
      tp.network.fit({ animation: { duration: 400 } });
    }
  }
  let searchTimer = null;
  $("search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 150);
  });
  $("search").addEventListener("keydown", e => {
    if (e.key === "Enter" && tp.searchHits.length) {
      e.preventDefault();
      openPanel(tp.searchHits[0]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      $("search").value = "";
      tp.markedIds = null;
      $("markchip").hidden = true;
      applySearch();
      $("search").blur();
    }
  });
}
