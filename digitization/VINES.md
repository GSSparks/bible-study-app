  ## Notes specific to Vine's

  Vine's is organized by English keyword (e.g. "ABIDE", "ABILITY") with Greek words analyzed under each English
  heading. Because the application looks up entries by Strong's number, expand each Greek word into its own top-level
  entry. Use the Greek lemma as `lemma`, the Strong's number as `id` and `strongs`, and include the English keyword(s)
   in the definition body naturally (e.g. "Used in the sense of ABIDE...").

  For entries where Vine discusses multiple Greek words under one English heading, emit one JSON object per Greek word
   — not one object per English heading.

  If a Greek word appears under multiple English headings (common in Vine's), create one entry per occurrence using a
  unique id suffix: e.g. `G3306-abide`, `G3306-remain`. Set `strongs` to the base number (`G3306`) on all of them.

  Use `"format": "thayer-json"` and `"type": "DICT"` in module.json. Set `"language": "greek"`.

  Work through the PDF in chunks of 20–30 pages. After each chunk, output the JSON array for that chunk only — do not
  restate entries from previous chunks. I will concatenate them.

  The last instruction about chunking is important — it prevents the model from trying to hold the whole book in one
  response and hitting output limits.
