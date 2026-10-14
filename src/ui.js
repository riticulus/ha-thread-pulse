// List and legend, errors, loading, keyboard and click handling.
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const {
    $,
    DEMO,
    applyColorVars,
    applyRouterNames,
    clearChanges,
    clearMarks,
    closePanel,
    closeReport,
    copyReport,
    demoModel,
    diffSnaps,
    discoverRouters,
    esc,
    exportImage,
    initChangeStore,
    loadBatteryForecasts,
    loadHa,
    loadMsgHistory,
    openDevice,
    openPanel,
    prefs,
    pressIdentify,
    render,
    root,
    setDismissed,
    setMoreMenu,
    showReport,
    subscribeLive,
    theme,
  } = tp;
  Object.assign(tp, { load, setLegend, showErr });
  // ---------- UI ----------
  tp.hintCount = 0;
  function setLegend(show, save = true) {
    $("legend").classList.toggle("hidden", !show);
    const t = (show ? tp.T.hideLegend : tp.T.showLegend).replace(/^\S+\s/, ""); // the button shows "?", the text is its tooltip
    $("legbtn").title = t;
    $("legbtn").setAttribute("aria-label", t);
    $("legbtn").setAttribute("aria-expanded", String(show));
    if (save) prefs.set("legend", show);
  }
  function showErr(e) {
    closePanel();
    $("info").classList.add("errshown");
    $("status").textContent = tp.T.error;
    $("info").innerHTML = `<div id="err">${esc(e.message || e)}</div>`;
  }
  tp.demoState = null;
  async function load() {
    setMoreMenu(false);
    $("status").textContent = tp.T.loading;
    const prev = tp.lastSnap;
    if (DEMO) {
      const m = tp.demoState || (tp.demoState = demoModel());
      render(m);
      diffSnaps(prev, tp.lastSnap);
      loadBatteryForecasts(null);
      setTimeout(() => {
        tp.brInfo = m.routers || {};
        applyRouterNames();
      }, 2500); // like the real discovery: names arrive later
      return m;
    }
    const m = await loadHa();
    await initChangeStore(m.hass); // before the first comparison: the stored list comes from Home Assistant
    render(m);
    diffSnaps(prev, tp.lastSnap);
    loadBatteryForecasts(m.hass); // runs in the background, panel and badges update when it arrives
    await subscribeLive(m.hass);
    discoverRouters(m.hass); // names of other border routers arrive in the background
    loadMsgHistory(m.hass); // reports of the last hour for the chattiest devices (#80)
    return m;
  }

  applyColorVars();
  theme();

  root.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("report").hidden) return closeReport();
    if (e.key === "Escape" && !$("moremenu").hidden) {
      setMoreMenu(false);
      $("morebtn").focus();
      return;
    }
    if (e.key === "Escape" && e.target.id !== "search") {
      if (tp.markedIds && tp.panelNode === null) clearMarks();
      closePanel();
    }
  });
  root.addEventListener("pointerdown", e => {
    if (!e.target.closest || !e.target.closest("#morebox")) setMoreMenu(false);
  });

  root.addEventListener("click", e => {
    const d = e.target.closest && e.target.closest("[data-dismiss],[data-undismiss]");
    if (d) {
      e.preventDefault();
      const [id, k] = (d.dataset.dismiss || d.dataset.undismiss).split("|");
      setDismissed(id, k, !!d.dataset.dismiss);
      return;
    } // #24
    const t = e.target.closest && e.target.closest("[data-open],[data-act],[data-device],[data-identify]");
    if (!t) return;
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
}
