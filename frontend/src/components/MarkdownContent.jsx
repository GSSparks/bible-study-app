import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownContent({ children, className = '' }) {
  return (
    <div className={`markdown-body ${className}`.trim()}>
      <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
    </div>
  );
}
