import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

export default function RichEditor({ value, onChange, height = 260 }) {
  return (
    <div data-color-mode="dark">
      <MDEditor value={value} onChange={(v) => onChange(v || '')} height={height} preview="edit" />
    </div>
  );
}
