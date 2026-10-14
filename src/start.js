// Start-up and the public API (destroy, theme) of createThreadPulse().
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const {
    $,
    DEMO,
    applyRooms,
    demoTraffic,
    load,
    opts,
    playTick,
    prefs,
    setBtn,
    setLanguage,
    setLegend,
    setMoreMenu,
    setRespView,
    setSound,
    showErr,
    theme,
    timers,
  } = tp;
  let startLegend = false; // the legend is an overlay on the map (issue #107): closed until opened
  tp.soundVolume = prefs.get("volume");
  $("volume").value = String(tp.soundVolume);
  if (prefs.get("sound")) setSound(true, false);
  tp.heatOn = prefs.get("heat");
  tp.roomOn = prefs.get("rooms");
  startLegend = prefs.get("legend", startLegend);
  $("legend").classList.toggle("hidden", !startLegend);
  setLanguage(tp.lang);
  $("reload").onclick = () => load().catch(showErr);
  $("status").onclick = () => {
    if (tp.network) load().catch(showErr);
  }; // tap the status line to reload (issue #107)
  $("status").onkeydown = e => {
    if ((e.key === "Enter" || e.key === " ") && tp.network) {
      e.preventDefault();
      load().catch(showErr);
    }
  };
  $("roombtn").onclick = () => {
    tp.roomOn = !tp.roomOn;
    setBtn($("roombtn"), tp.roomOn ? tp.T.roomsOff : tp.T.roomsOn, tp.roomOn);
    prefs.set("rooms", tp.roomOn);
    applyRooms(tp.roomOn);
  };
  $("soundbtn").onclick = () => setSound(!tp.soundOn);
  $("respbtn").onclick = () => setRespView(!tp.respView);
  $("volume").oninput = () => {
    tp.soundVolume = Number($("volume").value);
    prefs.set("volume", tp.soundVolume);
    playTick(false);
  };
  $("heatbtn").onclick = () => {
    tp.heatOn = !tp.heatOn;
    setBtn($("heatbtn"), tp.heatOn ? tp.T.heatOff : tp.T.heatOn, tp.heatOn);
    prefs.set("heat", tp.heatOn);
    if (tp.network) tp.network.redraw();
  };
  $("morebtn").onclick = () => setMoreMenu($("moremenu").hidden);
  $("legbtn").onclick = () => setLegend($("legend").classList.contains("hidden"));
  $("livebtn").onclick = () => {
    tp.liveOn = !tp.liveOn;
    setBtn($("livebtn"), tp.liveOn ? tp.T.pause : tp.T.resume, tp.liveOn);
    if (!tp.liveOn) tp.packets = [];
  };
  // open a device from outside – the device card (#126) links to the map with ?tp_device=<device id>
  let focusWanted = opts.focusDevice || null;
  function focusDevice(devId) {
    focusWanted = devId || null;
    applyFocus();
  }
  function applyFocus() {
    if (!focusWanted || !tp.network) return;
    const n = Object.values(tp.nodeById)
      .concat(Object.values(tp.wifiById))
      .find(x => x.devId === focusWanted || x.id === focusWanted);
    if (!n) return;
    focusWanted = null;
    tp.openPanel(n.id);
    tp.network.selectNodes([n.id]);
    tp.zoomTo(n.id);
  }
  load()
    .then(m => {
      if (DEMO) demoTraffic(m);
      setTimeout(applyFocus, 600); // after the layout has settled
    })
    .catch(showErr);

  return {
    destroy() {
      tp.destroyed = true;
      timers.forEach(clearInterval);
      if (tp.unsub) {
        try {
          tp.unsub();
        } catch (e) {}
        tp.unsub = null;
      }
      if (tp.brUnsub) {
        try {
          tp.brUnsub();
        } catch (e) {}
        tp.brUnsub = null;
      }
      if (tp.store && tp.store.unsub) {
        try {
          tp.store.unsub();
        } catch (e) {}
      }
      clearTimeout(tp.saveTimer);
      if (tp.network) {
        tp.network.destroy();
        tp.network = null;
      }
    },
    theme,
    focusDevice,
  };
}
