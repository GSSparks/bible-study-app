const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
  search: (q, module) => request(`/search?q=${encodeURIComponent(q)}${module ? `&module=${module}` : ''}`),

  // Notes / highlights / bookmarks
  listNotes: ({ reference, q } = {}) => {
    const params = new URLSearchParams();
    if (reference) params.set('reference', reference);
    if (q) params.set('q', q);
    const qs = params.toString();
    return request(`/notes${qs ? `?${qs}` : ''}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (note) => request('/notes', { method: 'POST', body: JSON.stringify(note) }),
  updateNote: (id, patch) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  listHighlights: (reference) => request(`/notes/highlights?reference=${encodeURIComponent(reference)}`),
  createHighlight: (h) => request('/notes/highlights', { method: 'POST', body: JSON.stringify(h) }),

  // PDF library
  listDocuments: () => request('/pdf'),
  documentFileUrl: (id) => `${BASE}/pdf/${id}/file`,

  // Strong's / dictionary & lexicon browsing
  getStrongsEntry: (key) => request(`/strongs/${encodeURIComponent(key)}`),
  listDictionaryKeys: (module) => request(`/dictionary/${encodeURIComponent(module)}/keys`),
  getDictionaryEntry: (module, key) =>
    request(`/dictionary/${encodeURIComponent(module)}/entry?key=${encodeURIComponent(key)}`),

  // Study assistant
  buildContext: (payload) => request('/context/build', { method: 'POST', body: JSON.stringify(payload) }),
  askAssistant: (payload) => request('/context/ask', { method: 'POST', body: JSON.stringify(payload) }),
  listRecentSessions: () => request('/context/sessions'),
  buildWordStudyContext: (payload) => request('/word-study', { method: 'POST', body: JSON.stringify(payload) }),
  askWordStudy: (payload) => request('/word-study/ask', { method: 'POST', body: JSON.stringify(payload) }),
  buildPhraseStudyContext: (payload) => request('/phrase-study', { method: 'POST', body: JSON.stringify(payload) }),
  askPhraseStudy: (payload) => request('/phrase-study/ask', { method: 'POST', body: JSON.stringify(payload) }),
  savePersonalModule: (payload) => request('/personal-modules/save', { method: 'POST', body: JSON.stringify(payload) }),

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

  // Branding
  getBranding: () => request('/branding'),
  setBranding: (name) => request('/branding', { method: 'POST', body: JSON.stringify({ name }) }),

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
  removeScriptoriumMember: (id, membershipId) => request(`/scriptoriums/${id}/members/${membershipId}`, { method: 'DELETE' }),
  inviteToScriptorium: (id, username) => request(`/scriptoriums/${id}/invite`, { method: 'POST', body: JSON.stringify({ username }) }),
  acceptScriptoriumInvite: (inviteId) => request(`/scriptoriums/invites/${inviteId}/accept`, { method: 'POST' }),
  declineScriptoriumInvite: (inviteId) => request(`/scriptoriums/invites/${inviteId}/decline`, { method: 'POST' }),

  // Wall
  getHomeFeed: () => request('/wall/feed'),
  getMyWall: () => request('/wall/me'),
  getUserWall: (username) => request(`/wall/user/${encodeURIComponent(username)}`),
  getScriptoriumWall: (id) => request(`/wall/scriptorium/${id}`),
  createPost: ({ body, scriptoriumId }) => request('/wall/posts', { method: 'POST', body: JSON.stringify({ body, scriptoriumId }) }),
  deletePost: (id) => request(`/wall/posts/${id}`, { method: 'DELETE' }),
  createComment: (postId, body) => request(`/wall/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteComment: (id) => request(`/wall/comments/${id}`, { method: 'DELETE' }),

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

  listStudyComments: (lessonId) => request(`/studies/lessons/${lessonId}/comments`),
  createStudyComment: (lessonId, body) => request(`/studies/lessons/${lessonId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteStudyComment: (commentId) => request(`/studies/comments/${commentId}`, { method: 'DELETE' }),
  likeStudyComment: (commentId) => request(`/studies/comments/${commentId}/like`, { method: 'POST' }),
  unlikeStudyComment: (commentId) => request(`/studies/comments/${commentId}/like`, { method: 'DELETE' }),

  listStudyResources: (studyId) => request(`/studies/${studyId}/resources`),
  addStudyResource: (studyId, payload) => request(`/studies/${studyId}/resources`, { method: 'POST', body: JSON.stringify(payload) }),
  removeStudyResource: (resourceId) => request(`/studies/resources/${resourceId}`, { method: 'DELETE' }),
  getStudyResourceContent: (lessonId, resourceId) => request(`/studies/lessons/${lessonId}/resources/${resourceId}`),
};