import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { swordService } from './swordService.js';

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

/**
 * A tool the assistant can call mid-response to fetch the actual text
 * of a Bible reference it wants to discuss but wasn't already handed in
 * its context — e.g. a word or phrase study's reply mentioning "this
 * connects to Romans 8:1" based on general knowledge of what that verse
 * says, rather than the same grounded-in-actual-text approach used
 * everywhere else in this app. Every system prompt below already says
 * "ground everything in the verses actually provided, don't invent" —
 * this tool is what makes that instruction actually enforceable for
 * verses *outside* the provided occurrence list too, instead of only
 * covering the ones already spoon-fed in.
 */
const GET_PASSAGE_TOOL = {
  name: 'get_passage',
  description:
    'Fetch the actual text of a Bible reference (e.g. "Romans 8:1" or "1 John 4:8-10") to ground a discussion of it in the real text, rather than relying on general knowledge of what it says. Use this whenever you want to reference, quote, or discuss a specific verse that was not already included in the context provided to you.',
  input_schema: {
    type: 'object',
    properties: {
      reference: {
        type: 'string',
        description: 'A Bible reference like "Romans 8:1" or "1 John 4:8-10"',
      },
    },
    required: ['reference'],
  },
};

/**
 * Runs a message exchange with GET_PASSAGE_TOOL available, looping to
 * execute tool calls and feed results back until the model gives a
 * final text-only reply. A single turn can and does request several
 * lookups at once (confirmed: a reply mentioning two other passages
 * requests both in the same tool_use turn, not two separate round
 * trips) — this loop handles any number of tool calls per turn and any
 * number of turns.
 *
 * MAX_ITERATIONS is a safety cap, not the expected path — verified
 * against a mock model that never stops requesting tools, and the loop
 * terminates cleanly with an honest "couldn't finish" message rather
 * than hanging or crashing. Should essentially never trigger in
 * practice; a well-behaved model settles in 1-2 rounds.
 */
async function runWithPassageTool({ module, system, initialMessages }) {
  let messages = [...initialMessages];
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: config.anthropicModel,
      max_tokens: 4096,
      system,
      messages,
      tools: [GET_PASSAGE_TOOL],
    });

    if (response.stop_reason !== 'tool_use') {
      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
    }

    messages.push({ role: 'assistant', content: response.content });
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      let resultText;
      try {
        const verses = swordService.getPassage(module, block.input.reference);
        resultText =
          verses.length > 0
            ? swordService.versesToText(verses)
            : `No text found for "${block.input.reference}" in ${module}.`;
      } catch (err) {
        resultText = `Could not resolve "${block.input.reference}": ${err.message}`;
      }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return "I wasn't able to finish gathering all the referenced passages — here's what I found so far, though the discussion may be incomplete.";
}

export async function buildPassageContext({ sources = [], noteIds = [], userId, includeAllCommentaries = false, includeWordStudies = false }) {
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

  // Both queries scoped by userId now that notes are per-user —
  // without this, a logged-in user's assistant context could silently
  // pull in another user's notes just because they happened to be
  // anchored to the same reference. context.js's /build route always
  // passes the logged-in user's id through (the whole router requires
  // login), so userId is never actually undefined here in practice —
  // but the queries are written to produce an empty result rather than
  // an unfiltered one if it somehow were, rather than accidentally
  // falling back to "all users' notes".
  const [referenceNotes, attachedNotes] = await Promise.all([
    references.length && userId ? prisma.note.findMany({ where: { reference: { in: references }, userId } }) : [],
    noteIds.length && userId ? prisma.note.findMany({ where: { id: { in: noteIds }, userId } }) : [],
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
    'If discussing a connection to a related verse outside this occurrence',
    'list would strengthen the study, use the get_passage tool to fetch its',
    'actual text rather than relying on general knowledge of what it says —',
    'the same grounding standard applies to any verse you bring in, not just',
    'the ones already provided. Format your reply in Markdown.',
    '',
    wordStudyContextToPrompt(context),
  ].join('\n');

  const reply = await runWithPassageTool({
    module: context.module,
    system,
    initialMessages: [
      {
        role: 'user',
        content: `Give a word study for this term, synthesizing patterns across all the occurrences provided.`,
      },
    ],
  });

  return { reply };
}

/**
 * Context for a phrase study — either exact-wording match (a plain
 * substring search against one translation's actual text) or
 * original-words match (a sequence of the same underlying Strong's-
 * tagged words, catching different English renderings of the same
 * phrase). Pass `phrase` for the former, `strongsSequence` (an array of
 * Strong's keys, one per selected word, in reading order) for the
 * latter — `displayText` is always the original selected English text,
 * kept for the prompt/title even in strongsSequence mode where the
 * actual search key isn't a string. Same 200-occurrence cap and
 * truncation signaling as word studies, for the same reason: spotting
 * real usage patterns doesn't need every single instance of a common
 * phrase re-quoted into the prompt.
 */
export async function buildPhraseStudyContext({ module, phrase, strongsSequence, displayText }) {
  const hasSequence = Array.isArray(strongsSequence) && strongsSequence.length > 0;
  if (!module || (!phrase?.trim() && !hasSequence)) {
    const err = new Error('module and either phrase or strongsSequence are required');
    err.status = 400;
    throw err;
  }

  const matchType = hasSequence ? 'strongsSequence' : 'text';
  const allOccurrences = hasSequence
    ? await swordService.findStrongsSequenceOccurrences(module, strongsSequence)
    : await swordService.findPhraseOccurrences(module, phrase);

  const CAP = 200;
  const occurrences = allOccurrences.slice(0, CAP);

  return {
    module,
    phrase: displayText || phrase,
    matchType,
    occurrences,
    occurrenceCount: occurrences.length,
    totalOccurrenceCount: allOccurrences.length,
    truncated: allOccurrences.length > CAP,
  };
}

function phraseStudyContextToPrompt(context) {
  const lines = [];
  const matchDescription =
    context.matchType === 'strongsSequence'
      ? 'matched by the same underlying original-language words in this same order, regardless of how this translation renders them in English'
      : 'matched by exact wording in this translation only';
  lines.push(`=== Phrase: "${context.phrase}" (${context.module}) — ${matchDescription} ===`);
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
 * Phrase-study-specific ask, mirroring askWordStudy's shape and
 * reasoning — a dedicated system prompt rather than branching the
 * general one, single-shot (no session continuation) for the same
 * reason. The one addition here: the system prompt has to be explicit
 * about which matching mode was used, since "exact wording" and
 * "original words regardless of translation" carry very different
 * epistemic weight, and the reply should reflect that distinction
 * rather than treating every occurrence list the same way.
 */
export async function askPhraseStudy({ context }) {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  }

  const matchExplanation =
    context.matchType === 'strongsSequence'
      ? "This list was built by matching the same sequence of original-language (Greek/Hebrew) Strong's-tagged words, not exact English wording — so it may include verses phrased differently in this translation than the phrase as given, as long as the underlying words and order match."
      : 'This list was built by exact substring matching in this one translation only — it will not include verses where the same underlying phrase is translated with different English wording, and will not include occurrences in other translations.';

  const system = [
    'You are a Bible study assistant doing a phrase study — the person has',
    "selected a recurring phrase from the biblical text (not a single word)",
    'and wants to see how it is used across every occurrence found in one',
    'translation (possibly truncated if there are many).',
    matchExplanation,
    'Synthesize patterns in how the phrase is used: does it carry a',
    'consistent sense, or shift by context? Note any structural or',
    'rhetorical patterns (a recurring formula, a title, an idiom). Ground',
    'everything in the verses actually provided — do not invent',
    'occurrences, and do not claim completeness if the list was truncated.',
    'Be upfront about the matching method above if it materially affects',
    'how complete or precise this picture is. If discussing a connection',
    'to a related verse outside this occurrence list would strengthen the',
    'study, use the get_passage tool to fetch its actual text rather than',
    'relying on general knowledge of what it says. Format your reply in',
    'Markdown.',
    '',
    phraseStudyContextToPrompt(context),
  ].join('\n');

  const reply = await runWithPassageTool({
    module: context.module,
    system,
    initialMessages: [
      {
        role: 'user',
        content: 'Give a phrase study for this phrase, synthesizing patterns across all the occurrences provided.',
      },
    ],
  });

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
    'text. Do not invent cross-references or quotations — if bringing in a',
    'verse outside what was provided would strengthen the answer, use the',
    'get_passage tool to fetch its actual text first. Format your',
    'replies in Markdown (headings, bold, lists) where it aids readability.',
    '',
    contextToPrompt(context),
  ].join('\n');

  // No single "the module" here the way word/phrase studies have one —
  // context.passages can span several open translations/commentaries at
  // once. The primary Bible passage's module is the most reasonable
  // default for tool-requested lookups; if there isn't one, the tool
  // call will fail gracefully (caught inside runWithPassageTool) rather
  // than crash the whole reply.
  const primaryModule = context.passages.find((p) => p.kind === 'bible')?.module || context.passages[0]?.module;

  const reply = await runWithPassageTool({
    module: primaryModule,
    system,
    initialMessages: messages,
  });

  return { reply };
}