import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-markdown-preview/markdown.css';

export default function RichContent({ children, className = '' }) {
  if (!children?.trim()) return null;
  return (
    <div data-color-mode="dark" className={className}>
      <MDEditor.Markdown source={children} />
    </div>
  );
}
