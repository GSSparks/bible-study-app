import { prisma } from '../db/prisma.js';
import { getScriptorium, areFellows } from './scriptoriumService.js';

const MAX_BODY_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 1000;

function validateBody(body, maxLength, label) {
  if (!body || !body.trim()) {
    const err = new Error(`${label} cannot be empty.`);
    err.status = 400;
    throw err;
  }
  if (body.length > maxLength) {
    const err = new Error(`${label} must be ${maxLength} characters or fewer.`);
    err.status = 400;
    throw err;
  }
}

const authorSelect = { select: { id: true, username: true } };
const postInclude = {
  author: authorSelect,
  comments: { include: { author: authorSelect }, orderBy: { createdAt: 'asc' } },
};

/** Same 404-masking reasoning as getScriptorium — a non-member trying
 *  to post into (or already-knowing about) a private Scriptorium
 *  shouldn't get a response that confirms it exists. Once visibility
 *  is confirmed via getScriptorium, a public Scriptorium a caller can
 *  SEE but hasn't JOINED gets a distinct, non-masked error instead —
 *  there's nothing left to hide at that point, so the clearer "join
 *  first" message is more honest than another 404. */
async function assertCanPostToScriptorium(scriptoriumId, userId) {
  const scriptorium = await getScriptorium(scriptoriumId, userId); // throws 404 if private + not a member
  if (!scriptorium.isMember) {
    const err = new Error('Join this Scriptorium to post on its wall.');
    err.status = 403;
    throw err;
  }
  return scriptorium;
}

export async function createPost({ authorId, scriptoriumId, body }) {
  validateBody(body, MAX_BODY_LENGTH, 'Post');
  if (scriptoriumId) {
    await assertCanPostToScriptorium(scriptoriumId, authorId);
  }
  const post = await prisma.post.create({
    data: { authorId, scriptoriumId: scriptoriumId || null, body: body.trim() },
  });
  return prisma.post.findUnique({ where: { id: post.id }, include: postInclude });
}

/** A user's own personal wall — always visible to themselves; for
 *  anyone else, 404 (masked) unless they're Fellows with the wall's
 *  owner. Same masking reasoning as everywhere else in this app: a
 *  non-Fellow shouldn't be able to distinguish "this wall has no
 *  visible posts" from "you're not allowed to see this wall at all". */
export async function getWall(usernameOrOwnerId, viewerId, { byUsername = true } = {}) {
  const owner = byUsername
    ? await prisma.user.findUnique({ where: { username: usernameOrOwnerId } })
    : await prisma.user.findUnique({ where: { id: usernameOrOwnerId } });
  if (!owner) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  if (owner.id !== viewerId) {
    const fellows = await areFellows(owner.id, viewerId);
    if (!fellows) {
      const err = new Error('Wall not found.');
      err.status = 404;
      throw err;
    }
  }
  const posts = await prisma.post.findMany({
    where: { authorId: owner.id, scriptoriumId: null },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { owner: { id: owner.id, username: owner.username }, posts };
}

/** Reuses getScriptorium's own visibility check entirely rather than
 *  re-implementing it — a private Scriptorium's wall is exactly as
 *  hidden from non-members as everything else about it. */
export async function getScriptoriumWall(scriptoriumId, viewerId) {
  const scriptorium = await getScriptorium(scriptoriumId, viewerId); // throws 404 if not visible
  const posts = await prisma.post.findMany({
    where: { scriptoriumId },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { scriptorium, posts };
}

/** Own posts + Fellows' personal-wall posts + every Scriptorium the
 *  caller is a member of — merged and sorted chronologically. Two
 *  separate queries rather than one convoluted OR, since the two
 *  halves (personal-wall-by-fellow-or-self vs. scriptorium-wall)
 *  aren't expressible as a single clean Prisma where clause. */
export async function getHomeFeed(userId) {
  const [sentConnections, receivedConnections, memberships] = await Promise.all([
    prisma.connection.findMany({ where: { requesterId: userId, status: 'accepted' } }),
    prisma.connection.findMany({ where: { recipientId: userId, status: 'accepted' } }),
    prisma.scriptoriumMembership.findMany({ where: { userId } }),
  ]);
  const fellowIds = [
    ...sentConnections.map((c) => c.recipientId),
    ...receivedConnections.map((c) => c.requesterId),
  ];
  const scriptoriumIds = memberships.map((m) => m.scriptoriumId);

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { scriptoriumId: null, authorId: { in: [userId, ...fellowIds] } },
        { scriptoriumId: { in: scriptoriumIds } },
      ],
    },
    include: { ...postInclude, scriptorium: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return posts;
}

/** 404 (not 403) for a non-author trying to delete — masks whether
 *  the post exists at all from someone who has no business knowing,
 *  same as ownership checks throughout this app. No moderation
 *  override yet (a Scriptorium owner can't delete a member's post) —
 *  a deliberate simplification, not an oversight; that's a natural
 *  future extension of the admin/moderation theme, not part of this
 *  round. */
export async function deletePost(postId, userId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== userId) {
    const err = new Error('Post not found.');
    err.status = 404;
    throw err;
  }
  await prisma.post.delete({ where: { id: postId } }); // cascades comments
}

/** Commenting requires the same visibility as viewing the post itself
 *  — reuses getScriptoriumWall/getWall's checks by re-deriving them
 *  rather than trusting the client's claim that they can see the post. */
export async function createComment({ postId, authorId, body }) {
  validateBody(body, MAX_COMMENT_LENGTH, 'Comment');
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    const err = new Error('Post not found.');
    err.status = 404;
    throw err;
  }
  if (post.scriptoriumId) {
    await getScriptorium(post.scriptoriumId, authorId); // throws 404 if not visible
  } else if (post.authorId !== authorId) {
    const fellows = await areFellows(post.authorId, authorId);
    if (!fellows) {
      const err = new Error('Post not found.');
      err.status = 404;
      throw err;
    }
  }
  await prisma.comment.create({ data: { postId, authorId, body: body.trim() } });
  return prisma.post.findUnique({ where: { id: postId }, include: postInclude });
}

export async function deleteComment(commentId, userId) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== userId) {
    const err = new Error('Comment not found.');
    err.status = 404;
    throw err;
  }
  await prisma.comment.delete({ where: { id: commentId } });
}