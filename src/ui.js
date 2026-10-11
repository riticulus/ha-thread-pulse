//# List and legend, errors, loading, keyboard and click handling.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- UI ----------
  let hintCount = 0;
  function setList(show, save = true) {
    $("info").classList.toggle("hidden", !show);
    $("toggle").textContent = (show ? T.hideList : T.showList) + (hintCount ? T.listHints(hintCount) : "");
    if (save) prefs.set("list", show);
    if (network && save) setTimeout(() => { network.redraw(); network.fit({ animation: { duration: 300 } }); }, 50);
  }
  function setLegend(show, save = true) {
    $("legend").classList.toggle("hidden", !show);
    $("legbtn").textContent = show ? T.hideLegend : T.showLegend;
    if (save) prefs.set("legend", show);
  }
  function showErr(e) {
    setList(true, false);
    $("info").classList.add("errshown");
    $("status").textContent = T.error;
    $("info").innerHTML = `<div id="err">${esc(e.message || e)}</div>`;
  }
  let demoState = null;
  async function load() {
    $("status").textContent = T.loading;
    const prev = lastSnap;
    if (DEMO) {
      const m = demoState || (demoState = demoModel()); render(m); diffSnaps(prev, lastSnap); loadBatteryForecasts(null);
      setTimeout(() => { brInfo = m.routers || {}; applyRouterNames(); }, 2500);     // like the real discovery: names arrive later
      return m;
    }
    const m = await loadHa();
    await initChangeStore(m.hass);        // before the first comparison: the stored list comes from Home Assistant
    render(m);
    diffSnaps(prev, lastSnap);
    loadBatteryForecasts(m.hass);          // runs in the background, panel and badges update when it arrives
    await subscribeLive(m.hass);
    discoverRouters(m.hass);              // names of other border routers arrive in the background
    return m;
  }

  applyColorVars();
  theme();

  root.addEventListener("keydown", e => { if (e.key === "Escape" && !$("report").hidden) return closeReport(); if (e.key === "Escape") setExportMenu(false); if (e.key === "Escape" && e.target.id !== "search") closePanel(); });
  root.addEventListener("pointerdown", e => { if (!e.target.closest || !e.target.closest("#exportbox")) setExportMenu(false); });

  root.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-open],[data-act],[data-device],[data-identify]"); if (!t) return;
    e.preventDefault();
    if (t.dataset.open) openPanel(t.dataset.open);
    else if (t.dataset.act === "close") closePanel();
    else if (t.dataset.act === "export" || t.dataset.act === "exportanon") exportImage(t.dataset.act === "exportanon");
    else if (t.dataset.act === "report") showReport();
    else if (t.dataset.act === "reportclose") closeReport();
    else if (t.dataset.act === "reportcopy") copyReport();
    else if (t.dataset.act === "clearchanges") clearChanges();
    else if (t.dataset.device) openDevice(t.dataset.device);
    else if (t.dataset.identify) pressIdentify(t.dataset.identify);
  });
