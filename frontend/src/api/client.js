const BASE = '/api';

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Modules
  listInstalledModules: (type = 'BIBLE') => request(`/modules/installed?type=${type}`),
  listRepositories: () => request('/modules/repositories'),
  listAvailableModules: (repo, type = 'BIBLE') =>
    request(`/modules/available?repo=${encodeURIComponent(repo)}&type=${type}`),
  installModule: (repo, moduleCode) =>
    request('/modules/install', { method: 'POST', body: JSON.stringify({ repo, moduleCode }) }),
  removeModule: (moduleCode) => request(`/modules/${encodeURIComponent(moduleCode)}`, { method: 'DELETE' }),

  // Bible text
  getPassage: (module, ref) => request(`/bible/${encodeURIComponent(module)}/passage?ref=${encodeURIComponent(ref)}`),
  comparePassage: (modules, ref) => request('/bible/compare', { method: 'POST', body: JSON.stringify({ modules, ref }) }),

  // Search
  search: (q, module, searchType = 'multiWord') => {
    const params = new URLSearchParams({ q, searchType });
    if (module) params.set('module', module);
    return request(`/search?${params}`);
  },

  // Notes / highlights / bookmarks
  listNotes: ({ reference, prefix, q } = {}) => {
    const params = new URLSearchParams();
    if (reference) params.set('reference', reference);
    else if (prefix) params.set('prefix', prefix);
    if (q) params.set('q', q);
    const qs = params.toString();
    return request(`/notes${qs ? `?${qs}` : ''}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (note) => request('/notes', { method: 'POST', body: JSON.stringify(note) }),
  updateNote: (id, patch) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  listHighlights: ({ reference, prefix } = {}) => {
    const params = new URLSearchParams();
    if (reference) params.set('reference', reference);
    if (prefix) params.set('prefix', prefix);
    return request(`/notes/highlights?${params}`);
  },
  createHighlight: (h) => request('/notes/highlights', { method: 'POST', body: JSON.stringify(h) }),
  deleteHighlight: (id) => request(`/notes/highlights/${id}`, { method: 'DELETE' }),
  listBookmarks: ({ reference, module } = {}) => {
    const params = new URLSearchParams();
    if (reference) params.set('reference', reference);
    if (module) params.set('module', module);
    const qs = params.toString();
    return request(`/notes/bookmarks${qs ? `?${qs}` : ''}`);
  },
  createBookmark: (b) => request('/notes/bookmarks', { method: 'POST', body: JSON.stringify(b) }),
  updateBookmark: (id, patch) => request(`/notes/bookmarks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteBookmark: (id) => request(`/notes/bookmarks/${id}`, { method: 'DELETE' }),

  // PDF library
  listDocuments: () => request('/pdf'),
  getDocument: (id) => request(`/pdf/${id}`),
  searchDocuments: (q) => request(`/pdf/search?q=${encodeURIComponent(q)}`),
  updateDocument: (id, patch) => request(`/pdf/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteDocument: (id) => request(`/pdf/${id}`, { method: 'DELETE' }),
  ocrDocument: (id) => request(`/pdf/${id}/ocr`, { method: 'POST' }),
  documentFileUrl: (id) => `${BASE}/pdf/${id}/file`,

  // Topic / Codex cross-module search
  searchTopics: (q) => request(`/topics?q=${encodeURIComponent(q)}`),
  getWikipediaEntry: (q) => request(`/wikipedia?q=${encodeURIComponent(q)}`),
  getMerriamEntry: (q) => request(`/merriam?q=${encodeURIComponent(q)}`),
  getCodexSummary: (q) => request(`/codex/summary?q=${encodeURIComponent(q)}`),

  // Admin: Codex cache management
  listCodexCache: () => request('/admin/codex'),
  deleteCodexEntry: (id) => request(`/admin/codex/${id}`, { method: 'DELETE' }),
  exportCodexModule: async () => {
    const res = await fetch('/api/admin/codex/export');
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },

  // Strong's / dictionary & lexicon browsing
  getStrongsEntry: (key) => request(`/strongs/${encodeURIComponent(key)}`),
  listDictionaryKeys: (module) => request(`/dictionary/${encodeURIComponent(module)}/keys`),
  getDictionaryEntry: (module, key) =>
    request(`/dictionary/${encodeURIComponent(module)}/entry?key=${encodeURIComponent(key)}`),

  // Books (SWORD RawGenBook modules)
  listInstalledBooks: () => request('/books/installed'),
  getBookContent: (module) => request(`/books/${encodeURIComponent(module)}/content`),
  getBookKeys: (module) => request(`/books/${encodeURIComponent(module)}/keys`),
  getBookEntry: (module, key) =>
    request(`/books/${encodeURIComponent(module)}/entry?key=${encodeURIComponent(key)}`),

  // Study assistant
  buildContext: (payload) => request('/context/build', { method: 'POST', body: JSON.stringify(payload) }),
  askAssistant: (payload) => request('/context/ask', { method: 'POST', body: JSON.stringify(payload) }),
  listRecentSessions: () => request('/context/sessions'),
  getGuideForReference: (reference) => request(`/context/guide/${encodeURIComponent(reference)}`),
  renameSession: (id, title) => request(`/context/sessions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  buildWordStudyContext: (payload) => request('/word-study', { method: 'POST', body: JSON.stringify(payload) }),
  askWordStudy: (payload) => request('/word-study/ask', { method: 'POST', body: JSON.stringify(payload) }),
  buildPhraseStudyContext: (payload) => request('/phrase-study', { method: 'POST', body: JSON.stringify(payload) }),
  askPhraseStudy: (payload) => request('/phrase-study/ask', { method: 'POST', body: JSON.stringify(payload) }),
  savePersonalModule: (payload) => request('/personal-modules/save', { method: 'POST', body: JSON.stringify(payload) }),
  getCommentaryEntry: (reference) => request(`/personal-modules/commentary-entry?reference=${encodeURIComponent(reference)}`),
  saveCommentaryNote: ({ reference, title, bodyMd }) =>
    request('/personal-modules/commentary-entry', { method: 'PUT', body: JSON.stringify({ reference, title, bodyMd }) }),

  // User profiles
  getUserProfile: (username) => request(`/users/${encodeURIComponent(username)}`),
  updateMyProfile: (payload) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Auth
  bootstrapStatus: () => request('/auth/bootstrap-status'),
  me: () => request('/auth/me'),
  bootstrap: (payload) => request('/auth/bootstrap', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  createUser: (payload) => request('/auth/users', { method: 'POST', body: JSON.stringify(payload) }),
  listUsers: () => request('/auth/users'),

  // Admin
  getAdminMetrics: () => request('/admin/metrics'),
  listModuleVisibility: (type) => request(`/admin/modules/visibility?type=${type}`),
  setModuleVisibility: (moduleCode, availableToUsers) =>
    request(`/admin/modules/${encodeURIComponent(moduleCode)}/visibility`, {
      method: 'POST',
      body: JSON.stringify({ availableToUsers }),
    }),
  listAdminPosts: () => request('/admin/posts'),
  deleteAdminPost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
  listAdminMedia: () => request('/admin/media'),
  deleteAdminMedia: (data) => request('/admin/media', { method: 'DELETE', body: JSON.stringify(data) }),

  // Branding
  getBranding: () => request('/branding'),
  setBranding: (name) => request('/branding', { method: 'POST', body: JSON.stringify({ name }) }),
  getBrandingSettings: () => request('/branding/settings'),
  saveBrandingSettings: (payload) => request('/branding/settings', { method: 'POST', body: JSON.stringify(payload) }),

  // Connections (Fellows)
  searchConnections: (q) => request(`/connections/search?q=${encodeURIComponent(q)}`),
  listConnections: () => request('/connections'),
  listConnectionRequests: () => request('/connections/requests'),
  listSentConnectionRequests: () => request('/connections/sent'),
  sendConnectionRequest: (username) => request('/connections', { method: 'POST', body: JSON.stringify({ username }) }),
  acceptConnectionRequest: (id) => request(`/connections/${id}/accept`, { method: 'POST' }),
  declineConnectionRequest: (id) => request(`/connections/${id}/decline`, { method: 'POST' }),
  removeConnection: (id) => request(`/connections/${id}`, { method: 'DELETE' }),

  // Scriptoriums
  listPublicScriptoriums: () => request('/scriptoriums/public'),
  listMyScriptoriums: () => request('/scriptoriums/mine'),
  listScriptoriumInvites: () => request('/scriptoriums/invites'),
  getScriptorium: (id) => request(`/scriptoriums/${id}`),
  listScriptoriumMembers: (id) => request(`/scriptoriums/${id}/members`),
  createScriptorium: (payload) => request('/scriptoriums', { method: 'POST', body: JSON.stringify(payload) }),
  joinScriptorium: (id) => request(`/scriptoriums/${id}/join`, { method: 'POST' }),
  leaveScriptorium: (id) => request(`/scriptoriums/${id}/leave`, { method: 'POST' }),
  updateScriptorium: (id, payload) => request(`/scriptoriums/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteScriptorium: (id) => request(`/scriptoriums/${id}`, { method: 'DELETE' }),
  setScriptoriumMemberRole: (id, membershipId, role) => request(`/scriptoriums/${id}/members/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeScriptoriumMember: (id, membershipId) => request(`/scriptoriums/${id}/members/${membershipId}`, { method: 'DELETE' }),
  inviteToScriptorium: (id, username) => request(`/scriptoriums/${id}/invite`, { method: 'POST', body: JSON.stringify({ username }) }),
  acceptScriptoriumInvite: (inviteId) => request(`/scriptoriums/invites/${inviteId}/accept`, { method: 'POST' }),
  declineScriptoriumInvite: (inviteId) => request(`/scriptoriums/invites/${inviteId}/decline`, { method: 'POST' }),
  listScriptoriumResources: (id) => request(`/scriptoriums/${id}/resources`),
  addScriptoriumResource: (id, payload) => request(`/scriptoriums/${id}/resources`, { method: 'POST', body: JSON.stringify(payload) }),
  removeScriptoriumResource: (id, resourceId) => request(`/scriptoriums/${id}/resources/${resourceId}`, { method: 'DELETE' }),

  // Study Research
  listStudyGroupFindings: (prefix) => request(`/studies/research/findings?prefix=${encodeURIComponent(prefix)}`),
  listStudyGroupHighlights: (prefix, module) => request(`/studies/research/highlights?prefix=${encodeURIComponent(prefix)}&module=${encodeURIComponent(module)}`),
  listStudyPosts: (studyId) => request(`/studies/${studyId}/posts`),
  createStudyPost: (studyId, { type, reference, module, title, body, mediaFiles = [] }) => {
    const fd = new FormData();
    if (type) fd.append('type', type);
    fd.append('body', body);
    if (reference) fd.append('reference', reference);
    if (module) fd.append('module', module);
    if (title) fd.append('title', title);
    mediaFiles.forEach((f) => fd.append('media', f));
    return request(`/studies/${studyId}/posts`, { method: 'POST', body: fd });
  },
  updateStudyPost: (postId, { body, title }) => request(`/studies/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ body, title }) }),
  createStudyReply: (postId, body) => request(`/studies/posts/${postId}/replies`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteStudyPost: (postId) => request(`/studies/posts/${postId}`, { method: 'DELETE' }),
  createStudyHighlight: (studyId, payload) => request(`/studies/${studyId}/research/highlights`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteStudyHighlight: (studyId, highlightId) => request(`/studies/${studyId}/research/highlights/${highlightId}`, { method: 'DELETE' }),

  // Wall
  getHomeFeed: () => request('/wall/feed'),
  getMyWall: () => request('/wall/me'),
  getUserWall: (username) => request(`/wall/user/${encodeURIComponent(username)}`),
  getScriptoriumWall: (id) => request(`/wall/scriptorium/${id}`),
  createPost: ({ body, scriptoriumId, mediaFiles }) => {
    const fd = new FormData();
    fd.append('body', body);
    if (scriptoriumId) fd.append('scriptoriumId', scriptoriumId);
    (mediaFiles || []).forEach((f) => fd.append('media', f));
    return request('/wall/posts', { method: 'POST', body: fd });
  },
  deletePost: (id) => request(`/wall/posts/${id}`, { method: 'DELETE' }),
  createComment: (postId, body) => request(`/wall/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteComment: (id) => request(`/wall/comments/${id}`, { method: 'DELETE' }),

  // Media uploads
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return request('/uploads/avatar', { method: 'POST', body: fd });
  },
  uploadUserBanner: (file) => {
    const fd = new FormData();
    fd.append('banner', file);
    return request('/uploads/banner/user', { method: 'POST', body: fd });
  },
  uploadScriptoriumBanner: (id, file) => {
    const fd = new FormData();
    fd.append('banner', file);
    return request(`/uploads/banner/scriptorium/${id}`, { method: 'POST', body: fd });
  },
  generateScriptoriumBanner: (id) => request(`/uploads/banner/ai/scriptorium/${id}`, { method: 'POST' }),
  generateStudyBanner: (id) => request(`/uploads/banner/ai/study/${id}`, { method: 'POST' }),

  uploadStudyBanner: (id, file) => {
    const fd = new FormData();
    fd.append('banner', file);
    return request(`/uploads/banner/study/${id}`, { method: 'POST', body: fd });
  },
  uploadLessonVideo: (lessonId, file) => {
    const fd = new FormData();
    fd.append('video', file);
    return request(`/uploads/video/lesson/${lessonId}`, { method: 'POST', body: fd });
  },
  removeLessonVideo: (lessonId) => request(`/uploads/video/lesson/${lessonId}`, { method: 'DELETE' }),

  // Studies
  listMyStudies: () => request('/studies/mine'),
  listScriptoriumStudies: (scriptoriumId) => request(`/studies/scriptorium/${scriptoriumId}`),
  getStudy: (id) => request(`/studies/${id}`),
  listStudyParticipants: (id) => request(`/studies/${id}/participants`),
  createStudy: (payload) => request('/studies', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudy: (id, payload) => request(`/studies/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStudy: (id) => request(`/studies/${id}`, { method: 'DELETE' }),
  joinStudy: (id) => request(`/studies/${id}/join`, { method: 'POST' }),
  leaveStudy: (id) => request(`/studies/${id}/leave`, { method: 'POST' }),

  listStudyLessons: (studyId) => request(`/studies/${studyId}/lessons`),
  getStudyLesson: (lessonId) => request(`/studies/lessons/${lessonId}`),
  createStudyLesson: (studyId, payload) => request(`/studies/${studyId}/lessons`, { method: 'POST', body: JSON.stringify(payload) }),
  bulkCreateStudyLessons: (studyId, lessons) =>
    request(`/studies/${studyId}/lessons/bulk`, { method: 'POST', body: JSON.stringify({ lessons }) }),
  updateStudyLesson: (lessonId, payload) => request(`/studies/lessons/${lessonId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStudyLesson: (lessonId) => request(`/studies/lessons/${lessonId}`, { method: 'DELETE' }),
  generateStudyLessonDrafts: (studyId, payload) =>
    request(`/studies/${studyId}/generate-lessons`, { method: 'POST', body: JSON.stringify(payload) }),

  markStudyLessonComplete: (lessonId) => request(`/studies/lessons/${lessonId}/complete`, { method: 'POST' }),
  unmarkStudyLessonComplete: (lessonId) => request(`/studies/lessons/${lessonId}/complete`, { method: 'DELETE' }),
  getStudyProgress: (studyId) => request(`/studies/${studyId}/progress`),
  saveStudyLessonReflection: (lessonId, body) => request(`/studies/lessons/${lessonId}/reflection`, { method: 'PUT', body: JSON.stringify({ body }) }),

  listStudyComments: (lessonId) => request(`/studies/lessons/${lessonId}/comments`),
  createStudyComment: (lessonId, body) => request(`/studies/lessons/${lessonId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteStudyComment: (commentId) => request(`/studies/comments/${commentId}`, { method: 'DELETE' }),
  likeStudyComment: (commentId) => request(`/studies/comments/${commentId}/like`, { method: 'POST' }),
  unlikeStudyComment: (commentId) => request(`/studies/comments/${commentId}/like`, { method: 'DELETE' }),

  // Devotionals
  getTodaysDevotional: () => request('/devotionals/today'),
  listDevotionalModules: () => request('/devotionals/modules'),
  setDevotionalModule: (moduleCode) => request('/devotionals/settings', { method: 'POST', body: JSON.stringify({ moduleCode }) }),
  debugDevotional: (moduleCode) => request(`/devotionals/debug${moduleCode ? `?module=${encodeURIComponent(moduleCode)}` : ''}`),

  // Reading plans
  listReadingPlans: () => request('/reading-plans'),
  getReadingPlan: (id) => request(`/reading-plans/${id}`),
  createReadingPlan: (data) => request('/reading-plans', { method: 'POST', body: JSON.stringify(data) }),
  updateReadingPlan: (id, data) => request(`/reading-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReadingPlan: (id) => request(`/reading-plans/${id}`, { method: 'DELETE' }),
  getReadingPlanProgress: (id) => request(`/reading-plans/${id}/progress`),
  markReadingPlanDay: (id, dayNumber) => request(`/reading-plans/${id}/progress`, { method: 'POST', body: JSON.stringify({ dayNumber }) }),
  unmarkReadingPlanDay: (id, dayNumber) => request(`/reading-plans/${id}/progress/${dayNumber}`, { method: 'DELETE' }),
  resetReadingPlanProgress: (id) => request(`/reading-plans/${id}/progress`, { method: 'DELETE' }),

  listStudyReflections: (studyId) => request(`/studies/${studyId}/reflections`),
  listStudyResources: (studyId) => request(`/studies/${studyId}/resources`),
  addStudyResource: (studyId, payload) => request(`/studies/${studyId}/resources`, { method: 'POST', body: JSON.stringify(payload) }),
  removeStudyResource: (resourceId) => request(`/studies/resources/${resourceId}`, { method: 'DELETE' }),
  getStudyResourceContent: (lessonId, resourceId) => request(`/studies/lessons/${lessonId}/resources/${resourceId}`),

  exportStudy: async (id) => {
    const res = await fetch(`/api/studies/${id}/export`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Export failed: ${res.status}`);
    }
    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename="([^"]+)"/);
    const filename = match?.[1] || `study-${id}.json`;
    return { blob, filename };
  },

  importStudy: (scriptoriumId, data) =>
    request('/studies/import', { method: 'POST', body: JSON.stringify({ scriptoriumId, data }) }),

  getAllMaps: () => request('/bible-maps/all'),
  getMapsForReference: (ref) =>
    request(`/bible-maps/for-reference?ref=${encodeURIComponent(ref)}`),
};