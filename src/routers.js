//# Names of other Thread border routers from Home Assistant's border router discovery (issue #37).
//# Part of createThreadPulse() – placed inside that function by build.py, uses the shared state declared in core.js.
  // ---------- border router names (issue #37) ----------
  // Home Assistant finds border routers on the local network via mDNS (thread/discover_routers: Apple TV / HomePod,
  // Google Nest, Amazon Echo, the OpenThread add-on …). They are matched to the unknown routers on the map by their
  // extended address. Routers that are not border routers (or not announced on the network) stay "other Thread router".
  let brInfo = {}, brUnsub = null;              // extended address → { vendor, model, name, version, network, extPanId }
  const short = id => "…" + id.slice(-4);
  // Apple border routers all announce the model "BorderRouter" – the useful name is the instance name (e.g. "HomePod Salon")
  const GENERIC_MODEL = /^border\s*router$/i;
  const cut = (t, n = 28) => t.length > n ? t.slice(0, n - 1) + "…" : t;
  const usefulModel = d => d.model && !GENERIC_MODEL.test(d.model) ? d.model : "";
  const brTitleOf = d => cut(d.name || usefulModel(d) || d.vendor || T.brLabel);
  const nameOf = id => (nodeById[id] || wifiById[id] || {}).name || extraName(id);
  function extraName(id) {                      // one line, for lists and the change log
    if (id === brExt) return T.brLabel;
    const d = brInfo[id];
    return d ? `${brTitleOf(d)} ${short(id)}` : short(id);
  }
  function extraLabel(id) {                     // label on the map
    if (id === brExt) return T.brLabel;
    const d = brInfo[id];
    return d ? `${brTitleOf(d)}\n${T.brOther(id.slice(-4))}` : T.foreignLabel(id);
  }
  function extraTitle(id) {
    if (id === brExt) return T.brTitle;
    const d = brInfo[id];
    return d ? [d.vendor, d.model, d.name].filter(Boolean).join(" · ") + "\n" + T.brOtherTitle : T.foreignTitle;
  }
  let namesTimer = null;
  function applyRouterNames() {                 // discovery events arrive one by one – update once they have settled
    clearTimeout(namesTimer); namesTimer = setTimeout(applyRouterNamesNow, 300);
  }
  function applyRouterNamesNow() {              // labels and icons on the map, list and hints, open panel (#71)
    if (!network || destroyed) return;
    const upd = [...extraIds].filter(id => id !== brExt).map(id => ({ id, label: extraLabel(id), title: extraTitle(id),
      image: iconImg(brInfo[id] ? "access-point-network" : "router-wireless", COLORS.off, 64) }));
    if (upd.length) network.body.data.nodes.update(upd);
    renderList(); renderChanges();
    if (panelNode) renderPanel();
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
