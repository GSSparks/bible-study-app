import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../api/client.js';

// Helper that builds a mock fetch response
function mockOkResponse(data) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  };
}

function mockErrorResponse(status, errorBody) {
  return {
    ok: false,
    status,
    json: async () => errorBody,
  };
}

describe('API client', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue(mockOkResponse({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  describe('api.me()', () => {
    it('calls GET /api/auth/me', async () => {
      const userData = { id: 1, username: 'alice' };
      global.fetch.mockResolvedValue(mockOkResponse(userData));

      const result = await api.me();

      expect(global.fetch).toHaveBeenCalledOnce();
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/auth/me');
      expect(opts?.method).toBeUndefined(); // default GET — no method key
      expect(result).toEqual(userData);
    });
  });

  describe('api.login()', () => {
    it('calls POST /api/auth/login with the correct JSON body', async () => {
      const responseData = { id: 1, username: 'alice' };
      global.fetch.mockResolvedValue(mockOkResponse(responseData));

      const credentials = { username: 'alice', password: 'secret123' };
      await api.login(credentials);

      expect(global.fetch).toHaveBeenCalledOnce();
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/auth/login');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(credentials);
      expect(opts.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('api.logout()', () => {
    it('calls POST /api/auth/logout', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });

      await api.logout();

      expect(global.fetch).toHaveBeenCalledOnce();
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/auth/logout');
      expect(opts.method).toBe('POST');
    });
  });

  // -------------------------------------------------------------------------
  // Notes
  // -------------------------------------------------------------------------

  describe('api.listNotes()', () => {
    it('calls GET /api/notes with no query string when called with empty object', async () => {
      global.fetch.mockResolvedValue(mockOkResponse([]));

      await api.listNotes({});

      const [url] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/notes');
    });

    it('calls GET /api/notes?reference=... when reference is provided', async () => {
      global.fetch.mockResolvedValue(mockOkResponse([]));

      await api.listNotes({ reference: 'John 3:16' });

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/notes?');
      expect(url).toContain('reference=');
    });
  });

  describe('api.createNote()', () => {
    it('calls POST /api/notes with JSON body', async () => {
      const note = { reference: 'John 3:16', body: 'God so loved', title: 'For God' };
      global.fetch.mockResolvedValue(mockOkResponse({ id: 42, ...note }));

      await api.createNote(note);

      expect(global.fetch).toHaveBeenCalledOnce();
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/notes');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(note);
    });
  });

  // -------------------------------------------------------------------------
  // Highlights
  // -------------------------------------------------------------------------

  describe('api.listHighlights()', () => {
    it('calls GET /api/notes/highlights with reference query param', async () => {
      global.fetch.mockResolvedValue(mockOkResponse([]));

      await api.listHighlights({ reference: 'John 3:16' });

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/notes/highlights');
      expect(url).toContain('reference=');
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('reference')).toBe('John 3:16');
    });
  });

  // -------------------------------------------------------------------------
  // Bible Maps
  // -------------------------------------------------------------------------

  describe('api.getAllMaps()', () => {
    it('calls GET /api/bible-maps/all', async () => {
      global.fetch.mockResolvedValue(mockOkResponse([]));

      await api.getAllMaps();

      const [url] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/bible-maps/all');
    });
  });

  describe('api.getMapsForReference()', () => {
    it('calls GET /api/bible-maps/for-reference with encoded ref param', async () => {
      global.fetch.mockResolvedValue(mockOkResponse([]));

      await api.getMapsForReference('John 3:16');

      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/api/bible-maps/for-reference');
      expect(url).toContain('ref=');
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('ref')).toBe('John 3:16');
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('rejects with the error message from the JSON body when fetch returns non-ok', async () => {
      global.fetch.mockResolvedValue(
        mockErrorResponse(400, { error: 'Invalid reference' })
      );

      await expect(api.me()).rejects.toThrow('Invalid reference');
    });

    it('rejects with a generic message when error body has no error field', async () => {
      global.fetch.mockResolvedValue(
        mockErrorResponse(500, {})
      );

      await expect(api.me()).rejects.toThrow('Request failed: 500');
    });

    it('rejects when fetch itself throws (network error)', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(api.me()).rejects.toThrow('Network error');
    });
  });

  // -------------------------------------------------------------------------
  // Content-Type header
  // -------------------------------------------------------------------------

  describe('Content-Type header', () => {
    it('sets Content-Type: application/json for JSON POST requests', async () => {
      global.fetch.mockResolvedValue(mockOkResponse({}));

      await api.createNote({ reference: 'Gen 1:1', body: 'In the beginning' });

      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('does NOT set Content-Type for FormData requests', async () => {
      global.fetch.mockResolvedValue(mockOkResponse({}));

      // createPost uses FormData internally
      await api.createPost({ body: 'Hello world' });

      const [, opts] = global.fetch.mock.calls[0];
      // When body is FormData, no Content-Type header is set (browser sets it
      // with the multipart boundary automatically).
      expect(opts.headers?.['Content-Type']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 204 No Content
  // -------------------------------------------------------------------------

  describe('204 No Content', () => {
    it('returns null for 204 responses', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });

      const result = await api.logout();
      expect(result).toBeNull();
    });
  });
});
