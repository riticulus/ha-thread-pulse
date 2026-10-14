// Saving the map as a PNG image, optionally anonymised (issue #40).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.
import { VERSION } from "./version.js";

export default function install(tp) {
  const { $, host, roomsOf, root, usefulModel } = tp;
  Object.assign(tp, { anonLabels, anonRoomMap, exportImage, setMoreMenu });
  // ---------- image export (issue #40) ----------
  // The map canvas is copied as it is shown (zoom, links, colours, badges, room areas, traffic, messages in flight) onto
  // the page background, with a caption line. Anonymised: device names become "Device 1, 2 …", rooms "Room A, B …",
  // the address suffix of other Thread routers is removed; the labels are switched only for the moment of the copy.
  let anonRooms = null; // area → "Room A" while an anonymised image is drawn (used by drawRooms)
  const roomLabel = area => (anonRooms ? anonRooms[area] : area);
  tp.roomLabel = roomLabel;
  function setMoreMenu(show) {
    // ⋯ menu of the toolbar (issue #107): reload, sound, export, version
    const m = $("moremenu");
    m.hidden = !show;
    m.style.left = "0px";
    $("morebtn").setAttribute("aria-expanded", String(show));
    if (!show) return;
    const r = m.getBoundingClientRect(),
      w = $("wrap").getBoundingClientRect(); // keep the menu inside the card on phones
    if (r.right > w.right - 8) m.style.left = Math.max(w.left + 8 - r.left, w.right - 8 - r.right) + "px";
    const first = m.querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  function anonLabels() {
    const nodes = tp.network.body.data.nodes,
      named = [];
    for (const id of nodes.getIds()) {
      const n = tp.nodeById[id] || tp.wifiById[id];
      if (n) named.push({ id, name: n.name });
      else if (tp.extraIds.has(id) && id !== tp.brExt)
        // model name only – the name of a border router can be personal
        named.push({
          id,
          label: tp.brInfo[id] ? usefulModel(tp.brInfo[id]) || tp.T.brLabel : tp.T.foreignLabel(id).split("\n")[0],
        });
    }
    // numbered by position (top left to bottom right), not by name – the order must not hint at the real names
    const pos = tp.network.getPositions(),
      row = id => Math.round(((pos[id] || {}).y || 0) / 40);
    named.sort((a, b) => row(a.id) - row(b.id) || ((pos[a.id] || {}).x || 0) - ((pos[b.id] || {}).x || 0));
    let i = 0;
    return named.map(x => ({ id: x.id, label: x.label || tp.T.anonDevice(++i) }));
  }
  function anonRoomMap() {
    // area → "Room A, B …" in alphabetical order (image and text report)
    const m = {};
    Object.keys(roomsOf())
      .sort()
      .forEach((a, i) => {
        m[a] = tp.T.anonRoom(i < 26 ? String.fromCharCode(65 + i) : String(i + 1));
      });
    return m;
  }
  function snapshotCanvas(anon) {
    const original = {};
    if (anon) {
      const labels = anonLabels(),
        nodes = tp.network.body.data.nodes;
      for (const l of labels) original[l.id] = nodes.get(l.id).label;
      anonRooms = anonRoomMap();
      nodes.update(labels);
    }
    try {
      tp.network.redraw(); // synchronous: the canvas now holds the (anonymised) picture
      const src = $("net").querySelector("canvas"),
        ratio = src.width / src.clientWidth || 1;
      const foot = Math.round(26 * ratio),
        out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height + foot;
      const ctx = out.getContext("2d"),
        cs = getComputedStyle(host.styleTarget);
      ctx.fillStyle = cs.getPropertyValue("--bg").trim() || "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0);
      ctx.fillStyle = cs.getPropertyValue("--muted").trim() || "#6b7684";
      ctx.font = `${Math.round(12 * ratio)}px -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.textBaseline = "middle";
      const when = new Date().toLocaleString(tp.lang, { dateStyle: "medium", timeStyle: "short" });
      ctx.fillText(
        `Thread Pulse ${VERSION} · ${when} · ${tp.T.exportDevices(Object.keys(tp.nodeById).length)}` +
          (anon ? " · " + tp.T.anonNote : ""),
        Math.round(10 * ratio),
        src.height + foot / 2,
      );
      return out;
    } finally {
      if (anon) {
        anonRooms = null;
        tp.network.body.data.nodes.update(Object.entries(original).map(([id, label]) => ({ id, label })));
        tp.network.redraw();
      }
    }
  }
  function exportImage(anon) {
    setMoreMenu(false);
    if (!tp.network) return;
    let canvas;
    try {
      canvas = snapshotCanvas(anon);
    } catch (e) {
      $("status").textContent = tp.T.exportFailed;
      return;
    }
    const d = new Date(),
      pad = x => String(x).padStart(2, "0");
    const name = `thread-pulse-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${anon ? "-anonymised" : ""}.png`;
    canvas.toBlob(async blob => {
      if (!blob) {
        $("status").textContent = tp.T.exportFailed;
        return;
      }
      // phones and tablets (and the Home Assistant app) cannot always download files – offer the share sheet there
      const file = typeof File === "function" ? new File([blob], name, { type: "image/png" }) : null;
      if (
        file &&
        matchMedia("(pointer: coarse)").matches &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (e) {
          if (e && e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.style.display = "none";
      (root.body || root).appendChild(a); // document or the shadow root of the card
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, "image/png");
  }
}
