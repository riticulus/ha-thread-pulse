//# Names of other Thread border routers from Home Assistant's border router discovery (issue #37).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- border router names (issue #37) ----------
  // Home Assistant finds border routers on the local network via mDNS (thread/discover_routers: Apple TV / HomePod,
  // Google Nest, Amazon Echo, the OpenThread add-on …). They are matched to the unknown routers on the map by their
  // extended address. Routers that are not border routers (or not announced on the network) stay "other Thread router".
  let brInfo = {}, brUnsub = null;              // extended address → { vendor, model, name, version, network, extPanId }
  const short = id => "…" + id.slice(-4);
  function extraName(id) {                      // one line, for lists and the change log
    if (id === brExt) return T.brLabel;
    const d = brInfo[id];
    return d ? `${d.model || d.vendor || T.brLabel} ${short(id)}` : short(id);
  }
  function extraLabel(id) {                     // label on the map
    if (id === brExt) return T.brLabel;
    const d = brInfo[id];
    return d ? `${d.model || d.vendor || T.brLabel}\n${T.brOther(id.slice(-4))}` : T.foreignLabel(id);
  }
  function extraTitle(id) {
    if (id === brExt) return T.brTitle;
    const d = brInfo[id];
    return d ? [d.vendor, d.model, d.name].filter(Boolean).join(" · ") + "\n" + T.brOtherTitle : T.foreignTitle;
  }
  function applyRouterNames() {                 // after new discovery data: update labels and icons on the map
    if (!network) return;
    const upd = [...extraIds].filter(id => id !== brExt).map(id => ({ id, label: extraLabel(id), title: extraTitle(id),
      image: iconImg(brInfo[id] ? "access-point-network" : "router-wireless", COLORS.off, 64) }));
    if (upd.length) network.body.data.nodes.update(upd);
    if (panelNode && extraIds.has(panelNode)) renderPanel();
  }
  function routerFromDiscovery(d) {
    return { vendor: d.vendor_name || "", model: d.model_name || "", name: d.instance_name || "", version: d.thread_version || "",
             network: d.network_name || "", extPanId: (d.extended_pan_id || "").toLowerCase(), brand: d.brand || "" };
  }
  async function discoverRouters(hass) {        // runs in the background while the page is open
    if (brUnsub || !hass || !hass.connection) return;
    try {
      brUnsub = await hass.connection.subscribeMessage(ev => {
        const id = String(ev.key || (ev.data && ev.data.extended_address) || "").toLowerCase();
        if (!id) return;
        if (ev.type === "router_discovered" && ev.data) brInfo[id] = routerFromDiscovery(ev.data);
        else if (ev.type === "router_removed") delete brInfo[id];
        applyRouterNames();
      }, { type: "thread/discover_routers" });
    } catch (e) { brUnsub = null; }              // no Thread integration: names stay unknown
  }
