// Room view (issue #8).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { $ } = tp;
  Object.assign(tp, { applyRooms, drawRooms });
  // ---------- room view (issue #8) ----------
  // Calculated layout: every Home Assistant area gets its own spot on a grid, its devices sit in a ring around it,
  // and a coloured area with the room name is drawn behind them. Devices without an area and the border router share
  // one extra spot (top left). Physics is paused while the room view is on; the mesh links are still drawn.
  tp.roomOn = false;
  tp.roomTween = null;
  let preRoomPos = null;
  const ROOM_COLORS = [
    "#42a5f5",
    "#66bb6a",
    "#ffa726",
    "#ab47bc",
    "#26c6da",
    "#ec407a",
    "#9ccc65",
    "#8d6e63",
    "#5c6bc0",
    "#d4e157",
  ];
  const roomsOf = () => {
    const m = {};
    for (const n of Object.values(tp.nodeById)) if (n.area) (m[n.area] = m[n.area] || []).push(n.id);
    return m;
  };
  tp.roomsOf = roomsOf;
  function applyRooms(on, animate = true) {
    if (!tp.network) return;
    if (tp.roomTween) {
      cancelAnimationFrame(tp.roomTween);
      tp.roomTween = null;
    }
    if (!on) {
      // Back to the mesh layout (issue #22): glide back to the positions from before the room view, then fit.
      // Without saved positions (room view was already on when the page loaded), let the physics finish the layout
      // first (stabilize runs the iterations before the map is shown again) and fit only afterwards.
      const ids = tp.network.body.data.nodes.getIds();
      const saved = preRoomPos && ids.filter(id => preRoomPos[id]).length >= ids.length * 0.8 ? preRoomPos : null;
      preRoomPos = null;
      const done = () => {
        if (!tp.network || tp.destroyed) return;
        tp.network.setOptions({ physics: { enabled: true } });
        tp.network.fit({ animation: { duration: 400 } });
      };
      if (saved) {
        tweenTo(Object.fromEntries(ids.filter(id => saved[id]).map(id => [id, saved[id]])), animate ? 600 : 0, done);
        return;
      }
      tp.network.setOptions({ physics: { enabled: true } });
      tp.network.once("stabilizationIterationsDone", () => {
        tp.placeWifi();
        tp.network.fit({ animation: { duration: 400 } });
      });
      tp.network.stabilize(600);
      return;
    }
    if (animate && !preRoomPos) preRoomPos = tp.network.getPositions();
    const rooms = roomsOf(),
      names = Object.keys(rooms).sort();
    const grouped = new Set(names.flatMap(a => rooms[a]));
    const rest = tp.network.body.data.nodes.getIds().filter(id => !grouped.has(id) && !tp.isWifiId(id));
    const isR = id => tp.nodeById[id] && tp.nodeById[id].type === "routing_end_device";
    const groups = names.map(a => rooms[a].slice().sort((a2, b2) => isR(b2) - isR(a2))); // routers first in the ring
    if (rest.length) groups.unshift(rest); // first (top left): the bottom left is covered by the live ticker
    const ring = k => (k <= 1 ? 0 : 40 + 22 * k);
    const cell = 2 * Math.max(...groups.map(g => ring(g.length))) + 170;
    const st = $("stage"),
      aspect = st && st.clientHeight ? st.clientWidth / st.clientHeight : 1.5;
    const cols = Math.max(1, Math.round(Math.sqrt(groups.length * aspect))); // grid follows the shape of the map area
    const target = {};
    groups.forEach((g, i) => {
      const cx = (i % cols) * cell,
        cy = Math.floor(i / cols) * cell,
        r = ring(g.length);
      g.forEach((id, j) => {
        const a = (2 * Math.PI * j) / g.length - Math.PI / 2;
        target[id] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    });
    tp.network.setOptions({ physics: { enabled: false } });
    tweenTo(target, animate ? 600 : 0, () => {
      tp.placeWifi();
      tp.network.fit({ animation: animate ? { duration: 400 } : false });
    });
  }
  function tweenTo(target, D, done) {
    // move nodes smoothly to target positions (physics must be off)
    tp.network.setOptions({ physics: { enabled: false } });
    const from = tp.network.getPositions(),
      t0 = performance.now();
    const step = () => {
      if (!tp.network || tp.destroyed) return;
      const k = D ? Math.min(1, (performance.now() - t0) / D) : 1,
        e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const id in target) {
        const f = from[id] || target[id];
        tp.network.moveNode(id, f.x + (target[id].x - f.x) * e, f.y + (target[id].y - f.y) * e);
      }
      if (k < 1) tp.roomTween = requestAnimationFrame(step);
      else {
        tp.roomTween = null;
        done && done();
      }
    };
    step();
  }
  function hull(points) {
    // convex hull (monotone chain)
    const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [],
      up = [];
    for (const q of p) {
      while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
    }
    for (const q of p.slice().reverse()) {
      while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  let roomCanvas = null;
  function drawRooms(ctx) {
    if (!tp.roomOn || !tp.network) return;
    const rooms = roomsOf(),
      pos = tp.network.getPositions(),
      PAD = 34;
    const cv = ctx.canvas;
    if (!roomCanvas) roomCanvas = document.createElement("canvas");
    if (roomCanvas.width !== cv.width || roomCanvas.height !== cv.height) {
      roomCanvas.width = cv.width;
      roomCanvas.height = cv.height;
    }
    const names = Object.keys(rooms).sort();
    const labels = [];
    names.forEach((area, i) => {
      const pts = rooms[area].map(id => pos[id]).filter(Boolean);
      if (!pts.length) return;
      const color = ROOM_COLORS[i % ROOM_COLORS.length],
        h = hull(pts);
      // draw the padded blob opaque on a helper canvas, then copy it with low opacity (no darker overlaps inside a room)
      const o = roomCanvas.getContext("2d");
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, roomCanvas.width, roomCanvas.height);
      o.setTransform(ctx.getTransform());
      o.fillStyle = o.strokeStyle = color;
      o.lineJoin = o.lineCap = "round";
      o.lineWidth = PAD * 2;
      o.beginPath();
      o.moveTo(h[0].x, h[0].y);
      for (const q of h.slice(1)) o.lineTo(q.x, q.y);
      o.closePath();
      o.fill();
      o.stroke();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.13;
      ctx.drawImage(roomCanvas, 0, 0);
      ctx.restore();
      const top = pts.reduce((a, q) => (q.y < a.y ? q : a), pts[0]);
      labels.push({
        text: tp.roomLabel(area).toUpperCase(),
        x: pts.reduce((a, q) => a + q.x, 0) / pts.length,
        y: top.y - PAD - 8,
        color,
      });
    });
    ctx.save();
    ctx.font = "600 12px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const l of labels) {
      ctx.fillStyle = l.color;
      ctx.globalAlpha = 0.9;
      ctx.fillText(l.text, l.x, l.y);
    }
    ctx.restore();
  }
}
