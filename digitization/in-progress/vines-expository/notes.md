# Vine's Expository Dictionary — Extraction Notes

Source: `digitization/sources/Vines-Expositary-Dictionary.pdf` (1,602 pages)
Split into: `Vines-Part1.pdf` (pages 1–800), `Vines-Part2.pdf` (pages 801–1602)

## Vine's structure (for parser tuning)

- English headings are ALL CAPS lines, e.g. `ABIDE, ABODE`
- Under each heading: optional section headers `A. Verbs.` / `B. Nouns.` etc.
- Each Greek entry: `1. MENŌ (μένω), verb note, definition text...`
- Cross-refs at end of entries: `See DWELL, REMAIN, TARRY.`
- Scripture refs inline: `Matt. 10:11`, `1 Cor. 13:7`
- Strong's numbers: NOT in the 1940 edition — mapped via Thayer lemma index

## Known parsing challenges

- Page running headers (e.g. `ABIDE        ABILITY`) must be skipped
- Some entries span multiple pages
- OCR may confuse macron letters (Ō, Ē) with O, E — review.json will flag these
- Greek characters in parentheses may OCR poorly; check `no_greek_chars` flags

## Run log

| Date | Pages | Entries | Flagged | Notes |
|------|-------|---------|---------|-------|
| 2026-10-24 | Part1: 472–800, Part2: full | 7458 | 256 (3.4%) | 97% Strong's, 61% lemma (Thayer backfill). NT section starts p.472 in Part1 (Complete edition has OT first). |

## Publishing

When complete and reviewed:
```bash
mv out/ ../../../backend/data/vines-expository/
```
Restart backend — module appears automatically in dictionary picker.
