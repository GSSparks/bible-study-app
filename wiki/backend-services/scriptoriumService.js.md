# backend/src/services/scriptoriumService.js

## Purpose

Manages the full lifecycle of Scriptoriums (study groups) and their social features: creation, discovery, membership, invitations, shared resources, and member management. Scriptoriums have a `visibility` of `public` or `private`; private ones are completely invisible to non-members at every query point. Invitations flow through the Fellows graph — only Fellows can be invited.

## Key exports

- **`areFellows(userIdA, userIdB)`** — Checks both directions of the `Connection` table for an accepted row between two users.
- **`createScriptorium(ownerId, { name, description, visibility })`** — Creates the Scriptorium and its owner's membership row in a single transaction so the owner is always also a member.
- **`listPublicScriptoriums(userId)`** — Returns all public Scriptoriums annotated with `isMember` and `memberCount` (one batch query per result set, not per entry).
- **`listMyScriptoriums(userId)`** — Returns all Scriptoriums the caller belongs to, including private ones, with `myRole` and `memberCount`.
- **`getScriptorium(scriptoriumId, userId)`** — Fetches a single Scriptorium. Returns 404 (not 403) for private ones when the caller is not a member, to avoid leaking existence. Returns `isMember` and `myRole` for use by callers who need to gate further actions.
- **`listMembers(scriptoriumId, userId)`** — Lists members after the same visibility check as `getScriptorium`.
- **`joinPublicScriptorium(scriptoriumId, userId)`** — Adds a member row; 404s for private Scriptoriums rather than 403.
- **`leaveScriptorium(scriptoriumId, userId)`** — Removes the caller's membership. Blocks the owner from leaving (they must delete instead).
- **`deleteScriptorium(scriptoriumId, userId)`** — Owner-only; deletes the Scriptorium and cascades memberships and invites.
- **`updateScriptorium(scriptoriumId, userId, { name, description, visibility, tags, about, weeklyVerse })`** — Owner-only update; normalizes tags (lowercase, deduplicated, max 20).
- **`listResources(scriptoriumId, userId)`** / **`addResource(...)`** / **`removeResource(...)`** — Manage the Scriptorium's shared resource list. Adding requires membership; removing requires being either the owner or the original adder.
- **`removeMember(scriptoriumId, callerId, membershipId)`** — Owner-only member removal; blocks removing the owner themselves.
- **`inviteToScriptorium(scriptoriumId, inviterId, inviteeUsername)`** — Requires the inviter to be a member and the invitee to be a Fellow. Re-inviting after a decline resets the row to pending.
- **`listMyInvites(userId)`** — Returns pending invitations with Scriptorium name/description and inviter username included.
- **`respondToInvite(userId, inviteId, accept)`** — Accepts or declines an invite. Accepting creates the membership in the same transaction as updating the invite status.

## Dependencies

- **Prisma models:** `Scriptorium`, `ScriptoriumMembership`, `ScriptoriumInvite`, `ScriptoriumResource`, `Connection`, `User`

## Patterns / notes

- **Consistent 404 masking:** Every function that touches a private Scriptorium returns 404 (not 403) for non-member callers, throughout the service — this includes `getScriptorium`, `joinPublicScriptorium`, `inviteToScriptorium`, and `respondToInvite`. The pattern is explicitly documented at each site.
- **Owner-is-member via transaction:** `createScriptorium` and `respondToInvite` (accept path) use Prisma transactions to ensure the two related rows are never out of sync.
- **`areFellows` as invite gate:** Invitations are restricted to Fellows, enforced by calling `areFellows` inside `inviteToScriptorium`. This function is also exported for use in `wallService`.
- **Field validation:** `validateFields` enforces name/description length and visibility enum on both `createScriptorium` and `updateScriptorium`.
