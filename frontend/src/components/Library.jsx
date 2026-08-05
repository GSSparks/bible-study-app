import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Library() {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.listDocuments().then(setDocs).catch((e) => setError(e.message));
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name.replace(/\.pdf$/i, ''));
      const res = await fetch('/api/pdf', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-parchment">Library</h3>
        <label className="cursor-pointer rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass">
          {uploading ? 'uploading…' : 'Upload PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {docs.map((d) => (
          <a
            key={d.id}
            href={api.documentFileUrl(d.id)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-rule px-3 py-2 text-sm hover:border-brass"
          >
            <div className="text-parchment">{d.title}</div>
            <div className="text-xs text-muted">
              {d.author || 'Unknown author'} {d.pageCount ? `· ${d.pageCount}p` : ''}
            </div>
          </a>
        ))}
        {docs.length === 0 && <p className="text-sm text-muted">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}
