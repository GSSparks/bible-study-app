import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import DocumentReader from './DocumentReader.jsx';

export default function DocumentModal({ documentId, isLoggedIn, isAdmin, onAskAI, onClose, onDeleted, onRenamed }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 sm:items-center sm:justify-center sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden shadow-2xl sm:h-[92vh] sm:max-w-4xl sm:rounded-xl sm:border sm:border-pageBorder"
        onClick={(e) => e.stopPropagation()}
      >
        <DocumentReader
          documentId={documentId}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          onAskAI={onAskAI}
          onClose={onClose}
          onDeleted={onDeleted}
          onRenamed={onRenamed}
        />
      </div>
    </div>,
    document.body
  );
}
