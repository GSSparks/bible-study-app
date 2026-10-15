import { prisma } from '../db/prisma.js';

const NT_BOOKS = [
  { abbr: 'Matt',    chapters: 28 },
  { abbr: 'Mark',    chapters: 16 },
  { abbr: 'Luke',    chapters: 24 },
  { abbr: 'John',    chapters: 21 },
  { abbr: 'Acts',    chapters: 28 },
  { abbr: 'Rom',     chapters: 16 },
  { abbr: '1Cor',    chapters: 16 },
  { abbr: '2Cor',    chapters: 13 },
  { abbr: 'Gal',     chapters:  6 },
  { abbr: 'Eph',     chapters:  6 },
  { abbr: 'Phil',    chapters:  4 },
  { abbr: 'Col',     chapters:  4 },
  { abbr: '1Thess',  chapters:  5 },
  { abbr: '2Thess',  chapters:  3 },
  { abbr: '1Tim',    chapters:  6 },
  { abbr: '2Tim',    chapters:  4 },
  { abbr: 'Titus',   chapters:  3 },
  { abbr: 'Phlm',    chapters:  1 },
  { abbr: 'Heb',     chapters: 13 },
  { abbr: 'Jas',     chapters:  5 },
  { abbr: '1Pet',    chapters:  5 },
  { abbr: '2Pet',    chapters:  3 },
  { abbr: '1John',   chapters:  5 },
  { abbr: '2John',   chapters:  1 },
  { abbr: '3John',   chapters:  1 },
  { abbr: 'Jude',    chapters:  1 },
  { abbr: 'Rev',     chapters: 22 },
];

const FULL_NAMES = {
  Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts',
  Rom: 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
  Gal: 'Galatians', Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians',
  '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians',
  '1Tim': '1 Timothy', '2Tim': '2 Timothy', Titus: 'Titus', Phlm: 'Philemon',
  Heb: 'Hebrews', Jas: 'James', '1Pet': '1 Peter', '2Pet': '2 Peter',
  '1John': '1 John', '2John': '2 John', '3John': '3 John', Jude: 'Jude', Rev: 'Revelation',
};

function buildNT90DayPlan() {
  // Flatten all chapters into a list of { abbr, chapter } entries
  const allChapters = [];
  for (const { abbr, chapters } of NT_BOOKS) {
    for (let ch = 1; ch <= chapters; ch++) {
      allChapters.push({ abbr, chapter: ch });
    }
  }

  const CHAPTERS_PER_DAY = 3;
  const days = [];
  let dayNum = 1;

  for (let i = 0; i < allChapters.length; i += CHAPTERS_PER_DAY) {
    const slice = allChapters.slice(i, i + CHAPTERS_PER_DAY);
    const passages = slice.map(({ abbr, chapter }) => `${abbr} ${chapter}`);

    // Build label: group consecutive chapters from the same book
    const segments = [];
    let segStart = 0;
    while (segStart < slice.length) {
      const bookAbbr = slice[segStart].abbr;
      let segEnd = segStart;
      while (segEnd + 1 < slice.length && slice[segEnd + 1].abbr === bookAbbr) segEnd++;
      const full = FULL_NAMES[bookAbbr] || bookAbbr;
      const startCh = slice[segStart].chapter;
      const endCh = slice[segEnd].chapter;
      segments.push(startCh === endCh ? `${full} ${startCh}` : `${full} ${startCh}–${endCh}`);
      segStart = segEnd + 1;
    }

    days.push({ day: dayNum++, label: segments.join(' · '), passages });
  }

  return days;
}

// 60 days alternating one psalm and one Proverb chapter per day.
function buildPsalmsProverbsPlan() {
  const days = [];
  for (let i = 0; i < 60; i++) {
    const day = i + 1;
    const psalmNum = (i % 150) + 1;
    const provNum = (i % 31) + 1;
    days.push({
      day,
      label: `Psalm ${psalmNum} · Proverbs ${provNum}`,
      passages: [`Ps ${psalmNum}`, `Prov ${provNum}`],
    });
  }
  return days;
}

export async function ensureBuiltInPlans() {
  const existing = await prisma.readingPlan.findMany({ where: { isBuiltIn: true } });

  if (existing.length === 0) {
    await prisma.readingPlan.createMany({
      data: [
        {
          name: 'New Testament in 90 Days',
          description: 'Read through the entire New Testament in 90 days, roughly 3 chapters per day.',
          isBuiltIn: true,
          schedule: buildNT90DayPlan(),
        },
        {
          name: 'Psalms & Proverbs',
          description: 'A 60-day plan alternating between Psalms and Proverbs — wisdom and worship together.',
          isBuiltIn: true,
          schedule: buildPsalmsProverbsPlan(),
        },
      ],
    });
    return;
  }

  // Patch any NT plan that was seeded with the truncated 10-day schedule
  const ntPlan = existing.find((p) => p.name === 'New Testament in 90 Days');
  if (ntPlan) {
    const currentDays = Array.isArray(ntPlan.schedule) ? ntPlan.schedule.length : 0;
    if (currentDays < 50) {
      await prisma.readingPlan.update({
        where: { id: ntPlan.id },
        data: { schedule: buildNT90DayPlan() },
      });
    }
  }

  // Create the Psalms & Proverbs plan if it somehow got skipped
  const psPlan = existing.find((p) => p.name === 'Psalms & Proverbs');
  if (!psPlan) {
    await prisma.readingPlan.create({
      data: {
        name: 'Psalms & Proverbs',
        description: 'A 60-day plan alternating between Psalms and Proverbs — wisdom and worship together.',
        isBuiltIn: true,
        schedule: buildPsalmsProverbsPlan(),
      },
    });
  }
}

export async function listPlans() {
  const plans = await prisma.readingPlan.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isBuiltIn: true,
      createdAt: true,
      schedule: true,
    },
    orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
  });
  return plans.map((p) => ({
    ...p,
    dayCount: Array.isArray(p.schedule) ? p.schedule.length : 0,
    schedule: undefined,
  }));
}

export async function getPlan(id) {
  return prisma.readingPlan.findUniqueOrThrow({ where: { id } });
}

export async function createPlan({ name, description, schedule }) {
  return prisma.readingPlan.create({
    data: { name, description: description || null, isBuiltIn: false, schedule },
  });
}

export async function updatePlan(id, { name, description, schedule }) {
  const plan = await prisma.readingPlan.findUniqueOrThrow({ where: { id } });
  if (plan.isBuiltIn) throw Object.assign(new Error('Cannot edit a built-in plan'), { status: 403 });
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (schedule !== undefined) data.schedule = schedule;
  return prisma.readingPlan.update({ where: { id }, data });
}

export async function deletePlan(id) {
  const plan = await prisma.readingPlan.findUniqueOrThrow({ where: { id } });
  if (plan.isBuiltIn) throw Object.assign(new Error('Cannot delete a built-in plan'), { status: 403 });
  await prisma.readingPlanProgress.deleteMany({ where: { planId: id } });
  await prisma.readingPlan.delete({ where: { id } });
}

export async function getUserProgress(userId, planId) {
  const rows = await prisma.readingPlanProgress.findMany({
    where: { userId, planId },
    select: { dayNumber: true, completedAt: true },
  });
  return rows.map((r) => r.dayNumber);
}

export async function markDayComplete(userId, planId, dayNumber) {
  await prisma.readingPlanProgress.upsert({
    where: { userId_planId_dayNumber: { userId, planId, dayNumber } },
    create: { userId, planId, dayNumber },
    update: { completedAt: new Date() },
  });
}

export async function markDayIncomplete(userId, planId, dayNumber) {
  await prisma.readingPlanProgress.deleteMany({
    where: { userId, planId, dayNumber },
  });
}

export async function resetUserProgress(userId, planId) {
  await prisma.readingPlanProgress.deleteMany({ where: { userId, planId } });
}
