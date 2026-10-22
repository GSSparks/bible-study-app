# frontend/src/api/client.js

**Purpose**

This is the single centralized API client for all backend communication. It exports one object (`api`) whose methods map one-to-one with every backend route. Every call goes through the private `request()` wrapper, which: prefixes the path with `/api`, automatically sets `Content-Type: application/json` for non-FormData bodies, throws a descriptive `Error` on non-2xx responses (using the server's `error` field when available), and returns `null` for 204 No Content responses. FormData bodies (file uploads) bypass the JSON header so the browser can set the correct `multipart/form-data` boundary automatically.

**Key exports / contents**

- `api` — named export object with methods organized by domain:
  - **Modules**: `listInstalledModules`, `listRepositories`, `listAvailableModules`, `installModule`, `removeModule`
  - **Bible text**: `getPassage`, `comparePassage`
  - **Search**: `search`
  - **Notes / highlights / bookmarks**: `listNotes`, `getNote`, `createNote`, `updateNote`, `deleteNote`, `listHighlights`, `createHighlight`, `deleteHighlight`, `listBookmarks`, `createBookmark`, `updateBookmark`, `deleteBookmark`
  - **PDF library**: `listDocuments`, `getDocument`, `searchDocuments`, `updateDocument`, `deleteDocument`, `ocrDocument`, `documentFileUrl`
  - **Topic / Codex**: `searchTopics`, `getWikipediaEntry`, `getMerriamEntry`, `getCodexSummary`
  - **Admin Codex cache**: `listCodexCache`, `deleteCodexEntry`, `exportCodexModule`
  - **Strong's / dictionary**: `getStrongsEntry`, `listDictionaryKeys`, `getDictionaryEntry`
  - **Books (RawGenBook)**: `listInstalledBooks`, `getBookContent`, `getBookKeys`, `getBookEntry`
  - **Study assistant**: `buildContext`, `askAssistant`, `listRecentSessions`, `getGuideForReference`, `renameSession`, `buildWordStudyContext`, `askWordStudy`, `buildPhraseStudyContext`, `askPhraseStudy`, `savePersonalModule`, `getCommentaryEntry`, `saveCommentaryNote`
  - **User profiles**: `getUserProfile`, `updateMyProfile`
  - **Auth**: `bootstrapStatus`, `me`, `bootstrap`, `login`, `logout`, `changePassword`, `createUser`, `listUsers`
  - **Admin**: `getAdminMetrics`, `listModuleVisibility`, `setModuleVisibility`, `listAdminPosts`, `deleteAdminPost`, `listAdminMedia`, `deleteAdminMedia`
  - **Branding**: `getBranding`, `setBranding`
  - **Connections (Fellows)**: `searchConnections`, `listConnections`, `listConnectionRequests`, `listSentConnectionRequests`, `sendConnectionRequest`, `acceptConnectionRequest`, `declineConnectionRequest`, `removeConnection`
  - **Scriptoriums**: `listPublicScriptoriums`, `listMyScriptoriums`, `listScriptoriumInvites`, `getScriptorium`, `listScriptoriumMembers`, `createScriptorium`, `joinScriptorium`, `leaveScriptorium`, `updateScriptorium`, `deleteScriptorium`, `removeScriptoriumMember`, `inviteToScriptorium`, `acceptScriptoriumInvite`, `declineScriptoriumInvite`, `listScriptoriumResources`, `addScriptoriumResource`, `removeScriptoriumResource`
  - **Study research**: `listStudyGroupFindings`, `listStudyGroupHighlights`, `listStudyPosts`, `createStudyPost`, `createStudyReply`, `deleteStudyPost`, `createStudyHighlight`, `deleteStudyHighlight`
  - **Wall / social**: `getHomeFeed`, `getMyWall`, `getUserWall`, `getScriptoriumWall`, `createPost`, `deletePost`, `createComment`, `deleteComment`
  - **Media uploads**: `uploadAvatar`, `uploadUserBanner`, `uploadScriptoriumBanner`, `generateScriptoriumBanner`, `generateStudyBanner`, `uploadStudyBanner`, `uploadLessonVideo`, `removeLessonVideo`
  - **Studies / lessons**: full CRUD plus `markStudyLessonComplete`, `unmarkStudyLessonComplete`, `getStudyProgress`, `saveStudyLessonReflection`, `bulkCreateStudyLessons`, `generateStudyLessonDrafts`, study comments/likes, `exportStudy`, `importStudy`
  - **Devotionals**: `getTodaysDevotional`, `listDevotionalModules`, `setDevotionalModule`, `debugDevotional`
  - **Reading plans**: `listReadingPlans`, `getReadingPlan`, `createReadingPlan`, `updateReadingPlan`, `deleteReadingPlan`, `getReadingPlanProgress`, `markReadingPlanDay`, `unmarkReadingPlanDay`, `resetReadingPlanProgress`
  - **Study resources**: `listStudyReflections`, `listStudyResources`, `addStudyResource`, `removeStudyResource`, `getStudyResourceContent`
  - **Bible maps**: `getAllMaps`, `getMapsForReference`
- `documentFileUrl(id)` — returns a plain URL string (not a fetch call) for direct `<a href>` / `<iframe src>` use.

**Dependencies / relationships**

- No external imports — uses the browser's built-in `fetch` and `FormData`.
- Consumed by virtually every component in the frontend; the canonical import is `import { api } from '../api/client.js'` (or similar relative path).
- Tested in `frontend/src/__tests__/api/client.test.js`.

**Notes**

- The base path is `/api`, which Vite's dev server proxies to `http://localhost:8088` (see `vite.config.js`).
- Two methods bypass the `request()` wrapper to get raw `Response` objects for blob downloads: `exportCodexModule` and `exportStudy`. Both do their own `res.ok` check and return a `Blob` (or `{ blob, filename }`).
- `createPost` is the only social/wall method that uses `FormData` (to support optional media file attachments).
