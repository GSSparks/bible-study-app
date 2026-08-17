/**
 * Best-effort plain-English gloss for Robinson's Morphological Analysis
 * codes (the "robinson:T-NSM" style tags SWORD attaches to Greek NT
 * words). Unlike the SWORD rendering quirks elsewhere in this app, this
 * scheme is externally documented and stable — but it's still general
 * knowledge rather than something verified against this app's actual
 * data, and it doesn't cover every code (rarer categories, some pronoun
 * subtypes, etc. fall through). Callers should always show the raw code
 * alongside this, never in place of it — if a gloss is wrong or a code
 * isn't recognized, the raw code is still the ground truth.
 */

const PART_OF_SPEECH = {
  N: 'Noun',
  A: 'Adjective',
  T: 'Article',
  CONJ: 'Conjunction',
  COND: 'Conditional',
  PREP: 'Preposition',
  PRT: 'Particle',
  'PRT-N': 'Negative particle',
  ADV: 'Adverb',
  INJ: 'Interjection',
  V: 'Verb',
  ARAM: 'Aramaic word',
  HEB: 'Hebrew word',
  PPRO: 'Personal pronoun',
  RPRO: 'Relative pronoun',
  DPRO: 'Demonstrative pronoun',
  APRO: 'Interrogative/indefinite pronoun',
  RRPRO: 'Reciprocal pronoun',
  XPRO: 'Reflexive pronoun',
  CPRO: 'Possessive pronoun',
  QPRO: 'Correlative pronoun',
};

const CASE = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
const NUMBER = { S: 'singular', P: 'plural' };
const GENDER = { M: 'masculine', F: 'feminine', N: 'neuter' };
const TENSE = { P: 'present', I: 'imperfect', F: 'future', A: 'aorist', X: 'perfect', Y: 'pluperfect' };
const VOICE = { A: 'active', M: 'middle', P: 'passive' };
const MOOD = { I: 'indicative', S: 'subjunctive', O: 'optative', M: 'imperative', N: 'infinitive', P: 'participle' };
const PERSON = { 1: '1st person', 2: '2nd person', 3: '3rd person' };

/** `code` looks like "N-NSM", "V-PAI-3S", "CONJ", or "T-NSM". Returns a
 *  gloss string, or null if the part of speech isn't recognized at all
 *  (caller should just show the raw code in that case). */
export function decodeRobinsonMorph(code) {
  if (!code) return null;
  const parts = code.split('-');
  const pos = parts[0];
  const posLabel = PART_OF_SPEECH[pos];
  if (!posLabel) return null;

  const segments = [posLabel];

  if (pos === 'V' && parts[1]) {
    const tvm = parts[1];
    const tvmLabels = [TENSE[tvm[0]], VOICE[tvm[1]], MOOD[tvm[2]]].filter(Boolean);
    if (tvmLabels.length) segments.push(tvmLabels.join(' '));
    if (parts[2]) {
      const pn = parts[2]; // e.g. "3S"
      const pnLabels = [PERSON[pn[0]], NUMBER[pn[1]]].filter(Boolean);
      if (pnLabels.length) segments.push(pnLabels.join(' '));
    }
  } else if (parts[1]) {
    // Noun/adjective/article/pronoun: case+number+gender packed together, e.g. "NSM"
    const cng = parts[1];
    const cngLabels = [CASE[cng[0]], NUMBER[cng[1]], GENDER[cng[2]]].filter(Boolean);
    if (cngLabels.length) segments.push(cngLabels.join(' '));
  }

  return segments.join(', ');
}