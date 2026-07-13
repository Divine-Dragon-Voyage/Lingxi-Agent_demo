import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface Props { value: string; onChange: (html: string, text: string) => void; }

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML(), instance.getText()),
    editorProps: { attributes: { class: 'tiptap-editor', 'aria-label': '流程内容编辑器' } },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;
  return <div>
    <div className="editor-toolbar" role="toolbar" aria-label="富文本格式工具栏">
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="一级标题">H1</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="二级标题">H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="三级标题">H3</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="有序列表">1.</button>
      <button type="button" onClick={() => editor.chain().focus().undo().run()} aria-label="撤销">↶</button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} aria-label="重做">↷</button>
    </div>
    <EditorContent editor={editor} />
  </div>;
}
