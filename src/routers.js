// Names of other Thread border routers from Home Assistant's border router discovery (issue #37).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { COLORS, iconImg } = tp;
  Object.assign(tp, { applyRouterNames, discoverRouters, extraLabel, extraName, extraTitle });
  // ---------- border router names (issue #37) ----------
  // Home Assistant finds border routers on the local network via mDNS (thread/discover_routers: Apple TV / HomePod,
  // Google Nest, Amazon Echo, the OpenThread add-on …). They are matched to the unknown routers on the map by their
  // extended address. Routers that are not border routers (or not announced on the network) stay "other Thread router".
  tp.brInfo = {};
  tp.brUnsub = null; // extended address → { vendor, model, name, version, network, extPanId }
  const short = id => "…" + id.slice(-4);
  // Apple border routers all announce the model "BorderRouter" – the useful name is the instance name (e.g. "HomePod Salon")
  const GENERIC_MODEL = /^border\s*router$/i;
  const cut = (t, n = 28) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  const usefulModel = d => (d.model && !GENERIC_MODEL.test(d.model) ? d.model : "");
  tp.usefulModel = usefulModel;
  const brTitleOf = d => cut(d.name || usefulModel(d) || d.vendor || tp.T.brLabel);
  tp.brTitleOf = brTitleOf;
  const nameOf = id => (tp.nodeById[id] || tp.wifiById[id] || {}).name || extraName(id);
  tp.nameOf = nameOf;
  function extraName(id) {
    // one line, for lists and the change log
    if (id === tp.brExt) return tp.T.brLabel;
    const d = tp.brInfo[id];
    return d ? `${brTitleOf(d)} ${short(id)}` : short(id);
  }
  function extraLabel(id) {
    // label on the map
    if (id === tp.brExt) return tp.T.brLabel;
    const d = tp.brInfo[id];
    return d ? `${brTitleOf(d)}\n${tp.T.brOther(id.slice(-4))}` : tp.T.foreignLabel(id);
  }
  function extraTitle(id) {
    if (id === tp.brExt) return tp.T.brTitle;
    const d = tp.brInfo[id];
    return d ? [d.vendor, d.model, d.name].filter(Boolean).join(" · ") + "\n" + tp.T.brOtherTitle : tp.T.foreignTitle;
  }
  let namesTimer = null;
  function applyRouterNames() {
    // discovery events arrive one by one – update once they have settled
    clearTimeout(namesTimer);
    namesTimer = setTimeout(applyRouterNamesNow, 300);
  }
  function applyRouterNamesNow() {
    // labels and icons on the map, list and hints, open panel (#71)
    if (!tp.network || tp.destroyed) return;
    const upd = [...tp.extraIds]
      .filter(id => id !== tp.brExt)
      .map(id => ({
        id,
        label: extraLabel(id),
        title: extraTitle(id),
        image: iconImg(tp.brInfo[id] ? "access-point-network" : "router-wireless", COLORS.off, 64),
      }));
    if (upd.length) tp.network.body.data.nodes.update(upd);
    tp.renderList();
    tp.renderChanges();
    if (tp.panelNode) tp.renderPanel();
  }
  function routerFromDiscovery(d) {
    return {
      vendor: d.vendor_name || "",
      model: d.model_name || "",
      name: d.instance_name || "",
      version: d.thread_version || "",
      network: d.network_name || "",
      extPanId: (d.extended_pan_id || "").toLowerCase(),
      brand: d.brand || "",
    };
  }
  async function discoverRouters(hass) {
    // runs in the background while the page is open
    if (tp.brUnsub || !hass || !hass.connection) return;
    try {
      tp.brUnsub = await hass.connection.subscribeMessage(
        ev => {
          const id = String(ev.key || (ev.data && ev.data.extended_address) || "").toLowerCase();
          if (!id) return;
          if (ev.type === "router_discovered" && ev.data) tp.brInfo[id] = routerFromDiscovery(ev.data);
          else if (ev.type === "router_removed") delete tp.brInfo[id];
          applyRouterNames();
        },
        { type: "thread/discover_routers" },
      );
    } catch (e) {
      tp.brUnsub = null;
    } // no Thread integration: names stay unknown
  }
}
