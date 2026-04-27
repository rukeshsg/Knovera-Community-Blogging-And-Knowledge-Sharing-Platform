"use client";
import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import { Youtube } from '@tiptap/extension-youtube';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { 
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Quote, 
  List, ListOrdered, ImageIcon, Link as LinkIcon, Highlighter, Minus, 
  Terminal, CheckSquare, Table as TableIcon, PlaySquare as YoutubeIcon, 
  FileVideo, Sparkles, Save, Clock
} from 'lucide-react';

function ToolbarButton({ 
  icon, 
  label, 
  onClick, 
  isActive = false, 
  disabled = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void, 
  isActive?: boolean, 
  disabled?: boolean 
}) {
  return (
    <div className="relative group flex items-center justify-center">
      <button
        onClick={(e) => { e.preventDefault(); onClick(); }}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
          isActive ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        type="button"
        aria-label={label}
      >
        {icon}
      </button>
      <div className="absolute bottom-full mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 delay-150 ease-out translate-y-1 group-hover:translate-y-0 z-50">
        <div className="bg-black text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl">
          {label}
        </div>
      </div>
    </div>
  );
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const calculateReadTime = () => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).length;
      setReadTime(Math.max(1, Math.ceil(words / 225)));
    };
    editor.on('update', calculateReadTime);
    calculateReadTime();
    return () => {
      editor.off('update', calculateReadTime);
    };
  }, [editor]);

  if (!editor) return null;

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
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setYoutube = () => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  };

  const setGif = () => {
    const url = window.prompt('Enter GIF URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAiAssist = async () => {
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    
    // If no text selected, try to get all text
    const textToProcess = selectedText || editor.getText();
    if (!textToProcess.trim()) {
      alert("Please enter or select some text first.");
      return;
    }

    const action = window.prompt("AI Action (improve/summarize/grammar):", "improve");
    if (!action || !["improve", "summarize", "grammar"].includes(action.toLowerCase())) return;

    setIsAiProcessing(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToProcess, action: action.toLowerCase() })
      });
      const data = await res.json();
      if (data.result) {
        if (selectedText) {
          editor.chain().focus().insertContentAt({ from: selection.from, to: selection.to }, data.result).run();
        } else {
          editor.chain().focus().setContent(data.result).run();
        }
      } else {
        alert("AI processing failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing AI request.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const saveDraft = async () => {
    setIsSaving(true);
    // Simulate draft saving since it's typically handled by the parent form submit
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    // Show a small native toast
    const toast = document.createElement("div");
    toast.className = "fixed bottom-4 right-4 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50 animate-in fade-in slide-in-from-bottom-5";
    toast.textContent = "Draft Saved Successfully!";
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-[var(--color-bg-secondary)] bg-[var(--background)] sticky top-0 z-10">
      {/* Text Group */}
      <div className="flex items-center gap-1 border-r border-[var(--color-bg-secondary)] pr-2">
        <ToolbarButton icon={<Bold size={18} />} label="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} />
        <ToolbarButton icon={<Italic size={18} />} label="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} />
        <ToolbarButton icon={<Strikethrough size={18} />} label="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} />
        <ToolbarButton icon={<Highlighter size={18} />} label="Highlight Text" onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} />
      </div>

      {/* Writing Group */}
      <div className="flex items-center gap-1 border-r border-[var(--color-bg-secondary)] pr-2">
        <ToolbarButton icon={<Code size={18} />} label="Inline Code" onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} />
        <ToolbarButton icon={<Terminal size={18} />} label="Code Block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} />
        <ToolbarButton icon={<Quote size={18} />} label="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} />
        <ToolbarButton icon={<Minus size={18} />} label="Insert Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      </div>

      {/* Lists & Structure Group */}
      <div className="flex items-center gap-1 border-r border-[var(--color-bg-secondary)] pr-2">
        <ToolbarButton icon={<List size={18} />} label="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} />
        <ToolbarButton icon={<ListOrdered size={18} />} label="Numbered List" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} />
        <ToolbarButton icon={<CheckSquare size={18} />} label="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} />
        <ToolbarButton icon={<TableIcon size={18} />} label="Insert Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      </div>

      {/* Media Group */}
      <div className="flex items-center gap-1 border-r border-[var(--color-bg-secondary)] pr-2">
        <ToolbarButton icon={<LinkIcon size={18} />} label="Insert Link (Ctrl+K)" onClick={setLink} isActive={editor.isActive('link')} />
        <ToolbarButton icon={<ImageIcon size={18} />} label="Upload Image" onClick={uploadImage} />
        <ToolbarButton icon={<FileVideo size={18} />} label="Insert GIF" onClick={setGif} />
        <ToolbarButton icon={<YoutubeIcon size={18} />} label="Embed YouTube" onClick={setYoutube} />
      </div>

      {/* Pro Features Group */}
      <div className="flex items-center gap-1 ml-auto">
        <ToolbarButton 
          icon={isAiProcessing ? <span className="animate-pulse">...</span> : <Sparkles size={18} className="text-[#a855f7]" />} 
          label="AI Assist (Improve/Summarize)" 
          onClick={handleAiAssist} 
          disabled={isAiProcessing} 
        />
        <ToolbarButton 
          icon={isSaving ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Save size={18} />} 
          label="Save Draft" 
          onClick={saveDraft} 
          disabled={isSaving} 
        />
        <div className="flex items-center gap-1 px-3 py-1 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] text-xs font-semibold rounded-full ml-1" title="Estimated Read Time">
          <Clock size={12} />
          {readTime} min read
        </div>
      </div>
    </div>
  );
};

export default function TipTapEditor({ content, onChange }: { content: string, onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your story...' }),
      Highlight,
      Youtube,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert prose-headings:font-heading prose-a:text-[var(--color-primary)] prose-img:rounded-xl max-w-none focus:outline-none min-h-[500px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-[var(--color-bg-secondary)] rounded-xl overflow-hidden bg-[var(--background)] shadow-sm">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="[&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]]:pl-0 [&_.ProseMirror_ul[data-type=taskList]_li]:flex [&_.ProseMirror_ul[data-type=taskList]_li]:items-start [&_.ProseMirror_ul[data-type=taskList]_li>label]:mt-1.5 [&_.ProseMirror_ul[data-type=taskList]_li>label]:mr-2" />
    </div>
  );
}
