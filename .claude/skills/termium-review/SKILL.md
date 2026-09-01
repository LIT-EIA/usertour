---
name: termium-review
description: Look up official English/French terminology on the Government of Canada's TERMIUM+ database, and use it to review, validate, or QA translations against the official record. Use this whenever the user wants to check, verify, audit, or spot-check a translation (especially EN<->FR government, legal, or technical terminology), asks for the "official" or "correct" Government of Canada term for something, or hands over a glossary/spreadsheet of source terms with translations to review — even if they don't say "TERMIUM" by name.
---

# TERMIUM Plus terminology review

TERMIUM Plus (btb.termiumplus.gc.ca) is the Government of Canada's official
terminology and linguistic data bank. It's the authoritative source for how
federal documents render technical, legal, and administrative terms in
English, French, Spanish, and Portuguese.

The search results page is server-rendered — the real records (main term,
synonyms, definitions, subject field, sourced OBS notes) are present directly
in the HTML, not injected by client-side JS. This means a plain fetch of the
search URL returns genuine data, confirmed by inspecting the raw HTML
(records cite real sources, e.g. entries quoting the French *Journal
officiel*). It is not a JS-only shell.

## Looking up one term

Build the search URL with the helper script — it handles percent-encoding
correctly, which matters a lot for French/Spanish/Portuguese accented
characters (a bad encoding silently returns zero or wrong results):

```bash
node .claude/skills/termium-review/scripts/termium_url.js "<term>" --lang en|fr|es|pt [--mode exact|word|any]
```

- `--lang` is the language of the term you're searching *for* (the source
  term you have in hand), not the language you want back. TERMIUM returns
  equivalents in all available languages regardless of which one you search.
- `--mode exact` (default) matches only that exact term — use this for
  review workflows, it's precise and low-noise.
- `--mode any` broadens to any term/any language — fall back to this only if
  an exact search returns nothing, since it can surface loosely related
  entries.

Then fetch it with WebFetch. Always phrase the extraction prompt to forbid
invention, since the fetch pipeline summarizes HTML with a small model and
you want it reporting what's actually on the page, not filling gaps:

> Extract any terminology results for "<term>": main entry term(s), all
> listed equivalents in other languages (including synonyms), definitions,
> notes, and subject field. If the page shows no matching records, say so
> explicitly instead of inventing content.

**Reliability**: the underlying page content is real TERMIUM data (verified
directly against raw HTML, not just the summarized output). The remaining
risk is the summarization step dropping or slightly rephrasing a nuance —
fine for a first-pass review, but for anything going into a published or
legally-sensitive document, tell the user to spot-check the specific record
on the live site before finalizing.

## Reviewing a list of translations

When given a list/glossary of source terms with proposed translations (a
spreadsheet, a table pasted in chat, a CSV file), process it row by row:

1. For each row, build the URL for the **source** term in its source
   language, `--mode exact` first.
2. Fetch and extract the TERMIUM equivalents in the **target** language,
   using the extraction prompt above.
3. Compare the proposed translation against what TERMIUM returned and
   classify:

   - **Match** — proposed translation equals the TERMIUM main term or one of
     its listed synonyms.
   - **Variant** — close but not identical (e.g. capitalization, singular
     vs. plural, article present/absent, hyphenation). Note the difference.
   - **Mismatch** — TERMIUM has an entry for the source term, but the
     proposed translation isn't among its equivalents or synonyms.
   - **Ambiguous** — multiple distinct TERMIUM entries exist for the source
     term across different subject fields (e.g. a general-usage sense vs. a
     legal or technical sense), and which one applies depends on context
     you don't have. Flag it for the user rather than guessing.
   - **Not found** — no exact-term record on TERMIUM. Retry once with
     `--mode any` before giving up; if still nothing, say so rather than
     falling back to your own knowledge silently — the whole point of the
     review is to check against the official source.

4. Report results as a table:

   | Source term | Proposed translation | TERMIUM equivalent(s) | Subject field | Verdict | Notes |
   |---|---|---|---|---|---|

   Keep "Notes" terse — just what a reviewer needs to decide, e.g. "TERMIUM
   also lists 'X' as a synonym" or "found under Legal Affairs domain, confirm
   this is the intended sense."

5. Do lookups one at a time rather than firing them all off in a burst —
   this is a public government service, not an API meant for bulk querying,
   so pace requests as you would any manual research task.

For large lists (dozens+ of terms), tell the user roughly how long it'll
take before starting, and consider offering to do a first batch (e.g. 10
terms) so they can confirm the verdict format works for them before you run
the rest.

## Example

Reviewing whether "flux de travaux" is a correct French rendering of
"workflow":

```
node ~/.claude/skills/termium-review/scripts/termium_url.js "workflow" --lang en
```

→ fetch → TERMIUM's main French entry for "workflow" is "flux de travaux"
(correct, masculine noun) → **Match**.
