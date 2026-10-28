import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { findReferencesInText } from './referenceParser.js';

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

// Wrap detected Bible references (e.g. "John 3:16") with .verse-ref spans so
// the frontend click handler can show verse previews. Strips HTML tags before
// BCV parsing (same fix as swordService.wrapVerseReferences) so that HTML tag
// text like "</span>" doesn't break book-context propagation for bare refs.
function wrapVerseRefs(html) {
  if (!html) return html;
  const posMap = [];
  let cleanText = '';
  let i = 0;
  while (i < html.length) {
    if (html[i] === '<') {
      const tagEnd = html.indexOf('>', i);
      i = tagEnd === -1 ? html.length : tagEnd + 1;
    } else {
      posMap.push(i);
      cleanText += html[i];
      i++;
    }
  }

  const rawRefs = findReferencesInText(cleanText);
  if (rawRefs.length === 0) return html;

  const refs = [];
  let prevEnd = 0;
  for (const r of rawRefs) {
    if (r.end - 1 >= posMap.length) continue;
    const htmlStart = posMap[r.start];
    const htmlEnd = posMap[r.end - 1] + 1;
    if (htmlStart < prevEnd) continue;
    refs.push({ osis: r.osis, start: htmlStart, end: htmlEnd });
    prevEnd = htmlEnd;
  }

  if (refs.length === 0) return html;
  let out = '';
  let cursor = 0;
  for (const r of refs) {
    out += html.slice(cursor, r.start);
    out += `<span class="verse-ref" data-ref="${r.osis}">${html.slice(r.start, r.end)}</span>`;
    cursor = r.end;
  }
  return out + html.slice(cursor);
}

// Convert [Topic](factbook:Topic) links (produced by the AI's related-topics
// section) into clickable spans the frontend can intercept.
function wrapTopicRefs(html) {
  return html.replace(
    /<a href="factbook:([^"]+)"[^>]*>([^<]+)<\/a>/g,
    (_, query, label) =>
      `<span class="codex-topic-ref" data-query="${query}">${label}</span>`
  );
}

// Convert [Label](factbook:Query) links BEFORE marked can mangle the
// non-standard protocol — marked strips or corrupts custom-protocol hrefs in
// newer versions, so converting them to spans first is more reliable.
function preprocessTopicRefs(md) {
  return md.replace(
    /\[([^\]]+)\]\(factbook:([^)]+)\)/g,
    (_, label, query) =>
      `<span class="codex-topic-ref" data-query="${query.trim()}">${label}</span>`,
  );
}

function toHtml(md) {
  const raw = marked.parse(preprocessTopicRefs(md || ''));
  return wrapTopicRefs(wrapVerseRefs(raw));
}

export async function getCachedSummary(normalizedQuery) {
  const row = await prisma.factbookCache.findUnique({ where: { query: normalizedQuery } });
  if (!row) return null;
  return { ...row, summaryHtml: toHtml(row.summaryMd) };
}

export async function generateAndCache(title, normalizedQuery, { dictEntries = [], wikipediaExtract = null } = {}) {
  if (!anthropic) throw new Error('AI not configured');

  const contextParts = [];
  if (dictEntries.length > 0) {
    const entriesText = dictEntries
      .map((e) => `### ${e.source} — ${e.key}\n${e.text}`)
      .join('\n\n');
    contextParts.push(`Reference entries from installed modules:\n\n${entriesText}`);
  }
  if (wikipediaExtract) {
    contextParts.push(`Wikipedia overview:\n${wikipediaExtract}`);
  }

  const userMessage = `Topic: "${title}"${contextParts.length > 0 ? '\n\n' + contextParts.join('\n\n') : ''}`;

  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 1200,
    system: `You are a biblical reference librarian creating a concise Codex overview for a self-hosted Bible study app. You will be given reference entries from the user's installed study modules and/or a Wikipedia extract — draw from these sources to ground your summary, then supplement with your own knowledge where they are incomplete. Write a focused, well-structured summary in Markdown for the given topic. Cover:
- Who or what this is (definition, identification)
- Key biblical appearances and significance
- Theological importance or themes
- A "## Related Topics" section listing 4-6 closely related topics as Markdown links using this exact format: [Topic Name](factbook:Topic Name). For example: [Temple](factbook:Temple), [David](factbook:David).

Use ## subheadings for sections. Keep it 3-5 paragraphs total. Cite specific books or passages when relevant (e.g. "John 3:16", "1 Kings 11:4"). Be accurate and accessible. Do not invent scripture references.`,
    messages: [{ role: 'user', content: userMessage }],
  });

  const summaryMd = response.content.find((b) => b.type === 'text')?.text || '';

  const row = await prisma.factbookCache.upsert({
    where: { query: normalizedQuery },
    update: { title, summaryMd, updatedAt: new Date() },
    create: { query: normalizedQuery, title, summaryMd },
  });

  return { ...row, summaryHtml: toHtml(summaryMd) };
}

/**
 * Generates a Codex entry grounded in actual Scripture occurrences — richer
 * and more analytical than the topic-only path above. The AI receives every
 * place the word/phrase appears in the canonical module and writes a
 * usage-driven study: semantic range, contextual patterns, theological weight
 * drawn from the text itself. Always upserts (replaces any prior topic-only
 * entry for the same query).
 */
export async function generateWordStudyEntry(title, normalizedQuery, {
  occurrences = [],
  studyType = 'english',
  strongsKeys = [],
  dictionaryEntry = null,
  truncated = false,
  totalOccurrenceCount = null,
  dictEntries = [],
  wikipediaExtract = null,
} = {}) {
  if (!anthropic) throw new Error('AI not configured');

  const contextParts = [];

  if (dictionaryEntry) {
    const parts = [dictionaryEntry.transcription, dictionaryEntry.phoneticTranscription]
      .filter(Boolean).join(' — ');
    const defText = [parts, dictionaryEntry.definition].filter(Boolean).join('\n');
    if (defText) contextParts.push(`Lexicon entry:\n${defText}`);
  }

  if (dictEntries.length > 0) {
    contextParts.push(`Reference entries from installed modules:\n\n${
      dictEntries.map((e) => `### ${e.source} — ${e.key}\n${e.text}`).join('\n\n')
    }`);
  }
  if (wikipediaExtract) {
    contextParts.push(`Wikipedia overview:\n${wikipediaExtract}`);
  }

  const countNote = truncated
    ? `(showing ${occurrences.length} of ${totalOccurrenceCount ?? 'many'} occurrences — list was capped)`
    : `(${occurrences.length} occurrence${occurrences.length === 1 ? '' : 's'} total)`;

  const occurrenceLines = occurrences
    .map((o) => `${o.book} ${o.chapter}:${o.verse} — ${o.text}`)
    .join('\n');

  contextParts.push(`Scripture occurrences ${countNote}:\n${occurrenceLines}`);

  const userMessage = [
    `Term: "${title}"`,
    studyType === 'original' && strongsKeys.length > 0
      ? `Strong's key(s): ${strongsKeys.join(', ')}`
      : '',
    '',
    contextParts.join('\n\n'),
  ].filter(Boolean).join('\n');

  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 1800,
    system: `You are a biblical word study librarian creating a Codex entry for a self-hosted Bible study app. You have been given every place this word or phrase appears in Scripture (in one translation). Write a usage-driven study in Markdown that:

1. Leads with a precise definition — what this word/phrase means, including original-language nuance if a lexicon entry is provided.
2. Analyzes usage patterns grounded in the provided occurrences: how often it appears, in what literary contexts (narrative, prophecy, epistle, etc.), whether the sense shifts across different books or authors, any notable OT/NT contrast.
3. Draws out the theological weight the evidence actually supports — what the distribution and contexts reveal about what biblical authors meant by this term.
4. If the occurrence list was truncated, acknowledge it honestly.
5. Ends with a "## Related Topics" section listing 4-6 closely related topics as Markdown links in this exact format: [Topic Name](factbook:Topic Name).

Use ## subheadings for sections. Aim for 4-6 paragraphs. Cite specific passages (e.g. "Eph. 5:8", "John 1:9"). Do not invent occurrences or claim the list is exhaustive if it was capped.`,
    messages: [{ role: 'user', content: userMessage }],
  });

  const summaryMd = response.content.find((b) => b.type === 'text')?.text || '';

  const storedOccurrences = occurrences.map((o) => ({
    reference: `${o.book} ${o.chapter}:${o.verse}`,
    osis: o.osis || null,
    snippet: o.text,
  }));

  const row = await prisma.factbookCache.upsert({
    where: { query: normalizedQuery },
    update: { title, summaryMd, occurrences: storedOccurrences, studyType, strongsKeys, updatedAt: new Date() },
    create: { query: normalizedQuery, title, summaryMd, occurrences: storedOccurrences, studyType, strongsKeys },
  });

  return { ...row, summaryHtml: toHtml(summaryMd) };
}

export async function listAllCached() {
  return prisma.factbookCache.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, query: true, title: true, tags: true, studyType: true, createdAt: true, updatedAt: true },
  });
}

export async function deleteById(id) {
  await prisma.factbookCache.delete({ where: { id } });
}

export async function updateEntry(id, { summaryMd, tags } = {}) {
  const data = {};
  if (summaryMd !== undefined) data.summaryMd = summaryMd;
  if (tags !== undefined) data.tags = tags;
  if (Object.keys(data).length === 0) {
    const err = new Error('Nothing to update');
    err.status = 400;
    throw err;
  }
  const row = await prisma.factbookCache.update({ where: { id }, data });
  return { ...row, summaryHtml: toHtml(row.summaryMd) };
}
