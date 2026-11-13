// Card option `routers` (issue #117): names for Thread routers that are not Matter devices of Home Assistant – an
// OpenThread stick used as a range extender, an ESPHome device on Thread, the border router of another system – and
// which of them is the border router Home Assistant uses.
//
//   routers:
//     - address: "ba1071a9a6f296a1"   # extended address, in quotes
//       name: Dongle-E Extender
//       area: Office                  # optional, for the room view
//     - address: "b215681f96ce0197"
//       border_router: true
//
// A list and not a map `address: name`: YAML reads an unquoted address such as 1234567812345678 or 12e4567812345678
// as a number and silently changes it. In a list the address is a value, so that can be detected and reported.

// "BA:10:71:A9:A6:F2:96:A1", "0xba1071a9a6f296a1" … → the 16 hex digits used as id everywhere in Thread Pulse
const normalise = a =>
  a
    .trim()
    .toLowerCase()
    .replace(/^0x/, "")
    .replace(/[\s:.-]/g, "");
const text = v => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

// → { byId: { <address>: { name, area } }, br: <address> | null, errors: [text, …] }; entries with errors are left out
export function parseRouters(list) {
  const out = { byId: {}, br: null, errors: [] };
  if (list === undefined || list === null || list === "") return out;
  if (!Array.isArray(list)) {
    out.errors.push("routers: must be a list of entries with an address");
    return out;
  }
  list.forEach((r, i) => {
    const where = `routers, entry ${i + 1}`;
    if (!r || typeof r !== "object" || r.address === undefined || r.address === null)
      return out.errors.push(`${where}: address is missing`);
    if (typeof r.address !== "string")
      return out.errors.push(`${where}: put the address in quotes, e.g. address: "ba1071a9a6f296a1"`);
    const id = normalise(r.address);
    if (!/^[0-9a-f]{16}$/.test(id))
      return out.errors.push(`${where}: "${r.address}" is not an extended address (16 hex digits)`);
    if (out.byId[id]) return out.errors.push(`${where}: the address ${id} is listed twice`);
    if (r.border_router === true) {
      if (out.br) return out.errors.push(`${where}: only one router can be the border_router`);
      out.br = id;
    }
    out.byId[id] = { name: text(r.name), area: text(r.area) };
  });
  return out;
}

// standalone page: ?router=<address>:<name> (may be repeated) and ?br=<address>
export function routersFromParams(params) {
  // the address may itself be written with colons (BA:10:…:A1:Name)
  const list = params.getAll("router").map(s => {
    const m = /^((?:[0-9a-f]{2}[:-]){7}[0-9a-f]{2}|[^:]*)(?::(.*))?$/is.exec(s);
    return { address: m[1], name: m[2] || "" };
  });
  const br = params.get("br");
  if (br) {
    const own = list.find(r => normalise(r.address) === normalise(br));
    if (own) own.border_router = true;
    else list.push({ address: br, border_router: true });
  }
  return list.length ? list : undefined;
}
