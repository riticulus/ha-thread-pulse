// Checks the translations in src/i18n/: every language has exactly the same keys as English (also inside
// types, states and roles), values of the same type, the same number of restart reasons, and every text
// function returns a string. Run: node tests/check-i18n.js
"use strict";
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "src", "i18n");
const load = code => {
  const src = fs.readFileSync(path.join(dir, code + ".js"), "utf8");
  const C = code.toUpperCase();
  return new Function(src + `; return { text: TEXT_${C}, names: typeof NAMES_${C} === "undefined" ? null : NAMES_${C} };`)();
};
const codes = fs.readdirSync(dir).filter(f => f.endsWith(".js")).map(f => f.slice(0, -3)).sort();
const en = load("en").text, keys = Object.keys(en).sort();
// sample arguments per function, so that every text function can be called
const samples = { foreignLabel: ["f2a0c0de0000d212"], hPowerCut: [140, ["Lamp"]], hWeakParent: ["Plug", -85, true], chParent: ["A", "B", -70],
  chSignal: ["A", "good", "weak", -82], chRole: ["Router", "End device"], respVal: [96, 95, 6], forwardedVal: [3, 12], asOf: ["10:00", 19], htChildrenBad: ["Plug", 8, 12], chGrade: ["B", "C"], hvOf: [2, 8], factorsOk: [3, 4], trendSignalNote: [40, 168], wiAlt: ["Plug", -70], hPowerCutRecent: [5, 7, ["Lamp"]], warnAttachRecent: [6, 7], warnDetachedRecent: [3, 7], stabWindowVal: [1, 2, 3], spCh: ["Zigbee", 20, 2450], spWifiCh: [9, 2442, 2462], spInside: ["a", "b", "Plug"], spZigbeeFix: ["25, 26"], spThreadFix: ["1, 11"] };
let problems = 0;
const fail = (code, msg) => { problems++; console.log(`  ${code}: ${msg}`); };
for (const code of codes) {
  let t, names;
  try { ({ text: t, names } = load(code)); } catch (e) { fail(code, "cannot be loaded: " + e.message); continue; }
  const k = Object.keys(t).sort();
  for (const x of keys) if (!k.includes(x)) fail(code, "missing key " + x);
  for (const x of k) if (!keys.includes(x)) fail(code, "unknown key " + x);
  for (const x of keys) if (k.includes(x) && typeof t[x] !== typeof en[x]) fail(code, `${x} is ${typeof t[x]}, expected ${typeof en[x]}`);
  for (const o of ["types", "states", "roles", "hfTitle", "hlLevel", "tabNames", "devFilters", "dismissKinds", "spNames"]) if (JSON.stringify(Object.keys(t[o] || {}).sort()) !== JSON.stringify(Object.keys(en[o]).sort())) fail(code, o + " has other keys");
  if ((t.bootReasons || []).length !== en.bootReasons.length) fail(code, "bootReasons has another length");
  for (const x of keys) if (typeof en[x] === "function" && typeof t[x] === "function") {
    for (const args of [samples[x] || [1], samples[x] ? samples[x] : [3]]) {
      try { if (typeof t[x](...args) !== "string") fail(code, x + " does not return a string"); } catch (e) { fail(code, x + " throws: " + e.message); }
    }
  }
  if (names && !names.every(p => Array.isArray(p) && p.length === 2 && p.every(s => typeof s === "string"))) fail(code, "NAMES list must contain [english, translation] pairs");
  console.log(`${code}: ${k.length} keys${names ? `, ${names.length} entity names` : ""}`);
}
if (problems) { console.log(`${problems} problem(s)`); process.exit(1); }
console.log("all languages OK");
