# backend/src/routes/scriptoriums.js

## Purpose

Manages Scriptoriums — the platform's study groups. Provides the full lifecycle: creating groups, browsing public ones, joining/leaving, updating settings, member management, invite workflows, and shared resource lists. Authorization within operations (e.g., only owners can update or kick members) is enforced inside `scriptoriumService`. The entire router is gated behind login.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scriptoriums/public` | Lists public Scriptoriums the current user has not yet joined |
| GET | `/api/scriptoriums/mine` | Lists Scriptoriums the current user is a member of |
| GET | `/api/scriptoriums/invites` | Lists pending invitations for the current user |
| POST | `/api/scriptoriums/invites/:inviteId/accept` | Accepts a pending invite |
| POST | `/api/scriptoriums/invites/:inviteId/decline` | Declines a pending invite |
| POST | `/api/scriptoriums` | Creates a new Scriptorium; body: `{ name, description?, visibility }` |
| GET | `/api/scriptoriums/:id` | Returns details for a Scriptorium (membership-gated inside service) |
| GET | `/api/scriptoriums/:id/members` | Lists members of a Scriptorium |
| POST | `/api/scriptoriums/:id/join` | Joins a public Scriptorium |
| POST | `/api/scriptoriums/:id/leave` | Leaves a Scriptorium |
| PUT | `/api/scriptoriums/:id` | Updates name, description, visibility, tags, about text, and weeklyVerse; owner-only (enforced in service) |
| DELETE | `/api/scriptoriums/:id` | Deletes a Scriptorium; owner-only (enforced in service) |
| DELETE | `/api/scriptoriums/:id/members/:membershipId` | Removes a member; owner-only (enforced in service) |
| POST | `/api/scriptoriums/:id/invite` | Invites a user by username; body: `{ username }` |
| GET | `/api/scriptoriums/:id/resources` | Lists shared resources for the Scriptorium |
| POST | `/api/scriptoriums/:id/resources` | Adds a resource; body: `{ type, label, url?, body? }` |
| DELETE | `/api/scriptoriums/:id/resources/:resourceId` | Removes a resource |

## Auth

`scriptoriumsRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. Ownership and membership authorization is handled inside `scriptoriumService`.

## Dependencies

- `scriptoriumService` — `createScriptorium`, `listPublicScriptoriums`, `listMyScriptoriums`, `getScriptorium`, `listMembers`, `joinPublicScriptorium`, `leaveScriptorium`, `deleteScriptorium`, `updateScriptorium`, `removeMember`, `inviteToScriptorium`, `listMyInvites`, `respondToInvite`, `listResources`, `addResource`, `removeResource`
