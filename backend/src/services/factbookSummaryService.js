import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

function toHtml(md) {
  return marked.parse(md || '');
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
    max_tokens: 1024,
    system: `You are a biblical reference librarian creating a concise Factbook overview for a self-hosted Bible study app. Write a focused, well-structured summary in Markdown for the given topic. Cover:
- Who or what this is (definition, identification)
- Key biblical appearances and significance
- Theological importance or themes
- Related topics worth exploring

Use ## subheadings for sections. Keep it 3-5 paragraphs total. Cite specific books or passages when relevant. Be accurate and accessible. Do not invent scripture references.`,
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
