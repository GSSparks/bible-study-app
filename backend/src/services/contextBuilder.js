import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { swordService } from './swordService.js';

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

/**
 * Assemble context from whatever's actually open right now, rather than
 * requiring the person to manually specify a passage/module. `sources` is
 * the flattened list of open Bible/commentary window tabs — each one
 * `{ module, reference, kind, title }` — gathered client-side from the
 * window/tab state. `noteIds` lets the person explicitly pull in
 * freestanding notes that wouldn't otherwise match by reference.
 */
export async function buildPassageContext({ sources = [], noteIds = [] }) {
  const passages = []; // [{ kind, module, title, reference, text }]

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
      // A commentary module not keyed for this exact reference, or a
      // stale tab — skip it rather than fail the whole request.
    }
  }

  const references = [...new Set(sources.map((s) => s.reference).filter(Boolean))];

  const [referenceNotes, attachedNotes] = await Promise.all([
    references.length ? prisma.note.findMany({ where: { reference: { in: references } } }) : [],
    noteIds.length ? prisma.note.findMany({ where: { id: { in: noteIds } } }) : [],
  ]);

  // A note could match both (anchored to an open reference AND
  // explicitly attached) — dedupe by id.
  const noteMap = new Map();
  for (const n of [...referenceNotes, ...attachedNotes]) noteMap.set(n.id, n);

  return {
    passages,
    notes: [...noteMap.values()].map((n) => ({
      id: n.id,
      title: n.title,
      reference: n.reference,
      body: n.body,
      tags: n.tags,
    })),
  };
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
  if (context.notes.length) {
    lines.push('=== My study notes ===');
    for (const n of context.notes) {
      const label = [n.title, n.reference].filter(Boolean).join(' — ');
      lines.push(label ? `[${label}]` : '-', n.body, '');
    }
  }
  return lines.join('\n');
}

/**
 * Send an assembled context + a user question to Claude. Kept provider-
 * agnostic in shape (input: context + messages, output: { reply }) so
 * you can swap the anthropic client for another provider later without
 * touching the routes.
 */
export async function askStudyAssistant({ context, messages }) {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  }

  const system = [
    'You are a Bible study assistant. You are given the text of whatever',
    'passages and commentary the person currently has open (possibly',
    'several translations, possibly more than one passage), plus their own',
    "study notes. Ground your answers in what's provided; be clear about",
    'which parts are your own analysis versus the source text. Do not',
    'invent cross-references or quotations. Format your replies in',
    'Markdown (headings, bold, lists) where it aids readability.',
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
