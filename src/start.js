//# Start-up and the public API (destroy, theme) of createThreadPulse().
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  let startList = false, startLegend = (host.width ? host.width() : window.innerWidth) > 700;
  soundVolume = prefs.get("volume");
  $("volume").value = String(soundVolume);
  if (prefs.get("sound")) setSound(true, false);
  heatOn = prefs.get("heat"); roomOn = prefs.get("rooms");
  startList = prefs.get("list"); startLegend = prefs.get("legend", startLegend);
  $("info").classList.toggle("hidden", !startList);
  $("legend").classList.toggle("hidden", !startLegend);
  setLanguage(lang);
  $("reload").onclick = () => load().catch(showErr);
  $("toggle").onclick = () => setList($("info").classList.contains("hidden"));
  $("roombtn").onclick = () => {
    roomOn = !roomOn; $("roombtn").textContent = roomOn ? T.roomsOff : T.roomsOn;
    prefs.set("rooms", roomOn);
    applyRooms(roomOn);
  };
  $("soundbtn").onclick = () => setSound(!soundOn);
  $("volume").oninput = () => { soundVolume = Number($("volume").value); prefs.set("volume", soundVolume); playTick(false); };
  $("heatbtn").onclick = () => {
    heatOn = !heatOn; $("heatbtn").textContent = heatOn ? T.heatOff : T.heatOn;
    prefs.set("heat", heatOn);
    if (network) network.redraw();
  };
  $("exportbtn").onclick = () => setExportMenu($("exportmenu").hidden);
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
      if (brUnsub) { try { brUnsub(); } catch (e) {} brUnsub = null; }
      if (network) { network.destroy(); network = null; }
    },
    theme,
  };
