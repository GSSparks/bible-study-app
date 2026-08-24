import { prisma } from '../db/prisma.js';

/** Sends a Fellow request. Handles the real edge case the schema's
 *  unique constraint alone doesn't: it only blocks a duplicate in the
 *  SAME direction (A requesting B twice), not A and B independently,
 *  simultaneously requesting each other. If a reverse-direction
 *  pending row already exists, that's mutual interest — this accepts
 *  it immediately rather than creating a confusing second pending
 *  request in the opposite direction. Also allows re-requesting after
 *  a prior decline, by resetting the existing row rather than trying
 *  to insert a new one the unique constraint would reject anyway. */
export async function sendRequest(requesterId, recipientUsername) {
  const recipient = await prisma.user.findUnique({ where: { username: recipientUsername?.trim() || '' } });
  if (!recipient) {
    const err = new Error(`No user found with username "${recipientUsername}".`);
    err.status = 404;
    throw err;
  }
  if (recipient.id === requesterId) {
    const err = new Error("You can't send a Fellow request to yourself.");
    err.status = 400;
    throw err;
  }

  const existingSameDirection = await prisma.connection.findUnique({
    where: { requesterId_recipientId: { requesterId, recipientId: recipient.id } },
  });
  const existingReverseDirection = await prisma.connection.findUnique({
    where: { requesterId_recipientId: { requesterId: recipient.id, recipientId: requesterId } },
  });

  if (existingReverseDirection) {
    if (existingReverseDirection.status === 'accepted') {
      const err = new Error('You are already Fellows.');
      err.status = 409;
      throw err;
    }
    if (existingReverseDirection.status === 'pending') {
      // They already requested you — mutual interest, accept immediately.
      return prisma.connection.update({ where: { id: existingReverseDirection.id }, data: { status: 'accepted' } });
    }
    // status 'declined' in the reverse direction falls through — a
    // decline in one direction shouldn't block a fresh request in the
    // other direction.
  }

  if (existingSameDirection) {
    if (existingSameDirection.status === 'pending') {
      const err = new Error('A request is already pending.');
      err.status = 409;
      throw err;
    }
    if (existingSameDirection.status === 'accepted') {
      const err = new Error('You are already Fellows.');
      err.status = 409;
      throw err;
    }
    // status 'declined' — reset back to pending rather than inserting
    // a new row the unique constraint would reject.
    return prisma.connection.update({
      where: { id: existingSameDirection.id },
      data: { status: 'pending' },
    });
  }

  return prisma.connection.create({ data: { requesterId, recipientId: recipient.id, status: 'pending' } });
}

/** Only the recipient can accept/decline — 404 (not 403) on a
 *  mismatch, same reasoning as every other ownership check in this
 *  app: it should look identical to the request simply not existing,
 *  not confirm to a caller that some other user's pending request
 *  exists at that id. */
export async function respondToRequest(userId, connectionId, accept) {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.recipientId !== userId) {
    const err = new Error('Request not found.');
    err.status = 404;
    throw err;
  }
  if (connection.status !== 'pending') {
    const err = new Error('This request has already been responded to.');
    err.status = 409;
    throw err;
  }
  return prisma.connection.update({ where: { id: connectionId }, data: { status: accept ? 'accepted' : 'declined' } });
}

/** Covers three cases with one ownership rule (either party touching
 *  the row): removing an accepted connection, the requester canceling
 *  their own still-pending sent request, or the recipient dismissing a
 *  pending request they haven't responded to yet. Deletes the row
 *  outright (rather than marking it declined) so a fresh request is
 *  possible immediately afterward if either side wants to reconnect
 *  later. */
export async function removeConnection(userId, connectionId) {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection || (connection.requesterId !== userId && connection.recipientId !== userId)) {
    const err = new Error('Connection not found.');
    err.status = 404;
    throw err;
  }
  await prisma.connection.delete({ where: { id: connectionId } });
}

/** Every accepted connection, normalized to "the other person"
 *  regardless of who originally sent the request. */
export async function listConnections(userId) {
  const rows = await prisma.connection.findMany({
    where: { status: 'accepted', OR: [{ requesterId: userId }, { recipientId: userId }] },
    include: {
      requester: { select: { id: true, username: true } },
      recipient: { select: { id: true, username: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((c) => {
    const other = c.requesterId === userId ? c.recipient : c.requester;
    return { connectionId: c.id, id: other.id, username: other.username, since: c.updatedAt };
  });
}

/** Incoming requests awaiting this user's response. */
export async function listPendingReceived(userId) {
  const rows = await prisma.connection.findMany({
    where: { recipientId: userId, status: 'pending' },
    include: { requester: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((c) => ({ connectionId: c.id, id: c.requester.id, username: c.requester.username, requestedAt: c.createdAt }));
}

/** Outgoing requests this user sent, still awaiting a response. */
export async function listPendingSent(userId) {
  const rows = await prisma.connection.findMany({
    where: { requesterId: userId, status: 'pending' },
    include: { recipient: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((c) => ({ connectionId: c.id, id: c.recipient.id, username: c.recipient.username, requestedAt: c.createdAt }));
}

/** Searches by username, annotating each result with the current
 *  relationship to the searching user so the UI can show the right
 *  action (connect / pending / already connected) without a second
 *  round trip per result. */
export async function searchUsers(query, currentUserId) {
  const trimmed = (query || '').trim();
  if (trimmed.length < 2) return []; // avoid a firehose of results on a 1-character query

  const users = await prisma.user.findMany({
    where: {
      username: { contains: trimmed, mode: 'insensitive' },
      id: { not: currentUserId }, // never show yourself in your own search results
    },
    select: { id: true, username: true },
    take: 20,
    orderBy: { username: 'asc' },
  });
  if (users.length === 0) return [];

  // One query covering every connection touching the current user,
  // rather than one query per search result.
  const relevant = await prisma.connection.findMany({
    where: { OR: [{ requesterId: currentUserId }, { recipientId: currentUserId }] },
  });

  return users.map((u) => {
    const rel = relevant.find((c) => c.requesterId === u.id || c.recipientId === u.id);
    let status = 'none';
    if (rel) {
      if (rel.status === 'accepted') status = 'connected';
      else if (rel.status === 'pending' && rel.requesterId === currentUserId) status = 'pending_sent';
      else if (rel.status === 'pending' && rel.recipientId === currentUserId) status = 'pending_received';
      else if (rel.status === 'declined') status = 'declined';
    }
    return { id: u.id, username: u.username, status, connectionId: rel?.id || null };
  });
}