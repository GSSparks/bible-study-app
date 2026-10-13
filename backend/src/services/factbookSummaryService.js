import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { findReferencesInText } from './referenceParser.js';

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

// Wrap detected Bible references (e.g. "John 3:16") with .verse-ref spans so
// the frontend click handler can show verse previews — same technique used by
// swordService.wrapVerseReferences, reproduced here to avoid a circular import.
function wrapVerseRefs(html) {
  const tagSpans = [];
  const tagRe = /<[^>]*>/g;
  let m;
  while ((m = tagRe.exec(html))) tagSpans.push([m.index, m.index + m[0].length]);
  const inside = (pos) => tagSpans.some(([s, e]) => pos >= s && pos < e);

  const refs = findReferencesInText(html).filter((r) => !inside(r.start) && !inside(r.end - 1));
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

export async function generateAndCache(title, normalizedQuery, { dictKeys = [], wikipediaExtract = null } = {}) {
  if (!anthropic) throw new Error('AI not configured');

  const contextParts = [];
  if (dictKeys.length > 0) {
    contextParts.push(`Available reference entries: ${dictKeys.join(', ')}`);
  }
  if (wikipediaExtract) {
    contextParts.push(`Wikipedia overview:\n${wikipediaExtract}`);
  }

  const userMessage = `Topic: "${title}"${contextParts.length > 0 ? '\n\n' + contextParts.join('\n\n') : ''}`;

  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 1200,
    system: `You are a biblical reference librarian creating a concise Codex overview for a self-hosted Bible study app. Write a focused, well-structured summary in Markdown for the given topic. Cover:
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

export async function listAllCached() {
  return prisma.factbookCache.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function deleteById(id) {
  await prisma.factbookCache.delete({ where: { id } });
}
