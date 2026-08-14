#!/usr/bin/env node
// Build a correctly-encoded TERMIUM Plus alpha-search URL for one term.
//
// Usage:
//   node termium_url.js "flux de travaux" --lang fr
//   node termium_url.js "workflow" --lang en --mode any

const INDEX_BY_LANG_MODE = {
  "en:exact": "ent", // English terms (exact term)
  "en:word": "enw",  // Words in English terms
  "en:any": "alt",   // All terms, any language
  "fr:exact": "frt", // French terms (exact term)
  "fr:word": "frw",  // Words in French terms
  "fr:any": "alt",
  "es:exact": "est",
  "es:any": "alt",
  "pt:exact": "ptt",
  "pt:any": "alt",
};

const PAGE_LANG = { en: "eng", fr: "fra", es: "eng", pt: "eng" };

function buildUrl(term, lang, mode) {
  const pageLang = PAGE_LANG[lang];
  const index = INDEX_BY_LANG_MODE[`${lang}:${mode}`];
  if (!index) {
    throw new Error(`No index mapping for lang=${lang} mode=${mode}`);
  }
  const encodedTerm = encodeURIComponent(term);
  return (
    `https://www.btb.termiumplus.gc.ca/tpv2alpha/alpha-${pageLang}.html` +
    `?lang=${pageLang}&i=1&srchtxt=${encodedTerm}&index=${index}&codom2nd_wet=1#resultrecs`
  );
}

function parseArgs(argv) {
  const args = { lang: "en", mode: "exact", term: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lang") args.lang = argv[++i];
    else if (a === "--mode") args.mode = argv[++i];
    else rest.push(a);
  }
  args.term = rest.join(" ");
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.term) {
  console.error('Usage: node termium_url.js "<term>" [--lang en|fr|es|pt] [--mode exact|word|any]');
  process.exit(1);
}

console.log(buildUrl(args.term, args.lang, args.mode));
