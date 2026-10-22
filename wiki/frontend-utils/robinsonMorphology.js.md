# frontend/src/utils/robinsonMorphology.js

**Purpose**

Decodes Robinson's Morphological Analysis codes (the `"robinson:T-NSM"` / `"N-NSM"` / `"V-PAI-3S"` style tags that SWORD attaches to Greek NT words) into plain-English grammatical glosses. Used in the interlinear and Word Study views to display human-readable morphology labels alongside raw Strong's markup.

**Key exports / contents**

- `decodeRobinsonMorph(code)` — accepts a Robinson morph code string (with or without the `robinson:` prefix already stripped via `cleanMorph`) and returns a plain-English gloss string, or `null` if the part of speech is unrecognized.
  - For verbs (`V`): assembles `"Verb, {tense} {voice} {mood}, {person} {number}"` (e.g., `"Verb, present active indicative, 3rd person singular"`).
  - For nouns/adjectives/articles/pronouns: assembles `"Noun, nominative singular masculine"` etc. from the packed case-number-gender field.
  - For indeclinables (`CONJ`, `PREP`, `ADV`, `PRT`, etc.): returns just the part-of-speech label.
  - Returns `null` (not an empty string) for unrecognized POS codes — callers should fall back to displaying the raw code.
- Internal lookup tables (not exported): `PART_OF_SPEECH`, `CASE`, `NUMBER`, `GENDER`, `TENSE`, `VOICE`, `MOOD`, `PERSON`.

**Dependencies / relationships**

- No imports.
- Used alongside `cleanMorph` from `parseInterlinear.js` — `cleanMorph` strips the `robinson:` prefix before passing the code here.
- Consumed by interlinear display components and Word Study views.

**Notes**

- The function is intentionally "best-effort" — it does not cover every Robinson code variant (rarer pronoun subtypes, some irregular categories). The raw code should always be shown alongside the gloss as the authoritative source.
- The `V` branch parses the Tense-Voice-Mood as a packed three-character string (e.g., `PAI` = present active indicative), then an optional person-number string (e.g., `3S` = 3rd person singular).
- Non-verb inflected forms (nouns, adjectives, articles, pronouns) use a packed case-number-gender string (e.g., `NSM` = nominative singular masculine).
