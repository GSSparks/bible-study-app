import { prisma } from '../db/prisma.js';

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

function validateFields({ name, description, visibility }) {
  if (!name || !name.trim()) {
    const err = new Error('A name is required.');
    err.status = 400;
    throw err;
  }
  if (name.length > MAX_NAME_LENGTH) {
    const err = new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    const err = new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  if (visibility !== 'private' && visibility !== 'public') {
    const err = new Error('visibility must be "private" or "public".');
    err.status = 400;
    throw err;
  }
}

/** Are these two users Fellows? Checks both directions since a
 *  Connection row's requester/recipient labeling doesn't matter once
 *  accepted — the relationship itself is symmetric. */
export async function areFellows(userIdA, userIdB) {
  const connection = await prisma.connection.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: userIdA, recipientId: userIdB },
        { requesterId: userIdB, recipientId: userIdA },
      ],
    },
  });
  return Boolean(connection);
}

/** Creates the Scriptorium and its owner's membership row together, so
 *  the owner is always also a member — every membership/role check
 *  elsewhere in this file can treat "owner" as just a membership role
 *  rather than needing a separate special case for "is the owner
 *  technically a member too". */
export async function createScriptorium(ownerId, { name, description, visibility = 'private' }) {
  validateFields({ name, description, visibility });
  return prisma.$transaction(async (tx) => {
    const scriptorium = await tx.scriptorium.create({
      data: { name: name.trim(), description: description?.trim() || null, visibility, ownerId },
    });
    await tx.scriptoriumMembership.create({
      data: { scriptoriumId: scriptorium.id, userId: ownerId, role: 'owner' },
    });
    return scriptorium;
  });
}

/** Every public Scriptorium, annotated with whether the caller is
 *  already a member (so the UI can show "join" vs. "already a
 *  member" without a second round trip per result). */
export async function listPublicScriptoriums(userId) {
  const [scriptoriums, myMemberships] = await Promise.all([
    prisma.scriptorium.findMany({ where: { visibility: 'public' }, orderBy: { createdAt: 'desc' } }),
    prisma.scriptoriumMembership.findMany({ where: { userId } }),
  ]);
  const myScriptoriumIds = new Set(myMemberships.map((m) => m.scriptoriumId));
  return scriptoriums.map((s) => ({ ...s, isMember: myScriptoriumIds.has(s.id) }));
}

/** Every Scriptorium the caller is a member of, regardless of
 *  visibility — this is how a member keeps seeing (and can still open)
 *  a private one they belong to, even though it'll never show up in
 *  listPublicScriptoriums. */
export async function listMyScriptoriums(userId) {
  const memberships = await prisma.scriptoriumMembership.findMany({
    where: { userId },
    include: { scriptorium: true },
    orderBy: { joinedAt: 'desc' },
  });
  return memberships.map((m) => ({ ...m.scriptorium, myRole: m.role }));
}

/** 404 (not 403) when a non-member requests a private Scriptorium —
 *  same reasoning as every other ownership check in this app: a
 *  non-member shouldn't be able to confirm a private Scriptorium
 *  exists at all just by trying to look it up, let alone learn its
 *  name/description/member count. */
export async function getScriptorium(scriptoriumId, userId) {
  const scriptorium = await prisma.scriptorium.findUnique({ where: { id: scriptoriumId } });
  if (!scriptorium) {
    const err = new Error('Scriptorium not found.');
    err.status = 404;
    throw err;
  }
  const membership = await prisma.scriptoriumMembership.findUnique({
    where: { scriptoriumId_userId: { scriptoriumId, userId: userId || '' } },
  });
  if (scriptorium.visibility === 'private' && !membership) {
    const err = new Error('Scriptorium not found.');
    err.status = 404;
    throw err;
  }
  return { ...scriptorium, isMember: Boolean(membership), myRole: membership?.role || null };
}

/** Same visibility rule as getScriptorium — a private Scriptorium's
 *  member list is exactly as hidden from non-members as everything
 *  else about it. */
export async function listMembers(scriptoriumId, userId) {
  await getScriptorium(scriptoriumId, userId); // reuses the same 404-masking check
  const memberships = await prisma.scriptoriumMembership.findMany({
    where: { scriptoriumId },
    include: { user: { select: { id: true, username: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }], // 'owner' sorts before 'member' alphabetically, a small free bonus
  });
  return memberships.map((m) => ({ membershipId: m.id, id: m.user.id, username: m.user.username, role: m.role, joinedAt: m.joinedAt }));
}

export async function joinPublicScriptorium(scriptoriumId, userId) {
  const scriptorium = await prisma.scriptorium.findUnique({ where: { id: scriptoriumId } });
  // A private Scriptorium 404s here too, same masking reasoning — a
  // non-member trying to join one they somehow have the id for
  // shouldn't get a response that confirms it exists and is just
  // private, versus not existing at all.
  if (!scriptorium || scriptorium.visibility !== 'public') {
    const err = new Error('Scriptorium not found.');
    err.status = 404;
    throw err;
  }
  const existing = await prisma.scriptoriumMembership.findUnique({
    where: { scriptoriumId_userId: { scriptoriumId, userId } },
  });
  if (existing) {
    const err = new Error('Already a member.');
    err.status = 409;
    throw err;
  }
  return prisma.scriptoriumMembership.create({ data: { scriptoriumId, userId, role: 'member' } });
}

/** The owner can't leave via this — deleteScriptorium is the
 *  equivalent action for them. A deliberate simplification: no
 *  ownership-transfer flow exists yet, so "owner leaves" has no
 *  well-defined outcome to hand off to. */
export async function leaveScriptorium(scriptoriumId, userId) {
  const membership = await prisma.scriptoriumMembership.findUnique({
    where: { scriptoriumId_userId: { scriptoriumId, userId } },
  });
  if (!membership) {
    const err = new Error('Not a member.');
    err.status = 404;
    throw err;
  }
  if (membership.role === 'owner') {
    const err = new Error("The owner can't leave — delete the Scriptorium instead.");
    err.status = 400;
    throw err;
  }
  await prisma.scriptoriumMembership.delete({ where: { id: membership.id } });
}

/** Owner-only, 404-masked for anyone else — same reasoning throughout:
 *  a non-owner shouldn't learn whether they'd be allowed to delete
 *  something by getting a 403 that confirms the id is real. */
async function assertOwner(scriptoriumId, userId) {
  const scriptorium = await prisma.scriptorium.findUnique({ where: { id: scriptoriumId } });
  if (!scriptorium || scriptorium.ownerId !== userId) {
    const err = new Error('Scriptorium not found.');
    err.status = 404;
    throw err;
  }
  return scriptorium;
}

export async function deleteScriptorium(scriptoriumId, userId) {
  await assertOwner(scriptoriumId, userId);
  await prisma.scriptorium.delete({ where: { id: scriptoriumId } }); // cascades remove memberships/invites
}

export async function updateScriptorium(scriptoriumId, userId, { name, description, visibility }) {
  await assertOwner(scriptoriumId, userId);
  validateFields({ name, description, visibility });
  return prisma.scriptorium.update({
    where: { id: scriptoriumId },
    data: { name: name.trim(), description: description?.trim() || null, visibility },
  });
}

/** Owner-only member removal (separate from leaveScriptorium, which is
 *  self-service) — can't remove the owner themselves (role check),
 *  and 404s for a non-owner caller same as every other owner-gated
 *  action here. */
export async function removeMember(scriptoriumId, callerId, membershipId) {
  await assertOwner(scriptoriumId, callerId);
  const membership = await prisma.scriptoriumMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.scriptoriumId !== scriptoriumId) {
    const err = new Error('Member not found.');
    err.status = 404;
    throw err;
  }
  if (membership.role === 'owner') {
    const err = new Error('The owner cannot be removed.');
    err.status = 400;
    throw err;
  }
  await prisma.scriptoriumMembership.delete({ where: { id: membershipId } });
}

/** Invites route through the Fellows graph — the inviter must already
 *  be a member, and the invitee must already be a Fellow of the
 *  inviter. Re-inviting after a decline resets the existing row back
 *  to pending rather than trying to insert a duplicate the unique
 *  constraint would reject. */
export async function inviteToScriptorium(scriptoriumId, inviterId, inviteeUsername) {
  const scriptorium = await prisma.scriptorium.findUnique({ where: { id: scriptoriumId } });
  if (!scriptorium) {
    const err = new Error('Scriptorium not found.');
    err.status = 404;
    throw err;
  }
  const inviterMembership = await prisma.scriptoriumMembership.findUnique({
    where: { scriptoriumId_userId: { scriptoriumId, userId: inviterId } },
  });
  if (!inviterMembership) {
    // Masked the same way as everywhere else — a non-member shouldn't
    // learn a private Scriptorium exists by trying to invite into it.
    const err = new Error('Scriptorium not found.');
    err.status = 404;
    throw err;
  }

  const invitee = await prisma.user.findUnique({ where: { username: inviteeUsername?.trim() || '' } });
  if (!invitee) {
    const err = new Error(`No user found with username "${inviteeUsername}".`);
    err.status = 404;
    throw err;
  }
  if (invitee.id === inviterId) {
    const err = new Error("You can't invite yourself.");
    err.status = 400;
    throw err;
  }

  const alreadyMember = await prisma.scriptoriumMembership.findUnique({
    where: { scriptoriumId_userId: { scriptoriumId, userId: invitee.id } },
  });
  if (alreadyMember) {
    const err = new Error('That person is already a member.');
    err.status = 409;
    throw err;
  }

  const fellows = await areFellows(inviterId, invitee.id);
  if (!fellows) {
    const err = new Error('You can only invite your Fellows.');
    err.status = 400;
    throw err;
  }

  const existingInvite = await prisma.scriptoriumInvite.findUnique({
    where: { scriptoriumId_inviteeId: { scriptoriumId, inviteeId: invitee.id } },
  });
  if (existingInvite) {
    if (existingInvite.status === 'pending') {
      const err = new Error('An invite is already pending for that person.');
      err.status = 409;
      throw err;
    }
    // status 'declined' — reset rather than duplicate.
    return prisma.scriptoriumInvite.update({
      where: { id: existingInvite.id },
      data: { status: 'pending', inviterId },
    });
  }

  return prisma.scriptoriumInvite.create({
    data: { scriptoriumId, inviterId, inviteeId: invitee.id, status: 'pending' },
  });
}

/** Pending invites received, with the Scriptorium's own name/id
 *  included so the UI doesn't need a second lookup per invite. */
export async function listMyInvites(userId) {
  const invites = await prisma.scriptoriumInvite.findMany({
    where: { inviteeId: userId, status: 'pending' },
    include: { scriptorium: { select: { id: true, name: true, description: true } }, inviter: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return invites.map((i) => ({
    inviteId: i.id,
    scriptoriumId: i.scriptorium.id,
    name: i.scriptorium.name,
    description: i.scriptorium.description,
    invitedBy: i.inviter.username,
    createdAt: i.createdAt,
  }));
}

/** 404 (not 403) when the caller isn't the actual invitee — same
 *  masking reasoning as everywhere else. Accepting creates the
 *  membership in the same transaction as marking the invite accepted,
 *  so the two can't end up inconsistent with each other. */
export async function respondToInvite(userId, inviteId, accept) {
  const invite = await prisma.scriptoriumInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.inviteeId !== userId) {
    const err = new Error('Invite not found.');
    err.status = 404;
    throw err;
  }
  if (invite.status !== 'pending') {
    const err = new Error('This invite has already been responded to.');
    err.status = 409;
    throw err;
  }
  if (!accept) {
    return prisma.scriptoriumInvite.update({ where: { id: inviteId }, data: { status: 'declined' } });
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.scriptoriumInvite.update({ where: { id: inviteId }, data: { status: 'accepted' } });
    await tx.scriptoriumMembership.create({
      data: { scriptoriumId: invite.scriptoriumId, userId, role: 'member' },
    });
    return updated;
  });
}