import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { CreateStudyModal } from './StudiesView.jsx';

/** A new third section alongside Wall/Members inside ScriptoriumDetail
 * — mirrors the mockup's "Active Studies" sidebar list, scoped to
 * this Scriptorium. Any member can create a study within it (matches
 * the same "any member can contribute" pattern already used for
 * invites and wall posts), not just the Scriptorium's owner.
 */
export default function ScriptoriumStudiesTab({ scriptoriumId, isMember, onOpenStudy }) {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .listScriptoriumStudies(scriptoriumId)
      .then(setStudies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [scriptoriumId]);

  return (
    <div>
      {isMember && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-brass/90 px-3 py-1.5 text-xs font-medium text-ink hover:bg-brass"
          >
            + create a study
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {studies.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpenStudy(s.id)}
            className="block w-full rounded-md border border-rule bg-panel p-3 text-left hover:border-brass"
          >
            <div className="font-display text-sm text-parchment">{s.title}</div>
            {s.description && <div className="text-xs text-muted">{s.description}</div>}
          </button>
        ))}
        {!loading && studies.length === 0 && <p className="text-sm text-muted">No studies in this Scriptorium yet.</p>}
      </div>

      {showCreateModal && (
        // Reuses the same CreateStudyModal built for the global Studies
        // page, pre-filled with this Scriptorium so the leader doesn't
        // have to pick it again from a dropdown.
        <CreateStudyModal
          defaultScriptoriumId={scriptoriumId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            refresh();
            onOpenStudy(id);
          }}
        />
      )}
    </div>
  );
}