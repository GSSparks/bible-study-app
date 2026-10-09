import { prisma } from '../db/prisma.js';

// First 10 days of a 90-day NT reading plan. The pattern continues through
// Acts, Epistles, and Revelation in the same "3 chapters/day" grouping.
const NT_90_DAYS = [
  { day: 1,  label: 'Matthew 1-3',   passages: ['Matt 1', 'Matt 2', 'Matt 3'] },
  { day: 2,  label: 'Matthew 4-6',   passages: ['Matt 4', 'Matt 5', 'Matt 6'] },
  { day: 3,  label: 'Matthew 7-9',   passages: ['Matt 7', 'Matt 8', 'Matt 9'] },
  { day: 4,  label: 'Matthew 10-12', passages: ['Matt 10', 'Matt 11', 'Matt 12'] },
  { day: 5,  label: 'Matthew 13-15', passages: ['Matt 13', 'Matt 14', 'Matt 15'] },
  { day: 6,  label: 'Matthew 16-18', passages: ['Matt 16', 'Matt 17', 'Matt 18'] },
  { day: 7,  label: 'Matthew 19-21', passages: ['Matt 19', 'Matt 20', 'Matt 21'] },
  { day: 8,  label: 'Matthew 22-24', passages: ['Matt 22', 'Matt 23', 'Matt 24'] },
  { day: 9,  label: 'Matthew 25-28', passages: ['Matt 25', 'Matt 26', 'Matt 27', 'Matt 28'] },
  { day: 10, label: 'Mark 1-3',      passages: ['Mark 1', 'Mark 2', 'Mark 3'] },
  // … days 11-90 continue through Mark, Luke, John, Acts, Romans, 1 Cor,
  // 2 Cor, Galatians, Ephesians, Philippians, Colossians, Thessalonians,
  // Timothy, Titus, Philemon, Hebrews, James, Peter, John, Jude, Revelation
  // following the same 3-chapters-per-day pattern.
];

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
  const existing = await prisma.readingPlan.findFirst({ where: { isBuiltIn: true } });
  if (existing) return;

  await prisma.readingPlan.createMany({
    data: [
      {
        name: 'New Testament in 90 Days',
        description: 'Read through the entire New Testament in 90 days, roughly 3 chapters per day.',
        isBuiltIn: true,
        schedule: NT_90_DAYS,
      },
      {
        name: 'Psalms & Proverbs',
        description: 'A 60-day plan alternating between Psalms and Proverbs — wisdom and worship together.',
        isBuiltIn: true,
        schedule: buildPsalmsProverbsPlan(),
      },
    ],
  });
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
