// All languages. A new language: add its file here (and to the list in src/card.js for the visual editor).
import { TEXT_EN } from "./en.js";
import { TEXT_DE, NAMES_DE } from "./de.js";
import { TEXT_ES, NAMES_ES } from "./es.js";
import { TEXT_FR, NAMES_FR } from "./fr.js";
import { TEXT_IT, NAMES_IT } from "./it.js";
import { TEXT_NL, NAMES_NL } from "./nl.js";

export const TEXT = { en: TEXT_EN, de: TEXT_DE, es: TEXT_ES, fr: TEXT_FR, it: TEXT_IT, nl: TEXT_NL };
// translations of common English entity names (e.g. "Active current"), per language
export const LOCAL_NAMES = { de: NAMES_DE, es: NAMES_ES, fr: NAMES_FR, it: NAMES_IT, nl: NAMES_NL };

// Texts of a language. Keys missing in a translation come from English (also inside objects such as roles), so a
// new feature only needs its English texts – the other languages can follow later (tests/check-i18n.js lists them).
const TEXT_CACHE = {};
export function textFor(code) {
  const en = TEXT.en,
    t = TEXT[code];
  if (!t || t === en) return en;
  if (TEXT_CACHE[code]) return TEXT_CACHE[code];
  const isObj = v => v && typeof v === "object" && !Array.isArray(v),
    out = { ...en };
  for (const [k, v] of Object.entries(t)) out[k] = isObj(v) && isObj(en[k]) ? { ...en[k], ...v } : v;
  return (TEXT_CACHE[code] = out);
}
