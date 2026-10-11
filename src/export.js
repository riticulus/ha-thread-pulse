//# Saving the map as a PNG image, optionally anonymised (issue #40).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- image export (issue #40) ----------
  // The map canvas is copied as it is shown (zoom, links, colours, badges, room areas, traffic, messages in flight) onto
  // the page background, with a caption line. Anonymised: device names become "Device 1, 2 …", rooms "Room A, B …",
  // the address suffix of other Thread routers is removed; the labels are switched only for the moment of the copy.
  let anonRooms = null;                     // area → "Room A" while an anonymised image is drawn (used by drawRooms)
  const roomLabel = area => anonRooms ? anonRooms[area] : area;
  function setExportMenu(show) {
    const m = $("exportmenu");
    m.hidden = !show; m.style.left = "0px";
    $("exportbtn").setAttribute("aria-expanded", String(show));
    if (!show) return;
    const r = m.getBoundingClientRect(), w = $("wrap").getBoundingClientRect();   // keep the menu inside the card on phones
    if (r.right > w.right - 8) m.style.left = Math.max(w.left + 8 - r.left, w.right - 8 - r.right) + "px";
  }
  function anonLabels() {
    const nodes = network.body.data.nodes, named = [];
    for (const id of nodes.getIds()) {
      const n = nodeById[id] || wifiById[id];
      if (n) named.push({ id, name: n.name });
      else if (extraIds.has(id) && id !== brExt)     // model name only – the name of a border router can be personal
        named.push({ id, label: brInfo[id] ? usefulModel(brInfo[id]) || T.brLabel : T.foreignLabel(id).split("\n")[0] });
    }
    // numbered by position (top left to bottom right), not by name – the order must not hint at the real names
    const pos = network.getPositions(), row = id => Math.round(((pos[id] || {}).y || 0) / 40);
    named.sort((a, b) => row(a.id) - row(b.id) || ((pos[a.id] || {}).x || 0) - ((pos[b.id] || {}).x || 0));
    let i = 0;
    return named.map(x => ({ id: x.id, label: x.label || T.anonDevice(++i) }));
  }
  function anonRoomMap() {                  // area → "Room A, B …" in alphabetical order (image and text report)
    const m = {};
    Object.keys(roomsOf()).sort().forEach((a, i) => { m[a] = T.anonRoom(i < 26 ? String.fromCharCode(65 + i) : String(i + 1)); });
    return m;
  }
  function snapshotCanvas(anon) {
    const original = {};
    if (anon) {
      const labels = anonLabels(), nodes = network.body.data.nodes;
      for (const l of labels) original[l.id] = nodes.get(l.id).label;
      anonRooms = anonRoomMap();
      nodes.update(labels);
    }
    try {
      network.redraw();                    // synchronous: the canvas now holds the (anonymised) picture
      const src = $("net").querySelector("canvas"), ratio = src.width / src.clientWidth || 1;
      const foot = Math.round(26 * ratio), out = document.createElement("canvas");
      out.width = src.width; out.height = src.height + foot;
      const ctx = out.getContext("2d"), cs = getComputedStyle(host.styleTarget);
      ctx.fillStyle = cs.getPropertyValue("--bg").trim() || "#ffffff"; ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0);
      ctx.fillStyle = cs.getPropertyValue("--muted").trim() || "#6b7684";
      ctx.font = `${Math.round(12 * ratio)}px -apple-system, Segoe UI, Roboto, sans-serif`; ctx.textBaseline = "middle";
      const when = new Date().toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
      ctx.fillText(`Thread Pulse ${VERSION} · ${when} · ${T.exportDevices(Object.keys(nodeById).length)}` + (anon ? " · " + T.anonNote : ""),
                   Math.round(10 * ratio), src.height + foot / 2);
      return out;
    } finally {
      if (anon) { anonRooms = null; network.body.data.nodes.update(Object.entries(original).map(([id, label]) => ({ id, label }))); network.redraw(); }
    }
  }
  function exportImage(anon) {
    setExportMenu(false);
    if (!network) return;
    let canvas;
    try { canvas = snapshotCanvas(anon); } catch (e) { $("status").textContent = T.exportFailed; return; }
    const d = new Date(), pad = x => String(x).padStart(2, "0");
    const name = `thread-pulse-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${anon ? "-anonymised" : ""}.png`;
    canvas.toBlob(async blob => {
      if (!blob) { $("status").textContent = T.exportFailed; return; }
      // phones and tablets (and the Home Assistant app) cannot always download files – offer the share sheet there
      const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
      if (file && matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; a.style.display = "none";
      (root.body || root).appendChild(a);          // document or the shadow root of the card
      a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, "image/png");
  }
