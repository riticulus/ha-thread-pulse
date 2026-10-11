//# Ambient mode for wall tablets (issue #11). Runs during start-up, between theme() and the rest of start.js.
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- ambient mode (issue #11) ----------
  // Only the mesh, dark. Every 25 s the view glides slowly to a router and back to the whole mesh (against burn-in).
  // Paused for 60 s after the screen was touched. Asks the browser to keep the screen on (needs HTTPS – fails silently otherwise).
  if (AMBIENT) {
    $("wrap").classList.add("ambient");
    let lastTouch = 0, step = 0;
    root.addEventListener("pointerdown", () => { lastTouch = Date.now(); }, true);
    if (AMBIENT_MOTION) every(() => {
      if (!network || roomTween || panelNode || Date.now() - lastTouch < 60000) return;
      const routers = Object.values(nodeById).filter(n => n.type === "routing_end_device");
      const ease = "easeInOutQuad";
      if (step++ % 2 === 0 && routers.length) {
        const n = routers[Math.floor(Math.random() * routers.length)];
        network.focus(n.id, { scale: Math.min(1.6, network.getScale() * 1.6), animation: { duration: 8000, easingFunction: ease } });
      } else network.fit({ animation: { duration: 8000, easingFunction: ease } });
    }, 25000);
    const wake = async () => { try { if (navigator.wakeLock && document.visibilityState === "visible") await navigator.wakeLock.request("screen"); } catch (e) {} };
    wake(); document.addEventListener("visibilitychange", wake);
  }
