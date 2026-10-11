//# Start-up and the public API (destroy, theme) of createThreadPulse().
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  let startList = false, startLegend = (host.width ? host.width() : window.innerWidth) > 700;
  try { heatOn = localStorage.getItem("threadPulseHeat") !== "0"; roomOn = localStorage.getItem("threadPulseRooms") === "1"; } catch (e) {}
  try { startList = localStorage.getItem("threadPulseList") === "1"; const l = localStorage.getItem("threadPulseLegend"); if (l !== null) startLegend = l === "1"; } catch (e) {}
  $("info").classList.toggle("hidden", !startList);
  $("legend").classList.toggle("hidden", !startLegend);
  setLanguage(lang);
  $("reload").onclick = () => load().catch(showErr);
  $("toggle").onclick = () => setList($("info").classList.contains("hidden"));
  $("roombtn").onclick = () => {
    roomOn = !roomOn; $("roombtn").textContent = roomOn ? T.roomsOff : T.roomsOn;
    try { localStorage.setItem("threadPulseRooms", roomOn ? "1" : "0"); } catch (e) {}
    applyRooms(roomOn);
  };
  $("heatbtn").onclick = () => {
    heatOn = !heatOn; $("heatbtn").textContent = heatOn ? T.heatOff : T.heatOn;
    try { localStorage.setItem("threadPulseHeat", heatOn ? "1" : "0"); } catch (e) {}
    if (network) network.redraw();
  };
  $("legbtn").onclick = () => setLegend($("legend").classList.contains("hidden"));
  $("livebtn").onclick = () => {
    liveOn = !liveOn; $("livebtn").textContent = liveOn ? T.pause : T.resume;
    if (!liveOn) packets = [];
  };
  load().then(m => { if (DEMO) demoTraffic(m); }).catch(showErr);

  return {
    destroy() {
      destroyed = true; timers.forEach(clearInterval);
      if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
      if (network) { network.destroy(); network = null; }
    },
    theme,
  };
