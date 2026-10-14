//# Start-up and the public API (destroy, theme) of createThreadPulse().
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  let startLegend = false;     // the legend is an overlay on the map (issue #107): closed until opened
  soundVolume = prefs.get("volume");
  $("volume").value = String(soundVolume);
  if (prefs.get("sound")) setSound(true, false);
  heatOn = prefs.get("heat"); roomOn = prefs.get("rooms");
  startLegend = prefs.get("legend", startLegend);
  $("legend").classList.toggle("hidden", !startLegend);
  setLanguage(lang);
  $("reload").onclick = () => load().catch(showErr);
  $("status").onclick = () => { if (network) load().catch(showErr); };      // tap the status line to reload (issue #107)
  $("status").onkeydown = e => { if ((e.key === "Enter" || e.key === " ") && network) { e.preventDefault(); load().catch(showErr); } };
  $("roombtn").onclick = () => {
    roomOn = !roomOn; setBtn($("roombtn"), roomOn ? T.roomsOff : T.roomsOn, roomOn);
    prefs.set("rooms", roomOn);
    applyRooms(roomOn);
  };
  $("soundbtn").onclick = () => setSound(!soundOn);
  $("respbtn").onclick = () => setRespView(!respView);
  $("volume").oninput = () => { soundVolume = Number($("volume").value); prefs.set("volume", soundVolume); playTick(false); };
  $("heatbtn").onclick = () => {
    heatOn = !heatOn; setBtn($("heatbtn"), heatOn ? T.heatOff : T.heatOn, heatOn);
    prefs.set("heat", heatOn);
    if (network) network.redraw();
  };
  $("morebtn").onclick = () => setMoreMenu($("moremenu").hidden);
  $("legbtn").onclick = () => setLegend($("legend").classList.contains("hidden"));
  $("livebtn").onclick = () => {
    liveOn = !liveOn; setBtn($("livebtn"), liveOn ? T.pause : T.resume, liveOn);
    if (!liveOn) packets = [];
  };
  load().then(m => { if (DEMO) demoTraffic(m); }).catch(showErr);

  return {
    destroy() {
      destroyed = true; timers.forEach(clearInterval);
      if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
      if (brUnsub) { try { brUnsub(); } catch (e) {} brUnsub = null; }
      if (store && store.unsub) { try { store.unsub(); } catch (e) {} }
      clearTimeout(saveTimer);
      if (network) { network.destroy(); network = null; }
    },
    theme,
  };
