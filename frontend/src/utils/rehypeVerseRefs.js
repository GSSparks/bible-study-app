import { visit, SKIP } from 'unist-util-visit';

const BOOKS =
  '(?:1|2|3)\\s?(?:Samuel|Sam|Kings|Chronicles|Chr|Corinthians|Cor|Thessalonians|Thess|Timothy|Tim|Peter|Pet|John|Jn)|' +
  'Genesis|Gen|Exodus|Exod|Exo|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Joshua|Josh|Judges|Judg|' +
  'Ruth|Ezra|Nehemiah|Neh|Esther|Est|Job|Psalms|Psalm|Psa|Ps|Proverbs|Prov|Pro|Ecclesiastes|Eccl|' +
  'Song\\s+of\\s+Solomon|Song\\s+of\\s+Songs|Song|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|' +
  'Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Micah|Mic|Nahum|Nah|' +
  'Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|' +
  'Matthew|Matt|Mat|Mark|Mk|Luke|Lk|Acts|Romans|Rom|Galatians|Gal|' +
  'Ephesians|Eph|Philippians|Phil|Colossians|Col|Titus|Philemon|Phlm|Hebrews|Heb|' +
  'James|Jas|Jude|Revelation|Rev';

const VERSE_RE = new RegExp(
  `\\b((?:${BOOKS}))\\s+(\\d+)(?::(\\d+)(?:[\\-\\u2013](\\d+))?)?\\b`,
  'g'
);

export function rehypeVerseRefs() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (['a', 'code', 'pre', 'script'].includes(parent.tagName)) return;

      const text = node.value;
      const newNodes = [];
      let lastIndex = 0;

      const re = new RegExp(VERSE_RE.source, 'g');
      let match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
          newNodes.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        newNodes.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['verse-ref'], 'data-ref': match[0].trim() },
          children: [{ type: 'text', value: match[0] }],
        });
        lastIndex = match.index + match[0].length;
      }

      if (newNodes.length === 0) return;
      if (lastIndex < text.length) {
        newNodes.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...newNodes);
      return [SKIP, index + newNodes.length];
    });
  };
}
