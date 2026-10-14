// Runs ESLint on the assembled card and reports every message at its place in src/ (run `python3 build.py` first;
// `npm run lint` does both). The files in src/ are parts of one function and cannot be linted alone – but each of
// them appears unchanged in dist/ha-thread-pulse.js, so its lines can be found there again.
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src"), CARD = path.join(ROOT, "dist/ha-thread-pulse.js");
const card = fs.readFileSync(CARD, "utf8");

// where each source file starts in the card: [file, first card line, first source line, number of lines]
const blocks = [];
const sources = fs.readdirSync(SRC).filter(f => f.endsWith(".js")).map(f => path.join(SRC, f))
  .concat(fs.readdirSync(path.join(SRC, "i18n")).filter(f => f.endsWith(".js")).map(f => path.join(SRC, "i18n", f)));
for (const file of sources) {
  const lines = fs.readFileSync(file, "utf8").replace(/\n$/, "").split("\n");
  let notes = 0; while (notes < lines.length && lines[notes].startsWith("//#")) notes++;   // build.py drops these
  const body = lines.slice(notes).join("\n"), at = card.indexOf(body);
  if (at < 0) { console.log(`${path.relative(ROOT, file)} not found in the card – run python3 build.py first`); process.exit(1); }
  blocks.push([path.relative(ROOT, file), card.slice(0, at).split("\n").length, notes + 1, lines.length - notes]);
}
const where = line => {
  const b = blocks.find(([, start, , n]) => line >= start && line < start + n);
  return b ? `${b[0]}:${line - b[1] + b[2]}` : `${path.relative(ROOT, CARD)}:${line}`;
};

const eslint = new ESLint({ cwd: ROOT });
const results = (await eslint.lintText(card, { filePath: CARD })).concat(await eslint.lintFiles(["tools", "tests", "eslint.config.mjs"]));
let count = 0;
for (const r of results) for (const m of r.messages) {
  count++;
  const loc = r.filePath === CARD ? where(m.line) : `${path.relative(ROOT, r.filePath)}:${m.line}`;
  console.log(`${loc}:${m.column}  ${m.message}  (${m.ruleId || "syntax"})`);
}
if (count) { console.log(`${count} problem(s)`); process.exit(1); }
console.log("no problems");
