import { useRef, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-markdown-preview/markdown.css';
import { rehypeVerseRefs } from '../utils/rehypeVerseRefs.js';
import VerseHoverCard from './VerseHoverCard.jsx';

export default function RichContent({ children, className = '', colorMode = 'dark', onVerseClick, onNavigate, bibleModule }) {
  const [hovered, setHovered] = useState(null); // { ref, rect }
  const closeTimer = useRef(null);

  if (!children?.trim()) return null;

  function scheduleClose() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(null), 150);
  }

  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

  function handleClick(e) {
    if (!onVerseClick) return;
    const ref = e.target.closest('.verse-ref')?.dataset?.ref;
    if (ref) onVerseClick(ref);
  }

  function handleMouseOver(e) {
    const span = e.target.closest('.verse-ref');
    if (span) {
      cancelClose();
      const ref = span.dataset.ref;
      if (hovered?.ref !== ref) {
        setHovered({ ref, rect: span.getBoundingClientRect() });
      }
    } else if (hovered) {
      scheduleClose();
    }
  }

  const wantRefs = Boolean(onVerseClick || bibleModule);

  return (
    <>
      <div
        data-color-mode={colorMode}
        className={className}
        onClick={onVerseClick ? handleClick : undefined}
        onMouseOver={bibleModule ? handleMouseOver : undefined}
        onMouseLeave={bibleModule ? scheduleClose : undefined}
      >
        <MDEditor.Markdown
          source={children}
          rehypePlugins={wantRefs ? [[rehypeVerseRefs]] : []}
        />
      </div>
      {hovered && bibleModule && (
        <VerseHoverCard
          refStr={hovered.ref}
          rect={hovered.rect}
          bibleModule={bibleModule}
          onNavigate={onNavigate ?? onVerseClick}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
}
