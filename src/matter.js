// Reading Matter device data from Home Assistant – shared by the map and the device card. Everything comes from the
// diagnostics Home Assistant already has cached: no device is queried live, so battery devices are not woken up.

async function token(hass) {
  if (hass.auth.expired) await hass.auth.refreshAccessToken();
  return hass.auth.accessToken || hass.auth.data.access_token;
}
// the cached Matter node of a device; throws an error with .status (401/403: not an administrator)
export async function fetchDiagnostics(hass, entry, devId) {
  const r = await fetch(`/api/diagnostics/config_entry/${entry}/device/${devId}`, {
    headers: { Authorization: "Bearer " + (await token(hass)) },
  });
  if (!r.ok) throw Object.assign(new Error("diagnostics " + r.status), { status: r.status });
  // Thread addresses are 64-bit numbers: keep them exact by turning them into strings before parsing
  const txt = (await r.text()).replace(/"0":\s*(\d{15,})/g, '"0":"$1"').replace(/"0\/53\/4":\s*(\d+)/, '"0/53/4":"$1"');
  return JSON.parse(txt).data.node;
}
// 64-bit Thread address (decimal string) → 16 hex digits, the id used everywhere in Thread Pulse
export const hex16 = s => BigInt(s).toString(16).padStart(16, "0");
// Thread address of a node from its network interfaces (type 4 = Thread), or null for Wi-Fi / Ethernet devices
export function threadAddressOf(node) {
  const iface = ((node.attributes || {})["0/51/0"] || []).find(x => x["7"] === 4);
  if (!iface || node.attributes["0/53/1"] === undefined) return null;
  return [...atob(iface["4"])].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}
// Thread role → type: 2 sleepy, 3 end device, 4 REED, 5 router, 6 leader
export const typeOfRole = role => (role >= 5 ? "routing_end_device" : role >= 3 ? "end_device" : "sleepy_end_device");
