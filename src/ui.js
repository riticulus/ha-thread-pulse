//# List and legend, errors, loading, keyboard and click handling.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- UI ----------
  let hintCount = 0;
  function setList(show, save = true) {
    $("info").classList.toggle("hidden", !show);
    $("toggle").textContent = (show ? T.hideList : T.showList) + (hintCount ? T.listHints(hintCount) : "");
    if (save) try { localStorage.setItem("threadPulseList", show ? "1" : "0"); } catch (e) {}
    if (network && save) setTimeout(() => { network.redraw(); network.fit({ animation: { duration: 300 } }); }, 50);
  }
  function setLegend(show, save = true) {
    $("legend").classList.toggle("hidden", !show);
    $("legbtn").textContent = show ? T.hideLegend : T.showLegend;
    if (save) try { localStorage.setItem("threadPulseLegend", show ? "1" : "0"); } catch (e) {}
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
    if (DEMO) { const m = demoState || (demoState = demoModel()); render(m); diffSnaps(prev, lastSnap); return m; }
    const m = await loadHa();
    render(m);
    diffSnaps(prev, lastSnap);
    await subscribeLive(m.hass);
    return m;
  }

  theme();

  root.addEventListener("keydown", e => { if (e.key === "Escape" && e.target.id !== "search") closePanel(); });

  root.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-open],[data-act],[data-device]"); if (!t) return;
    e.preventDefault();
    if (t.dataset.open) openPanel(t.dataset.open);
    else if (t.dataset.act === "close") closePanel();
    else if (t.dataset.act === "clearchanges") { changes = []; try { localStorage.removeItem(LOG_KEY); } catch (e) {} renderChanges(); }
    else if (t.dataset.device) openDevice(t.dataset.device);
  });
