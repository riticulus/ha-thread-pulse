// Routers that are not Matter devices of Home Assistant: names of other Thread border routers from Home Assistant's
// border router discovery (issue #37), names from the card option `routers` and which one is the border router (#117).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

import { parseRouters } from "./routercfg.js";

export default function install(tp) {
  const { COLORS, iconImg, opts } = tp;
  Object.assign(tp, { applyRouterNames, chooseBr, discoverRouters, extraLabel, extraName, extraTitle, extraVis });
  // ---------- card option `routers` (issue #117) ----------
  const cfg = parseRouters(opts.routers);
  for (const e of cfg.errors) console.warn("Thread Pulse:", e); // the card shows them as a configuration error
  const ownName = id => (cfg.byId[id] || {}).name || "";
  tp.routerName = ownName;
  tp.routerArea = id => (cfg.byId[id] || {}).area || "";
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
    if (ownName(id)) return ownName(id);
    if (id === tp.brExt) return tp.T.brLabel;
    const d = tp.brInfo[id];
    return d ? `${brTitleOf(d)} ${short(id)}` : short(id);
  }
  function extraLabel(id) {
    // label on the map
    if (ownName(id)) return ownName(id);
    if (id === tp.brExt) return tp.T.brLabel;
    const d = tp.brInfo[id];
    return d ? `${brTitleOf(d)}\n${tp.T.brOther(id.slice(-4))}` : tp.T.foreignLabel(id);
  }
  function extraTitle(id) {
    const d = tp.brInfo[id];
    const t =
      id === tp.brExt
        ? tp.T.brTitle
        : d
          ? [d.vendor, d.model, d.name].filter(Boolean).join(" · ") + "\n" + tp.T.brOtherTitle
          : tp.T.foreignTitle;
    return ownName(id) ? ownName(id) + "\n" + t : t;
  }
  // how a router that is not a Matter device of Home Assistant is drawn on the map
  function extraVis(id) {
    const isBr = id === tp.brExt;
    return {
      id,
      label: extraLabel(id),
      title: extraTitle(id),
      image: iconImg(
        isBr || tp.brInfo[id] ? "access-point-network" : "router-wireless",
        isBr ? COLORS.br : COLORS.off,
        64,
      ),
      size: isBr ? 24 : 16,
    };
  }
  // ---------- which router is the border router (issue #117) ----------
  // 1. the card option `routers` (border_router: true)   2. the OpenThread Border Router integration of Home Assistant
  // 3. the only router on the map that Home Assistant's discovery found as a border router of this network
  // 4. as before: a single unknown router in the routers' neighbour tables is most likely the border router
  // With several discovered border routers (e.g. HomePods) it stays unknown. Rule 3 does not depend on how many other
  // routers are not Matter devices – before, an OpenThread stick as range extender made the border router "unknown".
  tp.brModel = null; // from the OpenThread Border Router integration
  tp.brSingle = null; // rule 4, set when the map is built
  tp.brFound = null; // rule 3; kept while that router is on the map, so a discovery that flaps does not change the map
  tp.meshXpan = "";
  // extended PAN ID of the mesh as 16 hex digits – the Matter diagnostics give a decimal number
  const xpanHex = v => (/^\d+$/.test(String(v)) ? BigInt(v).toString(16).padStart(16, "0") : String(v).toLowerCase());
  function xpanOf(nodes) {
    const count = {};
    for (const n of nodes) {
      const v = ((n.info || {}).net || {}).extPanId;
      if (v !== undefined && v !== null && v !== "") count[xpanHex(v)] = (count[xpanHex(v)] || 0) + 1;
    }
    return Object.keys(count).sort((a, b) => count[b] - count[a])[0] || "";
  }
  function chooseBr(nodes) {
    if (nodes) tp.meshXpan = xpanOf(nodes);
    if (cfg.br) return cfg.br;
    if (tp.brModel) return tp.brModel;
    const found = [...tp.extraIds].filter(id => {
      const d = tp.brInfo[id];
      return d && (!d.extPanId || !tp.meshXpan || d.extPanId === tp.meshXpan);
    });
    if (found.length === 1) tp.brFound = found[0];
    else if (found.length > 1 || !tp.extraIds.has(tp.brFound)) tp.brFound = null;
    return tp.brFound || tp.brSingle;
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
    // the discovery can also tell which router is the border router (#117): paths, hints and the mesh health follow
    const was = tp.brExt;
    tp.brExt = chooseBr();
    const upd = [...tp.extraIds].map(extraVis);
    if (upd.length) tp.network.body.data.nodes.update(upd);
    if (was !== tp.brExt && tp.lastSnap) tp.lastSnap.grade = (tp.computeHealth() || {}).grade; // not a change of the mesh
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
