// Loading the data from Home Assistant (registries, cached Matter diagnostics, border router).
// Installed by createThreadPulse() (core.js); shared state and functions are on tp.

export default function install(tp) {
  const { $, diag, getHass, iconFor, setLanguage } = tp;
  Object.assign(tp, { loadHa });
  // ---------- data from Home Assistant ----------
  // Everything comes from data Home Assistant already has cached (diagnostics, entity registry):
  // no device is queried live, so battery devices are not woken up.
  async function loadHa() {
    const hass = await getHass();
    setLanguage(hass.language || (hass.locale && hass.locale.language));
    let entries;
    try {
      entries = await hass.callWS({ type: "config_entries/get", domain: "matter" });
    } catch (e) {
      throw Object.assign(new Error(tp.T.notAdmin), { fatal: true });
    }
    if (!entries.length) throw Object.assign(new Error(tp.T.noMatter), { fatal: true });
    const entry = entries[0].entry_id;
    const [devReg, entReg, areaReg] = await Promise.all([
      hass.callWS({ type: "config/device_registry/list" }),
      hass.callWS({ type: "config/entity_registry/list" }),
      hass.callWS({ type: "config/area_registry/list" }).catch(() => []),
    ]);
    const areaName = Object.fromEntries(areaReg.map(x => [x.area_id, x.name]));
    const devs = devReg.filter(d => d.config_entries.includes(entry));
    const entsByDev = {};
    const mainEnts = {}; // entities a user would look at (no diagnostic/config entities, not hidden or disabled)
    for (const e of entReg)
      if (e.device_id) {
        (entsByDev[e.device_id] = entsByDev[e.device_id] || []).push(e.entity_id);
        if (!e.entity_category && !e.hidden_by && !e.disabled_by)
          (mainEnts[e.device_id] = mainEnts[e.device_id] || []).push(e.entity_id);
      }
    const st = $("status");
    const nodes = [],
      wifi = [];
    let done = 0;
    await Promise.all(
      devs.map(async d => {
        try {
          const node = await diag(hass, entry, d.id),
            a = node.attributes;
          const iface = (a["0/51/0"] || []).find(x => x["7"] === 4); // interface type 4 = Thread
          if (!iface || a["0/53/1"] === undefined) {
            // Matter over Wi-Fi (type 1) or Ethernet (type 2): separate group, no Thread data (issue #43)
            const ifs = a["0/51/0"] || [],
              kind = ifs.some(x => x["7"] === 1) ? "wifi" : ifs.some(x => x["7"] === 2) ? "ethernet" : null;
            if (!kind) return;
            const wents = (entsByDev[d.id] || []).map(id => ({
              domain: id.split(".")[0],
              dc: ((hass.states[id] || {}).attributes || {}).device_class,
            }));
            wifi.push({
              id: "wifi:" + d.id,
              kind,
              name: d.name_by_user || d.name,
              icon: iconFor(wents),
              available: node.available,
              devId: d.id,
              entities: entsByDev[d.id] || [],
              mainEntities: mainEnts[d.id] || [],
              area: areaName[d.area_id] || "",
              info: {
                vendor: a["0/40/1"] || d.manufacturer,
                product: a["0/40/3"] || d.model,
                sw: a["0/40/10"] || d.sw_version,
                hw: a["0/40/8"] || d.hw_version,
                reboots: a["0/51/1"],
                bootReason: a["0/51/4"],
                fabrics: a["0/62/3"],
                rssi: a["0/54/4"],
                channel: a["0/54/3"],
                wifiVersion: a["0/54/2"],
              },
            });
            return;
          }
          const mac = [...atob(iface["4"])].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
          const role = a["0/53/1"]; // 2 sleepy, 3 end device, 4 REED, 5 router, 6 leader
          const type = role >= 5 ? "routing_end_device" : role >= 3 ? "end_device" : "sleepy_end_device";
          const ents = (entsByDev[d.id] || []).map(id => ({
            domain: id.split(".")[0],
            dc: ((hass.states[id] || {}).attributes || {}).device_class,
          }));
          nodes.push({
            id: mac,
            name: d.name_by_user || d.name,
            icon: iconFor(ents),
            type,
            available: node.available,
            neigh: a["0/53/7"] || [],
            routes: a["0/53/8"] || [],
            role,
            devId: d.id,
            entities: entsByDev[d.id] || [],
            mainEntities: mainEnts[d.id] || [],
            area: areaName[d.area_id] || "",
            info: {
              vendor: a["0/40/1"] || d.manufacturer,
              product: a["0/40/3"] || d.model,
              sw: a["0/40/10"] || d.sw_version,
              hw: a["0/40/8"] || d.hw_version,
              reboots: a["0/51/1"],
              bootReason: a["0/51/4"],
              fabrics: a["0/62/3"],
              detached: a["0/53/14"],
              attach: a["0/53/18"],
              parentChanges: a["0/53/21"],
              leader: a["0/53/13"],
              net: { name: a["0/53/2"], channel: a["0/53/0"], panId: a["0/53/3"], extPanId: a["0/53/4"] },
              batType:
                Object.entries(a)
                  .filter(([k]) => /^\d+\/47\/19$/.test(k))
                  .map(([, v]) => v)
                  .find(Boolean) || "",
            },
          });
        } catch (e) {
          if (e.fatal) throw e;
          console.warn("Thread Pulse:", d.name, e);
        }
        st.textContent = `${tp.T.loading} ${++done}/${devs.length}`;
      }),
    );
    if (!nodes.length) throw Object.assign(new Error(tp.T.noDevices), { fatal: true });
    let brExt = null,
      otbr = null,
      datasets = [];
    try {
      otbr = Object.values(await hass.callWS({ type: "otbr/info" }))[0];
      brExt = otbr.extended_address.toLowerCase();
    } catch (e) {} // no OTBR add-on
    try {
      datasets = (await hass.callWS({ type: "thread/list_datasets" })).datasets || [];
    } catch (e) {}
    // Zigbee channel from ZHA (#120) – only the channel: the answer also contains the network key
    let zigbee = null;
    try {
      const z = await hass.callWS({ type: "zha/network/settings" });
      const c = z && z.settings && z.settings.network_info && z.settings.network_info.channel;
      if (c) zigbee = { channel: c };
    } catch (e) {} // no ZHA
    // keep only what the panel shows – never the dataset TLVs, they contain the network key
    const thread = {
      otbr: otbr && {
        extAddr: otbr.extended_address,
        borderAgentId: otbr.border_agent_id,
        channel: otbr.channel,
        extPanId: otbr.extended_pan_id,
      },
      datasets: datasets.map(d => ({
        name: d.network_name,
        channel: d.channel,
        panId: d.pan_id,
        extPanId: d.extended_pan_id,
        preferred: d.preferred,
        source: d.source,
      })),
    };
    return { nodes, wifi, brExt, hass, thread, zigbee };
  }
}
