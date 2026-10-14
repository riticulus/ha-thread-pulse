// Formats the JavaScript in src/ with Prettier (settings in .prettierrc.json).
//   node tools/format.mjs          format in place
//   node tools/format.mjs --check  only report files that are not formatted (exit code 1) – used by CI
// Most files in src/ are parts of one function (see build.py) and are not valid JavaScript on their own: they are
// wrapped in a function for Prettier and unwrapped again. "//#" notes at the top stay where they are.
import fs from "node:fs";
import path from "node:path";
import * as prettier from "prettier";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src");
const TOP_LEVEL = new Set(["version.js", "icons.js", "card.js"]);     // complete top-level code, formatted as is
const OPEN = "function __tpPart() {", CLOSE = "}";

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".js")).map(f => path.join(SRC, f))
  .concat(fs.readdirSync(path.join(SRC, "i18n")).filter(f => f.endsWith(".js")).map(f => path.join(SRC, "i18n", f)));
const options = { ...(await prettier.resolveConfig(path.join(SRC, "core.js"))), parser: "babel" };

async function format(file, text) {
  const name = path.relative(SRC, file), lines = text.replace(/\n$/, "").split("\n");
  let n = 0; while (n < lines.length && lines[n].startsWith("//#")) n++;
  const notes = lines.slice(0, n), body = lines.slice(n).join("\n");
  if (TOP_LEVEL.has(name) || name.startsWith("i18n/")) return notes.concat((await prettier.format(body, options)).replace(/\n$/, "")).join("\n") + "\n";
  // core.js opens the function that the other parts are placed in, start.js closes it (build.py adds the brace)
  const wrapped = name === "core.js" ? body + "\n" + CLOSE : OPEN + "\n" + body + "\n" + CLOSE;
  const out = (await prettier.format(wrapped, options)).replace(/\n$/, "").split("\n");
  if (out.pop() !== CLOSE) throw new Error(name + ": unexpected end after formatting");
  if (name !== "core.js" && out.shift() !== OPEN) throw new Error(name + ": unexpected start after formatting");
  return notes.concat(out).join("\n") + "\n";
}

const check = process.argv.includes("--check");
let bad = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8"), out = await format(file, text);
  if (out === text) continue;
  bad++;
  if (check) console.log("not formatted: " + path.relative(ROOT, file));
  else { fs.writeFileSync(file, out); console.log("formatted: " + path.relative(ROOT, file)); }
}
if (check && bad) { console.log(`${bad} file(s) – run: npm run format`); process.exit(1); }
if (!bad) console.log("all files formatted");
