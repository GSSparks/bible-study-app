# Scriptorium — Lexicon Digitization Pipeline

This directory is the workspace for converting scanned public-domain theological reference works
into structured JSON datasets that the app serves as built-in dictionaries and lexicons.

Completed datasets live in `backend/data/` and are picked up automatically at startup by
`builtinLexiconService.js`. No installation step required — just drop the directory in and restart.

---

## Workflow

### 1. Add the source PDF

Place the scanned PDF in `sources/`. Name it clearly: `AuthorTitleYear.pdf`.

### 2. Create a project directory under `in-progress/`

```
in-progress/
  vines-expository/
    notes.md          ← extraction notes, edge cases, decisions
    lexicon.json      ← work in progress
    module.json       ← fill out before starting (see SCHEMA.md)
```

### 3. Run the AI extraction pipeline

The Thayer dataset was produced with an AI-assisted OCR pipeline.
The recommended approach for new datasets:

1. Attach `SCHEMA.md` to your context so the model knows the exact output format.
2. Feed the PDF page by page (or in chunks via a PDF-to-text tool first).
3. Have the model emit one JSON entry per headword, following the schema exactly.
4. Validate the output with the schema (see below).
5. Spot-check 20–30 entries manually against the original scan.

Useful prompt fragment to include when extracting:
> "Produce output strictly conforming to the schema in SCHEMA.md.
> Use `null` for any field that is genuinely absent. Do not invent
> Strong's numbers — leave `strongs` null if you cannot confirm the mapping.
> Preserve the original text exactly; do not paraphrase or modernize."

### 4. Validate

The schema is in `SCHEMA.md`. A quick sanity check:

```bash
# Check entry count and spot a random entry
node -e "
const d = JSON.parse(require('fs').readFileSync('lexicon.json','utf8'));
console.log('entries:', d.length);
console.log(JSON.stringify(d[Math.floor(Math.random()*d.length)], null, 2));
"
```

Required checks before publishing:
- [ ] Every entry has `id`, `lemma`, `text`, `paragraphs`
- [ ] No entry has `strongs: ""` (must be a valid key or `null`)
- [ ] `text` is the full joined definition (not truncated)
- [ ] `source.pdf_pages` is populated
- [ ] Entry count is plausible for the work

### 5. Publish

Move the completed directory to `backend/data/`:

```bash
mv in-progress/vines-expository backend/data/
```

Restart the backend. The module will appear automatically in the dictionary picker and
Strong's popup (for entries with Strong's cross-links).

---

## Directory structure

```
digitization/
  README.md           ← this file
  SCHEMA.md           ← authoritative JSON schema spec (attach to AI extraction prompts)
  sources/            ← source PDFs (public domain originals)
  in-progress/        ← active extraction projects
    .gitignore        ← ignores large intermediate files
```

`backend/data/` is where finished datasets live — one subdirectory per work,
each containing `module.json` + `lexicon.json`.

---

## Target works

| Work | Why | Language | Source |
|---|---|---|---|
| Vine's Expository Dictionary of NT Words (1940) | Topical/expository companion to Thayer | Greek | Archive.org |
| Brown-Driver-Briggs Hebrew Lexicon (1906) | Standard Hebrew OT lexicon | Hebrew | Archive.org |
| Strong's Hebrew Dictionary | Brief glosses for OT study, paired with Strong's tagging | Hebrew | Archive.org |
| Liddell-Scott-Jones (abridged) | Classical Greek beyond the NT | Greek | Archive.org |
