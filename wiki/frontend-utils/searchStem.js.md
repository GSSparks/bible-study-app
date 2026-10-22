# frontend/src/utils/searchStem.js

**Purpose**

Converts a clicked Strong's-tagged phrase (e.g., `"was baptized"`) into a lightweight search stem (e.g., `"baptiz"`) that is more likely to substring-match entries in a topical Bible's key list. It strips stopwords and common English suffixes to land on the base form of the main word. The result is placed in an editable filter box, so an imperfect stem is a starting point, not a dead end.

**Key exports / contents**

- `simplifyForTopicalSearch(phrase)` — function accepting a plain text phrase string and returning a single lowercase stem string (or empty string for falsy input).
  - Lowercases the phrase.
  - Splits on whitespace and strips all non-alphabetic characters from each token.
  - Removes stopwords (articles, auxiliaries, pronouns, common verbs — ~50 words in `STOPWORDS`).
  - Takes the last remaining word (the main content word in a helper-verb + verb phrase structure).
  - Strips one common English suffix (`edly`, `ings`, `tion`, `ment`, `ing`, `ies`, `ed`, `es`, `ly`, `s`) if the result would still be ≥ 3 characters. Suffixes are tried longest-first.
- `STOPWORDS` — internal `Set` (not exported).
- `SUFFIXES` — internal array (not exported).

**Dependencies / relationships**

- No imports.
- Consumed by Strong's word-click handlers that populate a topical Bible search box pre-filled with a relevant term.

**Notes**

- This is explicitly NOT a full linguistic stemmer — irregular spelling changes and derivational roots are not handled. The intent is a "good enough" starting point that the user then refines.
- The minimum stem length of 3 characters after suffix stripping prevents degenerate results (e.g., stripping `-ies` from a 4-letter word should not leave a 1-character stub).
- Suffix list is sorted longest-first so e.g. `"ings"` is tried before `"ing"` and `"s"`.
