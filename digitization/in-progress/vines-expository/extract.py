#!/usr/bin/env python3
"""
Vine's Expository Dictionary — local PDF extraction pipeline.

Extracts entries from the PDF on your machine and writes lexicon.json,
module.json, and review.json in Scriptorium's SCHEMA.md format.
All text extraction runs locally; nothing passes through an external service.

Usage:
    # First run — NT section starts at page 472 in Part 1:
    python extract.py ../../sources/Vines-Part1.pdf --pages 472-800 --out out/

    # Continue with Part 2 (page numbers restart at 1 in the split file):
    python extract.py ../../sources/Vines-Part2.pdf --out out/ --append

    # Diagnose: print raw extracted text and exit
    python extract.py ../../sources/Vines-Part1.pdf --pages 472-474 --dump 120

Requirements: see shell.nix (pdfminer.six; pytesseract + pdf2image for OCR fallback)
"""

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# CID / encoding cleanup
# The PDF uses a custom font encoding: Greek glyphs come out as (cid:N)
# sequences.  Strong's numbers and English text are plain ASCII.
# ---------------------------------------------------------------------------

_CID_RE = re.compile(r'\(cid:\d+\)')

def strip_cids(text: str) -> str:
    """Remove (cid:N) sequences and tidy up leftover encoding artifacts."""
    t = _CID_RE.sub('', text)
    # Remove short runs of punctuation/symbols left behind by CID decoding
    # (single chars like !, $, #, %, & that aren't part of real English words)
    t = re.sub(r'(?<![A-Za-z0-9])[!$#%&*@\\^~]{1,3}(?![A-Za-z0-9])', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def starts_with_cid(line: str) -> bool:
    return line.lstrip().startswith('(cid:')

# ---------------------------------------------------------------------------
# Strong's number extraction
# Vine's format: GREEK_CID (TRANSLIT_CID, STRONG_NUM), definition...
# The Strong's number is always a plain 3–5-digit integer before a closing
# parenthesis, preceded by a comma.
# ---------------------------------------------------------------------------

def find_strongs(line: str) -> Optional[str]:
    """Return the first 'G<number>' found in a Vine's entry line, or None."""
    for m in re.finditer(r',\s*(\d{3,5})\s*\)', line):
        # Require the match to be reasonably near the start of the line
        # (avoids picking up scripture refs like "Rev. 22:1)")
        if m.start() < 250:
            return f"G{m.group(1)}"
    return None

def is_numbered_entry(line: str) -> Optional[int]:
    """Return entry number if line starts a numbered entry, else None."""
    m = re.match(r'^(\d+)\.\s+\(cid:', line)
    return int(m.group(1)) if m else None

def is_unnumbered_entry(line: str) -> bool:
    """True if line looks like a single unnumbered CID entry with a Strong's number."""
    return starts_with_cid(line) and bool(find_strongs(line))

def strip_entry_prefix(text: str, strongs: Optional[str]) -> str:
    """Strip the 'N. LEMMA (TRANSLIT, STRONGS), ' prefix from a CID-cleaned entry line."""
    text = re.sub(r'^\d+\.\s+', '', text)
    if strongs:
        num = re.escape(strongs[1:])  # "3306" from "G3306"
        text = re.sub(r'^.*?,\s*' + num + r'\s*\),?\s*', '', text)
    else:
        # No Strong's: skip leading non-alphabetic junk up to first real word
        text = re.sub(r'^[^a-z"\'(]{0,50}', '', text)
    return text

# ---------------------------------------------------------------------------
# Book abbreviation → OSIS code
# ---------------------------------------------------------------------------
_BOOK_MAP: dict[str, str] = {
    "gen": "Gen", "exod": "Exod", "exo": "Exod", "lev": "Lev",
    "num": "Num", "deut": "Deut", "deu": "Deut",
    "josh": "Josh", "judg": "Judg", "ruth": "Ruth",
    "1 sam": "1Sam", "2 sam": "2Sam", "1sam": "1Sam", "2sam": "2Sam",
    "1 kgs": "1Kgs", "2 kgs": "2Kgs", "1 kings": "1Kgs", "2 kings": "2Kgs",
    "1 chr": "1Chr", "2 chr": "2Chr", "1 chron": "1Chr", "2 chron": "2Chr",
    "ezra": "Ezra", "neh": "Neh", "esth": "Esth", "job": "Job",
    "ps": "Ps", "psa": "Ps", "prov": "Prov",
    "eccl": "Eccl", "song": "Song", "isa": "Isa", "jer": "Jer",
    "lam": "Lam", "ezek": "Ezek", "dan": "Dan", "hos": "Hos",
    "joel": "Joel", "amos": "Amos", "obad": "Obad", "jonah": "Jonah",
    "mic": "Mic", "nah": "Nah", "hab": "Hab", "zeph": "Zeph",
    "hag": "Hag", "zech": "Zech", "mal": "Mal",
    "matt": "Matt", "mat": "Matt", "mt": "Matt",
    "mark": "Mark", "mar": "Mark", "mk": "Mark",
    "luke": "Luke", "lk": "Luke",
    "john": "John", "jn": "John", "jo": "John",
    "acts": "Acts", "act": "Acts",
    "rom": "Rom",
    "1 cor": "1Cor", "2 cor": "2Cor", "1cor": "1Cor", "2cor": "2Cor",
    "gal": "Gal", "eph": "Eph", "phil": "Phil", "col": "Col",
    "1 thess": "1Thess", "2 thess": "2Thess",
    "1 tim": "1Tim", "2 tim": "2Tim", "1tim": "1Tim", "2tim": "2Tim",
    "tit": "Titus", "titus": "Titus",
    "philem": "Phlm", "phm": "Phlm", "phlm": "Phlm",
    "heb": "Heb", "jas": "Jas", "james": "Jas",
    "1 pet": "1Pet", "2 pet": "2Pet", "1pet": "1Pet", "2pet": "2Pet",
    "1 john": "1John", "2 john": "2John", "3 john": "3John",
    "1john": "1John", "2john": "2John", "3john": "3John",
    "1 jn": "1John", "2 jn": "2John", "3 jn": "3John",
    "jude": "Jude", "rev": "Rev",
}

def _osis_book(raw: str) -> Optional[str]:
    key = raw.strip().rstrip(".").lower()
    if key in _BOOK_MAP:
        return _BOOK_MAP[key]
    return _BOOK_MAP.get(re.sub(r'^([123])\s*', r'\1 ', key))

_SCRIPTURE_RE = re.compile(
    r'(?<!\w)((?:[123]\s)?[A-Z][a-z]+\.?)\s+(\d+):(\d+(?:[,\-]\s*\d+)*)'
)

def extract_scripture_refs(text: str) -> list[str]:
    refs = []
    for m in _SCRIPTURE_RE.finditer(text):
        book = _osis_book(m.group(1))
        if not book:
            continue
        for v in re.split(r'[,\-\s]+', m.group(3)):
            if v.strip().isdigit():
                refs.append(f"{book}.{m.group(2)}.{v.strip()}")
    return sorted(set(refs))

def extract_strongs_refs(text: str) -> list[str]:
    return sorted({f"G{m.group(1)}" for m in re.finditer(r'\bG(\d{3,5})\b', text)})

# ---------------------------------------------------------------------------
# Thayer index: Strong's number → full entry  (for lemma/translit backfill)
# ---------------------------------------------------------------------------
def load_thayer_by_strongs(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        entries = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Warning: could not load Thayer data: {e}", file=sys.stderr)
        return {}
    return {str(e["strongs"]): e for e in entries if e.get("strongs")}

# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------
def _has_real_text(pages: list[tuple[int, str]]) -> bool:
    if not pages:
        return False
    total = sum(len(t) for _, t in pages)
    alpha = sum(sum(1 for c in t if c.isalpha()) for _, t in pages)
    return (total / len(pages)) > 80 and (alpha / max(total, 1)) > 0.35

def extract_with_pdfminer(pdf: Path, rng: Optional[tuple[int, int]]) -> list[tuple[int, str]]:
    try:
        from pdfminer.high_level import extract_pages
        from pdfminer.layout import LTTextBox
    except ImportError:
        return []
    start, end = rng or (1, 999999)
    pages = []
    for n, layout in enumerate(extract_pages(str(pdf)), start=1):
        if n < start:
            continue
        if n > end:
            break
        text = "\n".join(el.get_text() for el in layout if isinstance(el, LTTextBox))
        pages.append((n, text))
    return pages

def extract_with_ocr(pdf: Path, rng: Optional[tuple[int, int]]) -> list[tuple[int, str]]:
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError:
        sys.exit("ERROR: OCR requires pdf2image and pytesseract. Run: nix-shell shell.nix")
    start, end = rng or (1, 999999)
    print(f"OCR: pages {start}–{end} at 300 dpi (slow)…", file=sys.stderr)
    images = convert_from_path(str(pdf), first_page=start, last_page=end, dpi=300)
    pages = []
    for i, img in enumerate(images):
        text = pytesseract.image_to_string(img, lang="eng")
        pages.append((start + i, text))
        print(f"  OCR page {start + i}", file=sys.stderr)
    return pages

def extract_text(pdf: Path, rng: Optional[tuple[int, int]]) -> list[tuple[int, str]]:
    pages = extract_with_pdfminer(pdf, rng)
    if _has_real_text(pages):
        print(f"Text layer: {len(pages)} pages.", file=sys.stderr)
        return pages
    print("Text layer absent — falling back to OCR.", file=sys.stderr)
    return extract_with_ocr(pdf, rng)

# ---------------------------------------------------------------------------
# Vine's parser
# ---------------------------------------------------------------------------
_HEADING_RE = re.compile(r'^[A-Z][A-Z ,\-\'\(\)\/]{1,58}$')
_SECTION_RE = re.compile(
    r'^[A-F]\.\s+(Verbs?|Nouns?|Adjectives?|Adverbs?|Pronouns?|Prepositions?|Phrases?|Particles?)\.?\s*$',
    re.IGNORECASE,
)
# Running page header like "ABIDE                    ABILITY" — skip
_PAGE_HDR_RE = re.compile(r'^[A-Z]{3,}\s{4,}[A-Z]{3,}$')

def _is_heading(s: str) -> bool:
    if not (2 <= len(s) <= 60):
        return False
    if not _HEADING_RE.match(s):
        return False
    if re.match(r'^[A-F]\.$', s):
        return False
    if not re.search(r'[A-Z]{3}', s):
        return False
    return True

def _split_paragraphs(text: str) -> list[str]:
    current, paras = [], []
    for line in text.splitlines():
        if not line.strip():
            if current:
                paras.append(" ".join(current))
                current = []
        else:
            current.append(line.strip())
    if current:
        paras.append(" ".join(current))
    return [p for p in paras if p.strip()]


@dataclass
class RawEntry:
    heading: str
    section: str
    num: int
    strongs: Optional[str]      # "G3306" — extracted directly from the line
    raw_line: str               # the original first line, for debugging
    text: str                   # cleaned (CIDs stripped) definition text
    paragraphs: list[str] = field(default_factory=list)
    pdf_pages: list[int] = field(default_factory=list)


def parse_vines(pages: list[tuple[int, str]]) -> tuple[list[RawEntry], list[dict]]:
    entries: list[RawEntry] = []
    review: list[dict] = []

    current_heading = ""
    current_section = ""
    current_entry: Optional[RawEntry] = None

    def flush():
        nonlocal current_entry
        if current_entry and current_entry.text.strip():
            current_entry.text = current_entry.text.strip()
            current_entry.paragraphs = _split_paragraphs(current_entry.text)
            entries.append(current_entry)
        current_entry = None

    for page_num, page_text in pages:
        for raw_line in page_text.splitlines():
            s = raw_line.strip()
            if not s:
                if current_entry:
                    current_entry.text += "\n\n"
                continue

            # Skip running page headers
            if _PAGE_HDR_RE.match(s):
                continue

            # English heading (ALL CAPS)
            if _is_heading(s):
                flush()
                current_heading = s
                current_section = ""
                continue

            # Section header (A. Verbs., B. Nouns., etc.)
            sm = _SECTION_RE.match(s)
            if sm:
                flush()
                current_section = sm.group(1).rstrip("s").capitalize()
                continue

            # Numbered entry: "1. (cid:...) (cid:..., 3306), ..."
            entry_num = is_numbered_entry(s)
            if entry_num is not None and current_heading:
                flush()
                strongs = find_strongs(s)
                text_start = strip_entry_prefix(strip_cids(s), strongs)
                current_entry = RawEntry(
                    heading=current_heading,
                    section=current_section,
                    num=entry_num,
                    strongs=strongs,
                    raw_line=s,
                    text=text_start,
                    pdf_pages=[page_num],
                )
                continue

            # Unnumbered single entry: "(cid:...) (cid:..., STRONGS), ..."
            if is_unnumbered_entry(s) and current_heading and current_entry is None:
                flush()
                strongs = find_strongs(s)
                text_start = strip_entry_prefix(strip_cids(s), strongs)
                current_entry = RawEntry(
                    heading=current_heading,
                    section=current_section,
                    num=1,
                    strongs=strongs,
                    raw_line=s,
                    text=text_start,
                    pdf_pages=[page_num],
                )
                continue

            # Continuation text
            if current_entry is not None:
                if page_num not in current_entry.pdf_pages:
                    current_entry.pdf_pages.append(page_num)
                cleaned = strip_cids(s)
                sep = "" if current_entry.text.endswith("\n\n") else " "
                current_entry.text += sep + cleaned

    flush()

    # Flag for review
    for e in entries:
        issues = []
        if not e.strongs:
            issues.append("no_strongs")
        if len(e.text.strip()) < 20:
            issues.append("short_text")
        if issues:
            review.append({
                "heading": e.heading,
                "section": e.section,
                "num": e.num,
                "strongs": e.strongs,
                "issues": issues,
                "raw_line_start": e.raw_line[:120],
            })

    return entries, review


# ---------------------------------------------------------------------------
# Schema entry builder
# ---------------------------------------------------------------------------
def strip_diacritics(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")

def build_entry(
    raw: RawEntry,
    thayer_by_strongs: dict,
    used_ids: set,
    seq: int,
) -> dict:
    strongs = raw.strongs  # already "G3306" format or None

    # Backfill lemma and transliteration from Thayer using the Strong's number.
    # This gives us proper Unicode Greek without needing to decode the PDF font.
    thayer = thayer_by_strongs.get(strongs) if strongs else None
    lemma = thayer.get("lemma") if thayer else None
    lemma_normalized = thayer.get("lemma_normalized") if thayer else None
    transliteration = thayer.get("transliteration") if thayer else None

    # Unique id
    if strongs:
        slug = re.sub(r"[^a-z0-9]", "", raw.heading.lower().split(",")[0])[:10]
        candidate = strongs
        if candidate in used_ids:
            candidate = f"{strongs}-{slug}"
        n = 2
        while candidate in used_ids:
            candidate = f"{strongs}-{slug}-{n}"
            n += 1
        entry_id = candidate
    else:
        entry_id = f"T{seq:04d}"

    used_ids.add(entry_id)

    # Grammar: section category (Verb / Noun / Adjective)
    grammar = (raw.section + ".") if raw.section else None

    clean_text = raw.text.strip()

    return {
        "schema_version": 2,
        "id": entry_id,
        "strongs": strongs,
        "lemma": lemma,
        "lemma_normalized": lemma_normalized,
        "transliteration": transliteration,
        "grammar": grammar,
        "text": clean_text,
        "paragraphs": raw.paragraphs or [clean_text],
        "scripture_references": extract_scripture_refs(clean_text),
        "strongs_references": extract_strongs_refs(clean_text),
        "thayer_order": None,
        "english_keyword": raw.heading,
        "source": {
            "work": "Vine's Expository Dictionary of New Testament Words",
            "edition_year": 1940,
            "scan_id": None,
            "pdf_pages": raw.pdf_pages,
            "print_pages": [],
        },
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_range(s: str) -> tuple[int, int]:
    m = re.match(r"^(\d+)[-–](\d+)$", s.strip())
    if m:
        return int(m.group(1)), int(m.group(2))
    n = int(s.strip())
    return n, n


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("pdf", help="PDF file (Part1 or Part2)")
    ap.add_argument("--pages", metavar="N-M", help="Page range (e.g. 472-800 for NT section of Part1)")
    ap.add_argument("--out", default="out", help="Output directory (default: out/)")
    ap.add_argument("--append", action="store_true", help="Append to existing lexicon.json")
    ap.add_argument(
        "--thayer",
        metavar="PATH",
        default=str(Path(__file__).parent.parent.parent.parent / "backend/data/thayer-lexicon/lexicon.json"),
        help="Path to Thayer lexicon.json for lemma/transliteration backfill",
    )
    ap.add_argument(
        "--dump",
        metavar="N",
        type=int,
        default=0,
        help="Print first N lines of extracted text (repr format) and exit",
    )
    args = ap.parse_args()

    pdf = Path(args.pdf)
    if not pdf.exists():
        sys.exit(f"ERROR: {pdf} not found")

    page_range = parse_range(args.pages) if args.pages else None

    print(f"Extracting: {pdf.name}", file=sys.stderr)
    pages = extract_text(pdf, page_range)
    if not pages:
        sys.exit("ERROR: no text extracted.")
    print(f"{len(pages)} pages extracted.", file=sys.stderr)

    # --dump mode: inspect raw text and exit
    if args.dump:
        count = 0
        for page_num, text in pages:
            print(f"\n{'='*60}\nPAGE {page_num}\n{'='*60}")
            for line in text.splitlines():
                print(repr(line))
                count += 1
                if count >= args.dump:
                    sys.exit(0)
        sys.exit(0)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # Thayer Strong's index for lemma backfill
    thayer_path = Path(args.thayer)
    thayer_by_strongs = load_thayer_by_strongs(thayer_path)
    if thayer_by_strongs:
        print(f"Thayer index: {len(thayer_by_strongs)} entries by Strong's number", file=sys.stderr)
    else:
        print("Thayer index not found — lemma/transliteration fields will be null.", file=sys.stderr)

    # Parse
    raw_entries, review_items = parse_vines(pages)
    mapped = sum(1 for e in raw_entries if e.strongs)
    print(f"Parsed: {len(raw_entries)} entries ({mapped} with Strong's), {len(review_items)} flagged.", file=sys.stderr)

    # Load existing if appending
    used_ids: set[str] = set()
    existing: list[dict] = []
    lexicon_path = out / "lexicon.json"
    if args.append and lexicon_path.exists():
        existing = json.loads(lexicon_path.read_text(encoding="utf-8"))
        for e in existing:
            used_ids.add(e["id"])
        print(f"Appending to {len(existing)} existing entries.", file=sys.stderr)

    existing_review: list[dict] = []
    review_path = out / "review.json"
    if args.append and review_path.exists():
        existing_review = json.loads(review_path.read_text(encoding="utf-8"))

    # Build schema entries
    seq_start = len(existing) + 1
    new_entries = [
        build_entry(r, thayer_by_strongs, used_ids, seq_start + i)
        for i, r in enumerate(raw_entries)
    ]

    # Write outputs
    all_entries = existing + new_entries
    lexicon_path.write_text(
        json.dumps(all_entries, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"lexicon.json: {len(all_entries)} entries → {lexicon_path}", file=sys.stderr)

    all_review = existing_review + review_items
    review_path.write_text(
        json.dumps(all_review, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if all_review:
        print(f"review.json: {len(all_review)} items → {review_path}", file=sys.stderr)

    module_path = out / "module.json"
    if not module_path.exists():
        module_path.write_text(
            json.dumps({
                "name": "Vine's Expository Dictionary of New Testament Words",
                "description": "Expository dictionary of NT Greek words organized by English keyword. W.E. Vine, 1940.",
                "type": "DICT",
                "language": "greek",
                "format": "thayer-json",
                "dataFile": "lexicon.json",
            }, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"module.json → {module_path}", file=sys.stderr)

    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
