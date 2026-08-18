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
  buildWordStudyContext: (payload) => request('/word-study', { method: 'POST', body: JSON.stringify(payload) }),
  askWordStudy: (payload) => request('/word-study/ask', { method: 'POST', body: JSON.stringify(payload) }),
  savePersonalModule: (payload) => request('/personal-modules/save', { method: 'POST', body: JSON.stringify(payload) }),
};