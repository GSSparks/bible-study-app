import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { swordService } from './swordService.js';

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

export async function buildPassageContext({ sources = [], noteIds = [], includeAllCommentaries = false, includeWordStudies = false }) {
  const passages = [];

  for (const src of sources) {
    if (!src.module || !src.reference) continue;
    try {
      const verses = swordService.getPassage(src.module, src.reference);
      passages.push({
        kind: src.kind,
        module: src.module,
        title: src.title || src.module,
        reference: src.reference,
        text: swordService.versesToText(verses),
      });
    } catch {
      // skip
    }
  }

  if (includeAllCommentaries) {
    const primaryRef = sources.find((s) => s.kind === 'bible' || !s.kind)?.reference;
    if (primaryRef) {
      const alreadyIncluded = new Set(passages.filter((p) => p.kind === 'commentary').map((p) => p.module));
      const installedCommentaries = await swordService.listInstalledModules('COMMENTARY');
      for (const mod of installedCommentaries) {
        if (alreadyIncluded.has(mod.name)) continue;
        try {
          const verses = swordService.getPassage(mod.name, primaryRef);
          passages.push({
            kind: 'commentary',
            module: mod.name,
            title: mod.description || mod.name,
            reference: primaryRef,
            text: swordService.versesToText(verses),
          });
        } catch {
          // skip
        }
      }
    }
  }

  let wordStudies = [];
  if (includeWordStudies) {
    const bibleSources = sources.filter((s) => s.kind === 'bible' || !s.kind);
    const keySet = new Set();
    for (const src of bibleSources) {
      if (!src.module || !src.reference) continue;
      try {
        const verses = swordService.getPassage(src.module, src.reference);
        for (const v of verses) {
          for (const key of swordService.extractStrongsKeysFrom(v.content)) keySet.add(key);
        }
      } catch {
        // skip
      }
    }
    const keys = [...keySet].slice(0, 40);
    const entries = await Promise.all(
      keys.map(async (key) => {
        try {
          const entry = swordService.getStrongsEntry(key);
          if (!entry) return null;
          return { key, transcription: entry.transcription, definition: entry.definition };
        } catch {
          return null;
        }
      })
    );
    wordStudies = entries.filter(Boolean);
  }

  const references = [...new Set(sources.map((s) => s.reference).filter(Boolean))];

  const [referenceNotes, attachedNotes] = await Promise.all([
    references.length ? prisma.note.findMany({ where: { reference: { in: references } } }) : [],
    noteIds.length ? prisma.note.findMany({ where: { id: { in: noteIds } } }) : [],
  ]);

  const noteMap = new Map();
  for (const n of [...referenceNotes, ...attachedNotes]) noteMap.set(n.id, n);

  return {
    passages,
    wordStudies,
    notes: [...noteMap.values()].map((n) => ({
      id: n.id,
      title: n.title,
      reference: n.reference,
      body: n.body,
      tags: n.tags,
    })),
  };
}

/**
 * Context for a cross-Bible word study on one Strong's key: its
 * dictionary gloss plus every occurrence of that key across the whole
 * Bible in one translation (see swordService.getStrongsOccurrences —
 * the first call for a given module is a real full-Bible scan, cached
 * after that). Capped at 200 occurrences; a handful of very common
 * words genuinely occur more than that, and the point of this feature
 * is spotting real usage patterns, not exhaustively re-quoting every
 * single instance of a common word into the prompt. `truncated`/
 * `totalOccurrenceCount` are carried through so the assistant (and the
 * person reading its reply) knows when that happened, rather than
 * silently presenting a partial list as if it were complete.
 */
export async function buildWordStudyContext({ module, strongsKey }) {
  if (!module || !strongsKey) {
    const err = new Error('module and strongsKey are both required');
    err.status = 400;
    throw err;
  }

  let dictionaryEntry = null;
  try {
    const entry = swordService.getStrongsEntry(strongsKey);
    if (entry) {
      dictionaryEntry = {
        transcription: entry.transcription,
        phoneticTranscription: entry.phoneticTranscription,
        definition: entry.definition,
      };
    }
  } catch {
    // Strong's lookup failing shouldn't block the occurrence list itself
  }

  const allOccurrences = await swordService.getStrongsOccurrences(module, strongsKey);
  const CAP = 200;
  const occurrences = allOccurrences.slice(0, CAP);

  return {
    module,
    strongsKey,
    dictionaryEntry,
    occurrences,
    occurrenceCount: occurrences.length,
    totalOccurrenceCount: allOccurrences.length,
    truncated: allOccurrences.length > CAP,
  };
}

function wordStudyContextToPrompt(context) {
  const lines = [];
  lines.push(`=== Strong's ${context.strongsKey} (${context.module}) ===`);
  if (context.dictionaryEntry) {
    const { transcription, phoneticTranscription, definition } = context.dictionaryEntry;
    const label = [transcription, phoneticTranscription].filter(Boolean).join(' — ');
    if (label) lines.push(label);
    if (definition) lines.push(definition);
  }
  lines.push('');

  const countLabel = context.truncated
    ? `${context.occurrenceCount} of ${context.totalOccurrenceCount} total occurrences, truncated`
    : `${context.occurrenceCount} occurrence${context.occurrenceCount === 1 ? '' : 's'}`;
  lines.push(`=== Occurrences (${countLabel}) ===`);
  for (const occ of context.occurrences) {
    lines.push(`${occ.book} ${occ.chapter}:${occ.verse} — ${occ.text}`);
  }
  return lines.join('\n');
}

/**
 * Word-study-specific ask, separate from askStudyAssistant above — the
 * context shape here (one word's gloss + a flat occurrence list) is
 * different enough from "passages + commentary + notes" that reusing
 * the same system prompt would mean either a generic prompt that fits
 * neither case well, or contextToPrompt branching on shape. A dedicated
 * function stays simpler than either. Deliberately single-shot (no
 * sessionId/conversation continuation) for this first version — a
 * follow-up question in the same chat box goes through the regular
 * send flow instead, which doesn't carry the occurrence list forward
 * into that context. A real limitation, not an oversight: worth
 * revisiting if follow-up questions on a word study turn out to matter
 * in practice.
 */
export async function askWordStudy({ context }) {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  }

  const system = [
    "You are a Bible study assistant doing a word study on a single Strong's-",
    'tagged word. You are given its dictionary gloss and every verse in one',
    "translation where that Strong's number occurs (possibly truncated if",
    'there are many — that will be stated explicitly if so). Synthesize the',
    'semantic range and usage patterns across these occurrences: note where',
    'the sense clearly shifts by context, group occurrences into rough',
    'categories of usage where that helps, and call out anything notable (a',
    'small occurrence count, one dominant sense vs. several distinct ones,',
    'a shift in usage between Old and New Testament if both are present,',
    'etc.). Ground everything in the verses actually provided — do not invent',
    'occurrences, and do not claim the list is complete if it was truncated.',
    'Format your reply in Markdown.',
    '',
    wordStudyContextToPrompt(context),
  ].join('\n');

  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 1500,
    system,
    messages: [
      {
        role: 'user',
        content: `Give a word study for this term, synthesizing patterns across all the occurrences provided.`,
      },
    ],
  });

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return { reply };
}

function contextToPrompt(context) {
  const lines = [];

  const byKind = { bible: [], commentary: [] };
  for (const p of context.passages) (byKind[p.kind] || byKind.bible).push(p);

  if (byKind.bible.length) {
    lines.push('=== Scripture ===');
    for (const p of byKind.bible) lines.push(`--- ${p.title} (${p.reference}) ---`, p.text, '');
  }
  if (byKind.commentary.length) {
    lines.push('=== Commentary ===');
    for (const p of byKind.commentary) lines.push(`--- ${p.title} (${p.reference}) ---`, p.text, '');
  }
  if (context.wordStudies?.length) {
    lines.push('=== Word studies (Strong\'s dictionary) ===');
    for (const w of context.wordStudies) {
      const label = [w.key, w.transcription].filter(Boolean).join(' — ');
      lines.push(`${label}: ${w.definition || ''}`);
    }
    lines.push('');
  }
  if (context.notes.length) {
    lines.push('=== My study notes ===');
    for (const n of context.notes) {
      const label = [n.title, n.reference].filter(Boolean).join(' — ');
      lines.push(label ? `[${label}]` : '-', n.body, '');
    }
  }
  return lines.join('\n');
}

export async function askStudyAssistant({ context, messages }) {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  }

  const system = [
    'You are a Bible study assistant. You are given the text of whatever',
    'passages and commentary the person currently has open (possibly',
    'several translations, possibly more than one passage), possibly some',
    "word studies (Strong's dictionary glosses for words in the passage),",
    "plus their own study notes. Ground your answers in what's provided;",
    'be clear about which parts are your own analysis versus the source',
    'text. Do not invent cross-references or quotations. Format your',
    'replies in Markdown (headings, bold, lists) where it aids readability.',
    '',
    contextToPrompt(context),
  ].join('\n');

  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 1500,
    system,
    messages,
  });

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return { reply };
}