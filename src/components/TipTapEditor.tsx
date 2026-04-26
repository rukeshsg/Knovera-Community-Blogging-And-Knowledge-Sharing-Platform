"use client";
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Quote, List, ListOrdered, ImageIcon, Link as LinkIcon } from 'lucide-react'

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  const uploadImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.url) {
            editor.chain().focus().setImage({ src: data.url }).run();
          }
        } catch (error) {
          console.error('Image upload failed', error);
        }
      }
    };
    input.click();
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const buttons = [
    { icon: <Bold size={18} />, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: <Italic size={18} />, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { icon: <Strikethrough size={18} />, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike') },
    { icon: <Code size={18} />, action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: editor.isActive('codeBlock') },
    { icon: <Heading1 size={18} />, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { icon: <Heading2 size={18} />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { icon: <List size={18} />, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { icon: <ListOrdered size={18} />, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    { icon: <Quote size={18} />, action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--color-bg-secondary)] bg-[var(--background)] sticky top-0 z-10">
      {buttons.map((btn, index) => (
        <button
          key={index}
          onClick={(e) => { e.preventDefault(); btn.action(); }}
          className={`p-2 rounded hover:bg-[var(--color-bg-soft)] transition-colors ${btn.isActive ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
          type="button"
        >
          {btn.icon}
        </button>
      ))}
      <div className="w-px h-6 bg-[var(--color-bg-secondary)] mx-2"></div>
      <button type="button" onClick={(e) => { e.preventDefault(); setLink(); }} className={`p-2 rounded hover:bg-[var(--color-bg-soft)] transition-colors ${editor.isActive('link') ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
        <LinkIcon size={18} />
      </button>
      <button type="button" onClick={(e) => { e.preventDefault(); uploadImage(); }} className="p-2 rounded hover:bg-[var(--color-bg-soft)] transition-colors text-[var(--color-text-secondary)]">
        <ImageIcon size={18} />
      </button>
    </div>
  )
}

export default function TipTapEditor({ content, onChange }: { content: string, onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your story...' })
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert prose-headings:font-heading prose-a:text-[var(--color-primary)] prose-img:rounded-xl max-w-none focus:outline-none min-h-[500px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div className="border border-[var(--color-bg-secondary)] rounded-xl overflow-hidden bg-[var(--background)] shadow-sm">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
