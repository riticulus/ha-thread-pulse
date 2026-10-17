// Checks the translations in src/i18n/ against English: no unknown keys, values of the same type, every text
// function returns a string. Keys missing in a translation fall back to English at runtime – they are listed as a
// warning, so a pull request with only English texts passes; with --strict (used for releases) they fail.
// Run: node tests/check-i18n.js [--strict]
"use strict";
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "src", "i18n");
const load = code => {
  const src = fs.readFileSync(path.join(dir, code + ".js"), "utf8").replace(/^export /gm, "");   // ES module → plain script
  const C = code.toUpperCase();
  return new Function(src + `; return { text: TEXT_${C}, names: typeof NAMES_${C} === "undefined" ? null : NAMES_${C} };`)();
};
const codes = fs.readdirSync(dir).filter(f => f.endsWith(".js") && f !== "index.js").map(f => f.slice(0, -3)).sort();
const en = load("en").text, keys = Object.keys(en).sort();
// sample arguments per function, so that every text function can be called
const samples = { foreignLabel: ["f2a0c0de0000d212"], hPowerCut: [140, ["Lamp"]], hWeakParent: ["Plug", -85, true], chParent: ["A", "B", -70],
  chSignal: ["A", "good", "weak", -82], chRole: ["Router", "End device"], respVal: [96, 95, 6], forwardedVal: [3, 12], asOf: ["10:00", 19], htChildrenBad: ["Plug", 8, 12], chGrade: ["B", "C"], hvOf: [2, 8], factorsOk: [3, 4], trendSignalNote: [40, 168], wiAlt: ["Plug", -70], hPowerCutRecent: [5, 7, ["Lamp"]], warnAttachRecent: [6, 7], warnDetachedRecent: [3, 7], stabWindowVal: [1, 2, 3], spCh: ["Zigbee", 20, 2450], spWifiCh: [9, 2442, 2462], spInside: ["a", "b", "Plug"], spZigbeeFix: ["25, 26"], spThreadFix: ["1, 11"], dcOpen: ["Plug"], dgOffline: [3, 7], dgWeak: ["Plug", -85], dgParentPower: ["Plug", 4], dgUnstable: [6, 3] };
const STRICT = process.argv.includes("--strict");
let problems = 0, missingCount = 0;
const fail = (code, msg) => { problems++; console.log(`  ${code}: ${msg}`); };
const missing = (code, what) => { missingCount++; if (STRICT) problems++; console.log(`  ${code}: missing ${what}${STRICT ? "" : " (English is used)"}`); };
for (const code of codes) {
  let t, names;
  try { ({ text: t, names } = load(code)); } catch (e) { fail(code, "cannot be loaded: " + e.message); continue; }
  const k = Object.keys(t).sort();
  for (const x of keys) if (!k.includes(x)) missing(code, "key " + x);
  for (const x of k) if (!keys.includes(x)) fail(code, "unknown key " + x);
  for (const x of keys) if (k.includes(x) && typeof t[x] !== typeof en[x]) fail(code, `${x} is ${typeof t[x]}, expected ${typeof en[x]}`);
  // objects (types, roles, tabNames …): keys English does not have are errors, missing ones fall back to English
  for (const o of keys.filter(x => en[x] && typeof en[x] === "object" && !Array.isArray(en[x]) && t[x])) {
    for (const x of Object.keys(t[o])) if (!(x in en[o])) fail(code, `unknown key ${o}.${x}`);
    for (const x of Object.keys(en[o])) if (!(x in t[o])) missing(code, `key ${o}.${x}`);
  }
  if (t.bootReasons && t.bootReasons.length > en.bootReasons.length) fail(code, "bootReasons is longer than in English");
  if (t.bootReasons && t.bootReasons.length < en.bootReasons.length) missing(code, "bootReasons entries");
  for (const x of keys) if (typeof en[x] === "function" && typeof t[x] === "function") {
    for (const args of [samples[x] || [1], samples[x] ? samples[x] : [3]]) {
      try { if (typeof t[x](...args) !== "string") fail(code, x + " does not return a string"); } catch (e) { fail(code, x + " throws: " + e.message); }
    }
  }
  if (names && !names.every(p => Array.isArray(p) && p.length === 2 && p.every(s => typeof s === "string"))) fail(code, "NAMES list must contain [english, translation] pairs");
  console.log(`${code}: ${k.length} keys${names ? `, ${names.length} entity names` : ""}`);
}
if (problems) { console.log(`${problems} problem(s)`); process.exit(1); }
console.log(missingCount ? `OK – ${missingCount} missing translation(s) use English${STRICT ? "" : " (fails with --strict)"}` : "all languages OK");
