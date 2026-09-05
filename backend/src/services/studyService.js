import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { getScriptorium } from './scriptoriumService.js';
import { swordService } from './swordService.js';

// Same pattern as contextBuilder.js — instantiated once at module
// load, null (not thrown) when no key is configured, so every
// LLM-calling function below checks for it explicitly rather than
// this module failing to import at all in an environment without one.
const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

function validateTitle(title) {
  if (!title || !title.trim()) {
    const err = new Error('A title is required.');
    err.status = 400;
    throw err;
  }
  if (title.length > MAX_TITLE_LENGTH) {
    const err = new Error(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
}

/** Group studies (scriptoriumId set) inherit their Scriptorium's own
 *  visibility/membership rules entirely — reuses getScriptorium rather
 *  than re-implementing the private/public + membership check a
 *  second time. Solo studies (scriptoriumId null) are private to their
 *  creator only — the simple default, no sharing model for these yet. */
async function assertCanViewStudy(study, viewerId) {
  if (study.scriptoriumId) {
    await getScriptorium(study.scriptoriumId, viewerId); // throws 404 if not visible
  } else if (study.creatorId !== viewerId) {
    const err = new Error('Study not found.');
    err.status = 404;
    throw err;
  }
}

/** Same 404-masking pattern as everywhere else — a non-owner shouldn't
 *  learn a study exists (or what it's called) via an error message
 *  that distinguishes "not found" from "found but not yours". */
async function assertOwnerOfStudy(studyId, userId) {
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study || study.creatorId !== userId) {
    const err = new Error('Study not found.');
    err.status = 404;
    throw err;
  }
  return study;
}

/** Owner is automatically a participant, same pattern as Scriptorium's
 *  owner-is-automatically-a-member — created in one transaction so the
 *  two can't end up inconsistent with each other. Any member of the
 *  linked Scriptorium can create a study within it (not owner-only) —
 *  matches the same "any member can contribute" pattern already
 *  established for Scriptorium invites and wall posts. */
export async function createStudy({ creatorId, title, description, scriptoriumId }) {
  validateTitle(title);
  if (scriptoriumId) {
    const scriptorium = await getScriptorium(scriptoriumId, creatorId); // throws 404 if not visible
    if (!scriptorium.isMember) {
      const err = new Error('Join this Scriptorium to create a study in it.');
      err.status = 403;
      throw err;
    }
  }
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.create({
      data: { title: title.trim(), description: description?.trim() || null, scriptoriumId: scriptoriumId || null, creatorId },
    });
    await tx.studyParticipant.create({ data: { studyId: study.id, userId: creatorId, role: 'owner' } });
    return study;
  });
}

export async function getStudy(studyId, viewerId) {
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study) {
    const err = new Error('Study not found.');
    err.status = 404;
    throw err;
  }
  await assertCanViewStudy(study, viewerId);
  const participant = await prisma.studyParticipant.findUnique({
    where: { studyId_userId: { studyId, userId: viewerId || '' } },
  });
  return { ...study, isParticipant: Boolean(participant), myRole: participant?.role || null };
}

export async function listMyStudies(userId) {
  const participations = await prisma.studyParticipant.findMany({
    where: { userId },
    include: { study: true },
    orderBy: { joinedAt: 'desc' },
  });
  return participations.map((p) => ({ ...p.study, myRole: p.role }));
}

export async function listScriptoriumStudies(scriptoriumId, viewerId) {
  await getScriptorium(scriptoriumId, viewerId); // visibility check
  return prisma.study.findMany({ where: { scriptoriumId }, orderBy: { createdAt: 'desc' } });
}

/** Only group studies can be joined this way — a solo study has no
 *  concept of joining. Also masks a solo study's id the same way a
 *  private one would, rather than a distinct error revealing "this id
 *  is real but not joinable", which would leak more than intended. */
export async function joinStudy(studyId, userId) {
  const study = await prisma.study.findUnique({ where: { id: studyId } });
  if (!study || !study.scriptoriumId) {
    const err = new Error('Study not found.');
    err.status = 404;
    throw err;
  }
  const scriptorium = await getScriptorium(study.scriptoriumId, userId); // throws 404 if not visible
  if (!scriptorium.isMember) {
    const err = new Error('Join the Scriptorium first.');
    err.status = 403;
    throw err;
  }
  const existing = await prisma.studyParticipant.findUnique({ where: { studyId_userId: { studyId, userId } } });
  if (existing) {
    const err = new Error('Already a participant.');
    err.status = 409;
    throw err;
  }
  return prisma.studyParticipant.create({ data: { studyId, userId, role: 'participant' } });
}

/** Owner can't leave via this — deleteStudy is the equivalent action
 *  for them, same reasoning and same limitation as Scriptoriums: no
 *  ownership-transfer flow exists yet. */
/** Mirrors Scriptorium's listMembers exactly — visibility-only (same
 *  as browsing anything else about a study), not participation-gated,
 *  since seeing who's doing a study together is reference information
 *  like anything else you can browse. */
export async function listParticipants(studyId, viewerId) {
  await getStudy(studyId, viewerId); // visibility check, throws 404 if not visible
  const participants = await prisma.studyParticipant.findMany({
    where: { studyId },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  return participants
    .map((p) => ({ participantId: p.id, id: p.user?.id, username: p.user?.username, role: p.role, joinedAt: p.joinedAt }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1));
}

export async function leaveStudy(studyId, userId) {
  const participant = await prisma.studyParticipant.findUnique({ where: { studyId_userId: { studyId, userId } } });
  if (!participant) {
    const err = new Error('Not a participant.');
    err.status = 404;
    throw err;
  }
  if (participant.role === 'owner') {
    const err = new Error("The owner can't leave — delete the study instead.");
    err.status = 400;
    throw err;
  }
  await prisma.studyParticipant.delete({ where: { id: participant.id } });
}

export async function deleteStudy(studyId, userId) {
  await assertOwnerOfStudy(studyId, userId);
  await prisma.study.delete({ where: { id: studyId } }); // cascades lessons/participants/completions
}

export async function updateStudy(studyId, userId, { title, description }) {
  await assertOwnerOfStudy(studyId, userId);
  validateTitle(title);
  return prisma.study.update({
    where: { id: studyId },
    data: { title: title.trim(), description: description?.trim() || null },
  });
}

/** Lesson content (the leader's shared write-up) is owner-authored
 *  only — "leader" in the product sense maps directly to "owner" here,
 *  same as every other owner-gated action in this app. */
export async function createLesson(studyId, callerId, { order, title, module, reference, body }) {
  await assertOwnerOfStudy(studyId, callerId);
  validateTitle(title);
  return prisma.studyLesson.create({
    data: {
      studyId,
      order: order ?? 0,
      title: title.trim(),
      module: module || null,
      reference: reference || null,
      body: body?.trim() || null,
    },
  });
}

const MAX_BULK_LESSONS = 52; // a sanity cap (a year's worth of weeks), not a real business rule

/** Accepts a whole batch of lessons (e.g. a reviewed-and-edited draft
 *  from AI generation, or just a leader planning a whole study up
 *  front) in one call. Runs as a single transaction — if one lesson
 *  in the batch fails validation, the entire batch rolls back rather
 *  than leaving a partially-created study, matching the "accept the
 *  whole draft" UX this exists for. */
export async function bulkCreateLessons(studyId, callerId, lessons) {
  await assertOwnerOfStudy(studyId, callerId);
  if (!Array.isArray(lessons) || lessons.length === 0) {
    const err = new Error('lessons[] is required and must not be empty.');
    err.status = 400;
    throw err;
  }
  if (lessons.length > MAX_BULK_LESSONS) {
    const err = new Error(`Too many lessons in one request (max ${MAX_BULK_LESSONS}).`);
    err.status = 400;
    throw err;
  }
  for (const l of lessons) {
    validateTitle(l.title);
  }
  return prisma.$transaction(async (tx) => {
    const created = [];
    for (const l of lessons) {
      const lesson = await tx.studyLesson.create({
        data: {
          studyId,
          order: l.order ?? 0,
          title: l.title.trim(),
          module: l.module || null,
          reference: l.reference || null,
          body: l.body?.trim() || null,
        },
      });
      created.push(lesson);
    }
    return created;
  });
}

export async function updateLesson(lessonId, callerId, { order, title, module, reference, body }) {
  const lesson = await prisma.studyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.status = 404;
    throw err;
  }
  await assertOwnerOfStudy(lesson.studyId, callerId);
  validateTitle(title);
  return prisma.studyLesson.update({
    where: { id: lessonId },
    data: {
      order: order ?? lesson.order,
      title: title.trim(),
      module: module || null,
      reference: reference || null,
      body: body?.trim() || null,
    },
  });
}

export async function deleteLesson(lessonId, callerId) {
  const lesson = await prisma.studyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.status = 404;
    throw err;
  }
  await assertOwnerOfStudy(lesson.studyId, callerId);
  await prisma.studyLesson.delete({ where: { id: lessonId } }); // cascades completions
}

export async function listLessons(studyId, viewerId) {
  await getStudy(studyId, viewerId); // visibility check, throws 404 if not visible
  return prisma.studyLesson.findMany({ where: { studyId }, orderBy: { order: 'asc' } });
}

export async function getLesson(lessonId, viewerId) {
  const lesson = await prisma.studyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.status = 404;
    throw err;
  }
  await getStudy(lesson.studyId, viewerId); // visibility check
  return lesson;
}

/** Requires being a participant — you can't track progress on a study
 *  you haven't joined. Upsert rather than create, so marking an
 *  already-complete lesson complete again is a harmless no-op instead
 *  of a unique-constraint error. */
export async function markLessonComplete(lessonId, userId) {
  const lesson = await prisma.studyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.status = 404;
    throw err;
  }
  const participant = await prisma.studyParticipant.findUnique({
    where: { studyId_userId: { studyId: lesson.studyId, userId } },
  });
  if (!participant) {
    const err = new Error('Join this study to track progress.');
    err.status = 403;
    throw err;
  }
  return prisma.studyLessonCompletion.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    create: { lessonId, userId },
    update: {},
  });
}

export async function unmarkLessonComplete(lessonId, userId) {
  const completion = await prisma.studyLessonCompletion.findUnique({
    where: { lessonId_userId: { lessonId, userId } },
  });
  if (completion) {
    await prisma.studyLessonCompletion.delete({ where: { id: completion.id } });
  }
}

export async function getProgress(studyId, userId) {
  await getStudy(studyId, userId); // visibility check
  const lessons = await prisma.studyLesson.findMany({ where: { studyId } });
  const completions = await prisma.studyLessonCompletion.findMany({
    where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
  });
  const completedLessonIds = completions.map((c) => c.lessonId);
  return { total: lessons.length, completed: completedLessonIds.length, completedLessonIds };
}

const MAX_COMMENT_LENGTH = 1000;

/** 403 (not the visibility-check's 404) — the caller CAN see this
 *  lesson (that was already confirmed by the time this runs), they
 *  just haven't joined, which is a real, honest thing to tell them
 *  rather than something to mask. */
async function assertIsParticipant(studyId, userId) {
  const participant = await prisma.studyParticipant.findUnique({ where: { studyId_userId: { studyId, userId } } });
  if (!participant) {
    const err = new Error('Join this study first.');
    err.status = 403;
    throw err;
  }
}

/** Viewing comments only requires being able to view the lesson —
 *  same visibility-only rule as browsing a study at all. Each comment
 *  is annotated with its like count and whether the viewer themselves
 *  has liked it, so the frontend can render a filled/unfilled heart
 *  without a second round trip per comment. */
export async function listComments(lessonId, viewerId) {
  await getLesson(lessonId, viewerId); // visibility check, throws 404 if not visible
  const comments = await prisma.studyComment.findMany({
    where: { lessonId },
    include: { author: { select: { id: true, username: true } }, likes: true },
    orderBy: { createdAt: 'asc' },
  });
  return comments.map((c) => ({
    id: c.id,
    author: c.author,
    body: c.body,
    createdAt: c.createdAt,
    likeCount: c.likes.length,
    likedByMe: c.likes.some((l) => l.userId === viewerId),
  }));
}

/** Requires participation — visibility alone isn't enough to post,
 *  same asymmetry as progress-tracking: browsing a study doesn't
 *  require joining, contributing to it does. Checked in order
 *  (visibility first, then participation) so a non-viewer gets the
 *  masked 404 rather than a 403 that would confirm the lesson exists. */
export async function createComment(lessonId, authorId, body) {
  if (!body || !body.trim()) {
    const err = new Error('Comment cannot be empty.');
    err.status = 400;
    throw err;
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    const err = new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  const lesson = await prisma.studyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.status = 404;
    throw err;
  }
  await getStudy(lesson.studyId, authorId); // visibility check
  await assertIsParticipant(lesson.studyId, authorId);
  return prisma.studyComment.create({ data: { lessonId, authorId, body: body.trim() } });
}

export async function deleteComment(commentId, userId) {
  const comment = await prisma.studyComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== userId) {
    const err = new Error('Comment not found.');
    err.status = 404;
    throw err;
  }
  await prisma.studyComment.delete({ where: { id: commentId } }); // cascades likes
}

/** Upsert rather than create — liking an already-liked comment is a
 *  harmless no-op instead of a unique-constraint error, same pattern
 *  as markLessonComplete. */
export async function likeComment(commentId, userId) {
  const comment = await prisma.studyComment.findUnique({ where: { id: commentId } });
  if (!comment) {
    const err = new Error('Comment not found.');
    err.status = 404;
    throw err;
  }
  const lesson = await prisma.studyLesson.findUnique({ where: { id: comment.lessonId } });
  await getStudy(lesson.studyId, userId); // visibility check
  await assertIsParticipant(lesson.studyId, userId);
  return prisma.studyCommentLike.upsert({
    where: { commentId_userId: { commentId, userId } },
    create: { commentId, userId },
    update: {},
  });
}

export async function unlikeComment(commentId, userId) {
  const like = await prisma.studyCommentLike.findUnique({ where: { commentId_userId: { commentId, userId } } });
  if (like) {
    await prisma.studyCommentLike.delete({ where: { id: like.id } });
  }
}

const MIN_WEEK_COUNT = 1;
const MAX_WEEK_COUNT = 26;

/**
 * Generates a draft multi-week study plan via the LLM — NOT persisted.
 * Returns the draft array for the leader to review/edit in the
 * frontend before accepting it via bulkCreateLessons (or individual
 * createLesson calls for one-off tweaks). Deliberately a single,
 * non-tool-using call rather than reusing contextBuilder's
 * runWithPassageTool loop — that loop returns freeform joined text,
 * not parsed JSON, and the get_passage tool it offers doesn't fit a
 * planning task where the model is proposing session boundaries
 * rather than discussing an already-fixed passage.
 *
 * module is required (not optional) specifically so every proposed
 * reference can be validated against real installed text before
 * reaching the caller — a reference proposed from the model's general
 * knowledge of the material, not grounded in the actual fetched text
 * the rest of this app insists on everywhere else, can and does
 * hallucinate a chapter/verse that doesn't exist. Rather than let a
 * broken reference silently flow into what becomes a real
 * StudyLesson record, an unresolvable one is cleared here — the
 * title/body are still a useful starting draft either way, and the
 * leader can fill in the reference by hand.
 */
export async function generateLessonDrafts(studyId, callerId, { topic, weekCount, module }) {
  await assertOwnerOfStudy(studyId, callerId);

  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  }
  if (!topic || !topic.trim()) {
    const err = new Error('A topic is required.');
    err.status = 400;
    throw err;
  }
  if (!module) {
    const err = new Error('A Bible module is required, so proposed references can be checked against real text.');
    err.status = 400;
    throw err;
  }
  const count = Number(weekCount);
  if (!Number.isInteger(count) || count < MIN_WEEK_COUNT || count > MAX_WEEK_COUNT) {
    const err = new Error(`weekCount must be a whole number between ${MIN_WEEK_COUNT} and ${MAX_WEEK_COUNT}.`);
    err.status = 400;
    throw err;
  }

  const system = [
    'You are helping a Bible study leader plan a multi-week structured',
    `study. Generate a ${count}-week study plan on: "${topic.trim()}".`,
    '',
    'Respond with ONLY a JSON array, no preamble, no markdown code fences,',
    'no explanation before or after it — just the raw JSON array itself,',
    'matching this exact shape for each week:',
    '{"order": <1-based week number>, "title": "<short session title>",',
    '"reference": "<a specific, real Bible reference or range for this',
    'week, short enough to cover meaningfully in one session>", "body":',
    '"<a brief 2-4 sentence summary of what this session will focus on',
    'and why it matters -- a starting draft the leader will expand on,',
    'not a finished lesson>"}',
    '',
    `Return exactly ${count} entries, ordered 1 through ${count}, moving`,
    'through the material in a sensible sequence.',
  ].join('\n');

  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: `Generate the ${count}-week study plan now.` }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  let drafts;
  try {
    // Defensive: strip accidental markdown fences even though the
    // prompt explicitly asks for none — models don't always comply.
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    drafts = JSON.parse(cleaned);
  } catch {
    const err = new Error("The assistant's response couldn't be parsed as a valid study plan. Please try again.");
    err.status = 502;
    throw err;
  }
  if (!Array.isArray(drafts)) {
    const err = new Error("The assistant's response wasn't in the expected format. Please try again.");
    err.status = 502;
    throw err;
  }

  return drafts.map((d, i) => {
    let reference = typeof d.reference === 'string' ? d.reference.trim() : '';
    if (reference) {
      try {
        const verses = swordService.getPassage(module, reference);
        if (!verses || verses.length === 0) reference = '';
      } catch {
        reference = '';
      }
    }
    return {
      order: Number.isInteger(d.order) ? d.order : i + 1,
      title: typeof d.title === 'string' && d.title.trim() ? d.title.trim().slice(0, MAX_TITLE_LENGTH) : `Week ${i + 1}`,
      module,
      reference: reference || null,
      body: typeof d.body === 'string' ? d.body.trim().slice(0, 2000) : null,
    };
  });
}

const VALID_RESOURCE_TYPES = ['commentary', 'link'];
const MAX_LABEL_LENGTH = 80;

function validateResourceInput({ type, label, moduleCode, url }) {
  if (!VALID_RESOURCE_TYPES.includes(type)) {
    const err = new Error('type must be "commentary" or "link".');
    err.status = 400;
    throw err;
  }
  if (!label || !label.trim()) {
    const err = new Error('A label is required.');
    err.status = 400;
    throw err;
  }
  if (label.length > MAX_LABEL_LENGTH) {
    const err = new Error(`Label must be ${MAX_LABEL_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  if (type === 'commentary' && !moduleCode) {
    const err = new Error('moduleCode is required for a commentary resource.');
    err.status = 400;
    throw err;
  }
  if (type === 'link' && !url) {
    const err = new Error('url is required for a link resource.');
    err.status = 400;
    throw err;
  }
}

/** Leader-curated only (owner-only, same as lesson authoring) — this
 *  is deliberately a short, deliberate list the leader picks, not
 *  "every installed commentary module", matching the mockup's
 *  "+ Add Resource" framing. */
export async function addResource(studyId, callerId, { type, label, moduleCode, url, order }) {
  await assertOwnerOfStudy(studyId, callerId);
  validateResourceInput({ type, label, moduleCode, url });
  return prisma.studyResource.create({
    data: {
      studyId,
      type,
      label: label.trim(),
      moduleCode: type === 'commentary' ? moduleCode : null,
      url: type === 'link' ? url.trim() : null,
      order: order ?? 0,
    },
  });
}

export async function removeResource(resourceId, callerId) {
  const resource = await prisma.studyResource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    const err = new Error('Resource not found.');
    err.status = 404;
    throw err;
  }
  await assertOwnerOfStudy(resource.studyId, callerId);
  await prisma.studyResource.delete({ where: { id: resourceId } });
}

/** Visibility-only, same as listComments/listLessons — browsing the
 *  curated resource list is "reference material", not a contribution,
 *  so it doesn't require participation the way posting or liking do. */
export async function listResources(studyId, viewerId) {
  await getStudy(studyId, viewerId); // visibility check, throws 404 if not visible
  return prisma.studyResource.findMany({ where: { studyId }, orderBy: { order: 'asc' } });
}

/** The actual footer-drawer content for one resource against one
 *  lesson's passage. Sanity-checks the resource and lesson belong to
 *  the same study — a resourceId from one study shouldn't be usable
 *  against an unrelated lessonId just because both ids are individually
 *  valid. Only meaningful for "commentary" resources (real text to
 *  fetch); "link" resources just return their url for the frontend to
 *  open, since there's no server-side content to pull. */
export async function getResourceContent(resourceId, lessonId, viewerId) {
  const resource = await prisma.studyResource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    const err = new Error('Resource not found.');
    err.status = 404;
    throw err;
  }
  const lesson = await prisma.studyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.studyId !== resource.studyId) {
    const err = new Error('Lesson not found.');
    err.status = 404;
    throw err;
  }
  await getStudy(resource.studyId, viewerId); // visibility check

  if (resource.type === 'link') {
    return { type: 'link', label: resource.label, url: resource.url };
  }

  if (!lesson.reference) {
    return { type: 'commentary', label: resource.label, text: null, note: 'This lesson has no reference set yet.' };
  }
  try {
    const verses = swordService.getPassage(resource.moduleCode, lesson.reference);
    const text = swordService.versesToText(verses);
    return { type: 'commentary', label: resource.label, text };
  } catch {
    return { type: 'commentary', label: resource.label, text: null, note: `No ${resource.label} entry found for ${lesson.reference}.` };
  }
}