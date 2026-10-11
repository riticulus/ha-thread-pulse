//# Demo mode with invented devices.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- demo (invented devices, works without Home Assistant) ----------
  function demoModel() {
    const de = lang === "de";
    let seq = 0x1000;
    const mk = (name, icon, role, extra = {}) => ({ id: "f2a0c0de0000" + (seq++).toString(16), name, icon, role, available: true, neigh: [], routes: [],
      type: role >= 5 ? "routing_end_device" : role >= 3 ? "end_device" : "sleepy_end_device", ...extra });
    const br = { id: "f2a0c0de0000beef" };
    const routers = [mk(de ? "Stehlampe" : "Floor lamp", "lightbulb", 5), mk(de ? "Steckdose Küche" : "Kitchen plug", "power-plug", 5),
      mk(de ? "Deckenlicht Flur" : "Hallway light", "lightbulb", 6), mk(de ? "Steckdose Büro" : "Office plug", "power-plug", 5),
      mk(de ? "Rollladen" : "Blinds", "blinds", 5), mk(de ? "Thermostat" : "Thermostat", "thermostat", 5)];
    const ends = [mk(de ? "Luftreiniger" : "Air purifier", "air-filter", 3), mk(de ? "Lautsprecher" : "Speaker", "speaker", 3)];
    const sleepy = [mk(de ? "Fenster Bad" : "Bathroom window", "window-closed-variant", 2), mk(de ? "Haustür" : "Front door", "door", 2),
      mk(de ? "Bewegung Flur" : "Hallway motion", "motion-sensor", 2), mk(de ? "Taster Bett" : "Bedside button", "gesture-tap-button", 2),
      mk(de ? "Wassermelder" : "Leak sensor", "water-alert", 2), mk(de ? "Klima Schlafzimmer" : "Bedroom climate", "thermometer", 2)];
    const dec = id => BigInt("0x" + id).toString();
    const rid = {}; [...routers, br].forEach((r, i) => rid[r.id] = i * 4 + 3);
    const rnd = (lo, hi) => Math.round(lo + Math.random() * (hi - lo));
    const all = [...routers, br];
    for (const r of routers) {
      for (const o of all) if (o !== r && (Math.random() < 0.75 || (o === br && r === routers[0]))) r.neigh.push({ "0": dec(o.id), "6": rnd(-88, -45), "11": true, "13": false });
      r.routes = all.map(o => ({ "0": dec(o.id), "2": rid[o.id], "3": o === r ? 63 : rid[routers[0].id], "4": o === r ? 0 : 1, "5": 3, "6": 3, "9": o !== r }));
    }
    ends.forEach((e, i) => { const p = routers[i * 2]; e.neigh = [{ "0": dec(p.id), "6": rnd(-70, -50) }, { "0": dec(routers[i * 2 + 1].id), "6": rnd(-80, -60) }];
      e.routes = [{ "0": dec(p.id), "2": rid[p.id], "3": 63, "4": 0, "9": true }]; });
    sleepy.forEach((s, i) => { const p = routers[i % routers.length], rs = rnd(-85, -55);
      s.neigh = [{ "0": dec(p.id), "6": rs }]; s.routes = [{ "0": dec(p.id), "2": rid[p.id], "3": 0, "4": 0, "9": true }];
      p.neigh.push({ "0": dec(s.id), "6": rs, "11": false, "13": true }); });
    sleepy[3].available = false;
    const all2 = [...routers, ...ends, ...sleepy];
    all2.forEach((n, k) => { n.area = de ? ["Wohnzimmer", "Küche", "Flur", "Büro", "Schlafzimmer", "Bad"][k % 6] : ["Living room", "Kitchen", "Hallway", "Office", "Bedroom", "Bathroom"][k % 6];
      n.info = { vendor: "Demo Inc.", product: n.name, sw: "1." + (k % 4) + ".2", hw: "2.0", reboots: 2 + k % 5, bootReason: 1, detached: 1, attach: 1, parentChanges: 0,
                 batType: n.type === "sleepy_end_device" ? (k % 2 ? "CR2032" : "AAA") : "" };
      if (n.type === "sleepy_end_device") n.demoBattery = [88, 64, 100, 15, 42, 97][k % 6];
      const m = 60;
      n.demoValues = n.icon === "power-plug" ? [[de ? "Schalter" : "Switch", T.states.on, 26 * 3600], [de ? "Leistung" : "Power", "42.7 W", 4 * m], [de ? "Energie" : "Energy", "18.304 kWh", 6 * m]]
        : n.icon === "door" || n.icon === "window-closed-variant" ? [[de ? "Kontakt" : "Contact", T.states.closed, 12 * m], [de ? "Batterie" : "Battery", n.demoBattery + " %", 3 * 3600]]
        : n.icon === "thermometer" ? [[de ? "Temperatur" : "Temperature", "21.4 °C", 2 * m], [de ? "Luftfeuchte" : "Humidity", "48 %", 5 * m]]
        : n.icon === "lightbulb" ? [[de ? "Licht" : "Light", T.states.on, 40 * m]] : [[T.state, T.states.off, 90 * m]]; });
    sleepy[1].info.attach = 9; sleepy[1].info.detached = 3;
    routers[2].info.reboots = 140;   // a bulb on a wall switch
    sleepy[2].neigh[0]["6"] = -86;   // weak parent link (as seen by the device and by its parent router)
    for (const r of routers) for (const x of r.neigh) if (x["0"] === dec(sleepy[2].id)) x["6"] = -86;
    for (const n of all2) { n.info.leader = rid[routers[2].id]; n.info.net = { name: "demo-thread", channel: 15, panId: 4660, extPanId: "dead00beef00cafe" }; }
    return { nodes: [...routers, ...ends, ...sleepy], brExt: br.id, demo: { routers, sleepy, dec, rid },
             thread: { otbr: { extAddr: br.id, borderAgentId: "00000000000000000000000000demo00", channel: 15, extPanId: "dead00beef00cafe" },
                       datasets: [{ name: "demo-thread", channel: 15, panId: "1234", extPanId: "dead00beef00cafe", preferred: true, source: "otbr" }] } };
  }
  // demo: one invented change per refresh – a battery device moves to another parent, or a device drops out / comes back
  function demoMutate() {
    const m = demoState, { routers, sleepy, dec, rid } = m.demo;
    if (Math.random() < 0.6) {
      const s = sleepy.filter(x => x.available)[Math.floor(Math.random() * 5)] || sleepy[0];
      const oldP = routers.find(r => r.neigh.some(x => x["13"] && x["0"] === dec(s.id)));
      const newP = routers.filter(r => r !== oldP)[Math.floor(Math.random() * (routers.length - 1))];
      const rs = Math.round(-55 - Math.random() * 30);
      if (oldP) oldP.neigh = oldP.neigh.filter(x => x["0"] !== dec(s.id));
      newP.neigh.push({ "0": dec(s.id), "6": rs, "11": false, "13": true });
      s.neigh = [{ "0": dec(newP.id), "6": rs }]; s.routes = [{ "0": dec(newP.id), "2": rid[newP.id], "3": 0, "4": 0, "9": true }];
    } else {
      const n = m.nodes.filter(x => x !== sleepy[3])[Math.floor(Math.random() * (m.nodes.length - 1))];
      n.available = !n.available;
    }
    return m;
  }
  function demoTraffic(model) {
    const de = lang === "de";
    const msgs = n => n.icon === "power-plug" ? [de ? "Leistung" : "Power", `${(Math.random() * 120).toFixed(1)} W`]
      : n.icon === "thermometer" || n.icon === "thermostat" ? [de ? "Temperatur" : "Temperature", `${(19 + Math.random() * 4).toFixed(1)} °C`]
      : n.icon === "window-closed-variant" || n.icon === "door" ? [de ? "Kontakt" : "Contact", Math.random() < 0.5 ? T.states.open : T.states.closed]
      : n.icon === "motion-sensor" ? [de ? "Bewegung" : "Motion", Math.random() < 0.5 ? T.states.on : T.states.off]
      : [T.state, Math.random() < 0.5 ? T.states.on : T.states.off];
    const live = model.nodes.filter(n => n.available);
    const step = () => {
      if (destroyed) return;
      const n = live[Math.floor(Math.random() * live.length)];
      if (Math.random() < 0.35 && ["lightbulb", "power-plug", "blinds"].includes(n.icon)) {
        launch(n.id, true, `HA → <b>${esc(n.name)}</b>: ${n.icon === "blinds" ? "cover.open_cover" : n.icon === "lightbulb" ? "light.toggle" : "switch.toggle"}`);
        const ms = n.icon === "blinds" ? 900 + Math.random() * 900 : 120 + Math.random() * 380;      // the demo blinds are slow
        setTimeout(() => { if (destroyed) return; recordResponse(n.id, ms); launch(n.id, false, `<b>${esc(n.name)}</b> → HA: ${T.state} ${T.states.on} · ${Math.round(ms)} ms`); }, ms);
      }
      else { const [what, val] = msgs(n); launch(n.id, false, `<b>${esc(n.name)}</b> → HA: ${what} ${val}`); }
      setTimeout(step, 600 + Math.random() * 1800);
    };
    setTimeout(step, 1500);
    every(showTicker, 10000);
  }

