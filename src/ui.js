//# List and legend, errors, loading, keyboard and click handling.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- UI ----------
  let hintCount = 0;
  function setList(show, save = true) {
    $("info").classList.toggle("hidden", !show);
    setBtn($("toggle"), T.netBtn, show, hintCount, hintCount ? T.listHints(hintCount) : "");
    if (show) renderTabBar();              // opening the change log tab marks its entries as seen
    if (save) prefs.set("list", show);
    if (network && save) setTimeout(() => { network.redraw(); network.fit({ animation: { duration: 300 } }); }, 50);
  }
  function setLegend(show, save = true) {
    $("legend").classList.toggle("hidden", !show);
    const t = (show ? T.hideLegend : T.showLegend).replace(/^\S+\s/, "");       // the button shows "?", the text is its tooltip
    $("legbtn").title = t; $("legbtn").setAttribute("aria-label", t); $("legbtn").setAttribute("aria-expanded", String(show));
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
    setMoreMenu(false);
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
    loadMsgHistory(m.hass);               // reports of the last hour for the chattiest devices (#80)
    return m;
  }

  applyColorVars();
  theme();

  root.addEventListener("keydown", e => { if (e.key === "Escape" && !$("report").hidden) return closeReport(); if (e.key === "Escape" && !$("moremenu").hidden) { setMoreMenu(false); $("morebtn").focus(); return; } if (e.key === "Escape" && e.target.id !== "search") { if (markedIds && panelNode === null) clearMarks(); closePanel(); } });
  root.addEventListener("pointerdown", e => { if (!e.target.closest || !e.target.closest("#morebox")) setMoreMenu(false); });

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
    else if (t.dataset.act === "unmark") clearMarks();
    else if (t.dataset.device) openDevice(t.dataset.device);
    else if (t.dataset.identify) pressIdentify(t.dataset.identify);
  });
