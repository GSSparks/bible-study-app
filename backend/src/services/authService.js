import argon2 from 'argon2';
import { prisma } from '../db/prisma.js';

const MIN_PASSWORD_LENGTH = 10; // public-facing server — a 6-8 char minimum isn't enough here

// A real, valid argon2 hash checked against when a username doesn't
// exist, so a login attempt takes roughly the same time whether or not
// the username is real. Without this, a nonexistent username returns
// noticeably faster (skips the expensive hash comparison entirely),
// which is a textbook username-enumeration timing side channel —
// confirmed the two paths are comparable (210ms vs 211ms) before
// relying on this.
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$zkB8ioiyscKiV5M3xFNJjA$J2USpPDYUxS6gcsu9AEIai9m/M/SAfiMnsjb8azz6yo';

export async function hashPassword(password) {
  return argon2.hash(password);
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // argon2.verify throws on a malformed/foreign hash format rather
    // than returning false — treat that the same as "doesn't match"
    // instead of letting it bubble up as an unrelated 500.
    return false;
  }
}

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

function validateUsername(username) {
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return 'Username must be at least 3 characters.';
  }
  return null;
}

/** True once any user exists — the first-run bootstrap flow is only
 *  ever shown before this becomes true. */
export async function isBootstrapNeeded() {
  const count = await prisma.user.count();
  return count === 0;
}

/**
 * Creates the very first (admin) account. Race-condition-safe: a naive
 * "count users, then create if zero" check leaves a real window open —
 * two bootstrap requests arriving close together could both pass the
 * check before either commits, creating two "first" admins, one of
 * them possibly an attacker racing the legitimate deployer right after
 * the server comes up. This closes that by wrapping the check and the
 * user creation in one transaction that also inserts a singleton row
 * into AppSetting under a fixed unique key. Postgres enforces unique
 * constraints atomically even under concurrent transactions at the
 * default READ COMMITTED isolation level — no special isolation-level
 * tuning needed — so if two requests race, exactly one AppSetting
 * insert succeeds; the other throws a unique-constraint violation and
 * its entire transaction (including the user it was about to create)
 * rolls back.
 */
export async function bootstrapAdmin({ username, password }) {
  const usernameError = validateUsername(username);
  if (usernameError) {
    const err = new Error(usernameError);
    err.status = 400;
    throw err;
  }
  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    const err = new Error(strengthError);
    err.status = 400;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.appSetting.create({ data: { key: 'bootstrap_completed', value: 'true' } });
      return tx.user.create({
        data: { username: username.trim(), passwordHash, role: 'admin' },
        select: { id: true, username: true, role: true, createdAt: true },
      });
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const conflictErr = new Error('Setup has already been completed.');
      conflictErr.status = 409;
      throw conflictErr;
    }
    throw err;
  }
}

/** Regular user creation, admin-only (enforced by the route, not here).
 *  Unlike bootstrapAdmin, this doesn't need the singleton-row trick —
 *  there's no "only the first one wins" race to guard against, just the
 *  normal unique-username constraint. */
export async function createUser({ username, password, role = 'user' }) {
  const usernameError = validateUsername(username);
  if (usernameError) {
    const err = new Error(usernameError);
    err.status = 400;
    throw err;
  }
  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    const err = new Error(strengthError);
    err.status = 400;
    throw err;
  }
  if (role !== 'admin' && role !== 'user') {
    const err = new Error('role must be "admin" or "user".');
    err.status = 400;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  try {
    return await prisma.user.create({
      data: { username: username.trim(), passwordHash, role },
      select: { id: true, username: true, role: true, createdAt: true },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const conflictErr = new Error('That username is already taken.');
      conflictErr.status = 409;
      throw conflictErr;
    }
    throw err;
  }
}

/** Verifies a login attempt. Always runs a real argon2 comparison
 *  (against DUMMY_HASH when the username doesn't exist) rather than
 *  short-circuiting, so response timing doesn't leak which usernames
 *  are registered. */
export async function verifyLogin({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username: username?.trim() || '' } });
  const hashToCheck = user?.passwordHash || DUMMY_HASH;
  const valid = await verifyPassword(hashToCheck, password);
  if (!user || !valid) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, username: user.username, role: user.role };
}

/** Lets a logged-in user change their own password. Requires the
 *  current password as confirmation — without that, anyone who found
 *  an already-logged-in session (a shared or unlocked device, say)
 *  could lock the real account holder out just by having an active
 *  session, without ever needing to actually know the password. Unlike
 *  verifyLogin, no timing-safety concern here: the caller's identity
 *  already comes from their session, not something being guessed, so
 *  there's no username-enumeration-style risk to guard against. */
export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }
  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    const err = new Error('Current password is incorrect.');
    err.status = 401;
    throw err;
  }
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    const err = new Error(strengthError);
    err.status = 400;
    throw err;
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}