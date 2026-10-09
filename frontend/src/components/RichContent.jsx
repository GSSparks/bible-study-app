import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-markdown-preview/markdown.css';
import { rehypeVerseRefs } from '../utils/rehypeVerseRefs.js';

export default function RichContent({ children, className = '', colorMode = 'dark', onVerseClick }) {
  if (!children?.trim()) return null;

  function handleClick(e) {
    if (!onVerseClick) return;
    const ref = e.target.closest('.verse-ref')?.dataset?.ref;
    if (ref) onVerseClick(ref);
  }

  return (
    <div
      data-color-mode={colorMode}
      className={className}
      onClick={onVerseClick ? handleClick : undefined}
    >
      <MDEditor.Markdown
        source={children}
        rehypePlugins={onVerseClick ? [[rehypeVerseRefs]] : []}
      />
    </div>
  );
}
