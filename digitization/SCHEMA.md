# Lexicon / Dictionary JSON Schema

This document is the authoritative specification for all datasets produced in this directory.
It is written to be used directly as a prompt attachment when running AI-assisted extraction pipelines.

---

## Output: `lexicon.json`

A JSON array of entry objects. Every field below should be present on every object, using `null`
for fields that genuinely do not apply rather than omitting them.

```json
[
  {
    "schema_version": 2,
    "id": "G2532",
    "strongs": "G2532",
    "lemma": "καί",
    "lemma_normalized": "καί",
    "transliteration": "kaí",
    "grammar": ", a conj.,",
    "text": "and; the most freq. by far of all the particles in the N. T. ...",
    "paragraphs": [
      "and; the most freq. by far ...",
      "I. It serves as a copulative ..."
    ],
    "scripture_references": ["Mt.3.16", "Jn.1.1"],
    "strongs_references": ["G2532", "H430"],
    "thayer_order": 2859,
    "source": {
      "work": "A Greek-English Lexicon of the New Testament",
      "edition_year": 1889,
      "scan_id": "greekenglishlexi00grimuoft",
      "pdf_pages": [339],
      "print_pages": ["315"]
    }
  }
]
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | int | yes | Always `2` for new datasets |
| `id` | string | yes | `G<number>` when directly Strong's-linked; `T<NNNN>` provisional otherwise; `H<number>` for Hebrew |
| `strongs` | string \| null | yes | Primary Strong's number, e.g. `"G2532"` or `"H430"`. Null if no cross-link exists |
| `lemma` | string | yes | Headword in original script (polytonic Greek, pointed Hebrew, etc.) |
| `lemma_normalized` | string | yes | Headword without diacritics / accents for index searches |
| `transliteration` | string \| null | yes | SBL-style romanization, or null |
| `grammar` | string \| null | yes | Morphological prefix (part of speech, declension, etc.) appearing immediately after headword in the source. Null if absent |
| `text` | string | yes | Full definition as a single string. Even when `paragraphs` is populated, `text` must be the complete joined definition |
| `paragraphs` | string[] | yes | Definition split at meaningful semantic breaks (Roman numeral sections, numbered subdivisions). One-element array if no natural breaks exist |
| `scripture_references` | string[] | yes | OSIS-format references found in the entry (`"Mt.3.16"`). Empty array if none |
| `strongs_references` | string[] | yes | Other Strong's numbers referenced within the entry. Empty array if none |
| `thayer_order` | int \| null | yes | Sequential position in the source work (1-based). Null for non-Thayer datasets |
| `source.work` | string | yes | Full title of the source work |
| `source.edition_year` | int | yes | Year of the edition scanned |
| `source.scan_id` | string \| null | yes | Internet Archive identifier or similar, null if unknown |
| `source.pdf_pages` | int[] | yes | 1-based page numbers in the PDF where this entry appears |
| `source.print_pages` | string[] | yes | Page numbers as printed in the original book |

### ID conventions

- Greek NT vocabulary → `G<Strong's number>`, e.g. `G2532`
- Hebrew OT vocabulary → `H<Strong's number>`, e.g. `H430`
- Entries with no Strong's mapping → `T<zero-padded 4-digit sequence>`, e.g. `T0042`
- Works that are not lexicons (topical, expository) → use a slug, e.g. `vine:remain`

---

## Output: `module.json`

Lives alongside `lexicon.json` in the same directory. This is what `builtinLexiconService.js`
reads to register the dataset with the application.

```json
{
  "name": "Human-readable title",
  "description": "One-sentence description.",
  "type": "DICT",
  "language": "greek",
  "format": "thayer-json",
  "dataFile": "lexicon.json"
}
```

### `type` values

| Value | Use |
|---|---|
| `DICT` | Lexicons, dictionaries, concordances |
| `COMMENTARY` | Verse-by-verse commentary |
| `BOOK` | Prose books (not keyed to Scripture) |

### `language` values

`"greek"`, `"hebrew"`, `"english"`, `"aramaic"`, or `null` for language-neutral works.

### `format` values

| Value | Meaning |
|---|---|
| `thayer-json` | The schema defined in this document (default for all new lexicons) |

---

## Completed datasets (already in `backend/data/`)

| Directory | Work | Coverage | Language |
|---|---|---|---|
| `thayer-lexicon/` | Thayer's Greek-English Lexicon (1889) | 6,134 NT Greek entries | Greek |

---

## Planned datasets

Add a row here when a project is started.

| Directory | Work | Edition | Status |
|---|---|---|---|
| `vines-expository/` | Vine's Expository Dictionary of NT Words | 1940 | Planned |
| `strongs-hebrew/` | Brown-Driver-Briggs (BDB) Hebrew Lexicon | 1906 | Planned |
