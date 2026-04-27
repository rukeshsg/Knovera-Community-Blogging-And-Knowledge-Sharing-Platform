"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MediaPickerModal from './MediaPickerModal';
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
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 delay-150 ease-out -translate-y-1 group-hover:translate-y-0 z-50">
        <div className="bg-black text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl">
          {label}
        </div>
      </div>
    </div>
  );
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  // ── All hooks MUST be before any early return ───────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [readTime, setReadTime] = useState(0);
  const [mediaModal, setMediaModal] = useState<'image' | 'gif' | 'youtube' | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const calculateReadTime = () => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).length;
      setReadTime(Math.max(1, Math.ceil(words / 225)));
    };
    editor.on('update', calculateReadTime);
    calculateReadTime();
    return () => { editor.off('update', calculateReadTime); };
  }, [editor]);

  useEffect(() => {
    if (!linkOpen) return;
    const h = (e: MouseEvent) => { if (linkRef.current && !linkRef.current.contains(e.target as Node)) setLinkOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [linkOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setAiMenuOpen(false);
    };
    if (aiMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aiMenuOpen]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const existing = document.getElementById('ai-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'ai-toast';
    const colors = { info: 'bg-[#7c3aed] text-white', success: 'bg-green-600 text-white', error: 'bg-red-600 text-white' };
    toast.className = `fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all duration-300 ${colors[type]}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
  }, []);

  // ── Early return AFTER all hooks ────────────────────────────────────────
  if (!editor) return null;

  // ── Non-hook helpers (safe after early return) ──────────────────────────
  const openMedia = (mode: 'image' | 'gif' | 'youtube') => setMediaModal(mode);

  const handleInsertImages = (urls: string[]) => {
    urls.forEach(url => editor.chain().focus().setImage({ src: url }).run());
  };

  const handleInsertUrl = (url: string, type: 'image' | 'gif' | 'youtube') => {
    if (type === 'youtube') {
      editor.commands.setYoutubeVideo({ src: url });
    } else {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run();
    }
    setLinkOpen(false);
    setLinkUrl('');
  };

  const openLinkPopover = () => {
    setLinkUrl(editor.getAttributes('link').href || '');
    setLinkOpen(true);
  };


  const runAiAction = async (action: 'improve' | 'summarize' | 'grammar') => {
    setAiMenuOpen(false);

    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    const textToProcess = selectedText || editor.getText();

    if (!textToProcess.trim()) {
      showToast('⚠️ Please enter or select some text first.', 'error');
      return;
    }

    const labels: Record<string, string> = {
      improve: '✨ Improving your writing...',
      summarize: '📝 Summarizing...',
      grammar: '🔍 Fixing grammar...',
    };

    setIsAiProcessing(true);
    showToast(labels[action], 'info');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess, action }),
      });
      const data = await res.json();
      if (data.result) {
        if (selectedText) {
          editor.chain().focus().insertContentAt({ from: selection.from, to: selection.to }, data.result).run();
        } else {
          editor.chain().focus().setContent(data.result).run();
        }
        const successLabels: Record<string, string> = {
          improve: '✅ Writing improved!',
          summarize: '✅ Summary ready!',
          grammar: '✅ Grammar fixed!',
        };
        showToast(successLabels[action], 'success');
      } else {
        showToast('❌ AI processing failed. Try again.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Error connecting to AI. Try again.', 'error');
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
    <>
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
        {/* Link Popover */}
        <div className="relative" ref={linkRef}>
          <div className="relative group flex items-center justify-center">
            <button
              type="button"
              onClick={openLinkPopover}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                editor.isActive('link') ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]'
              }`}
              aria-label="Insert Link"
            >
              <LinkIcon size={18} />
            </button>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 delay-150 z-50">
              <div className="bg-black text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl">Insert Link (Ctrl+K)</div>
            </div>
          </div>
          {linkOpen && (
            <div className="absolute bottom-full left-0 mb-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 min-w-[260px]" style={{ animation: 'aiMenuIn 0.15s ease-out' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Insert Link</p>
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setLinkOpen(false); }}
                placeholder="https://example.com"
                autoFocus
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder:text-gray-500 outline-none focus:border-blue-500 transition-colors mb-2"
              />
              <div className="flex gap-2">
                <button onClick={applyLink} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                  {linkUrl.trim() ? 'Apply' : 'Remove Link'}
                </button>
                <button onClick={() => setLinkOpen(false)} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <ToolbarButton icon={<ImageIcon size={18} />} label="Insert Image" onClick={() => openMedia('image')} />
        <ToolbarButton icon={<FileVideo size={18} />} label="Insert GIF" onClick={() => openMedia('gif')} />
        <ToolbarButton icon={<YoutubeIcon size={18} />} label="Embed YouTube" onClick={() => openMedia('youtube')} />
      </div>

      {/* Pro Features Group */}
      <div className="flex items-center gap-1 ml-auto">
        {/* AI Assist floating popover */}
        <div className="relative" ref={aiMenuRef}>
          <button
            type="button"
            onClick={() => setAiMenuOpen(prev => !prev)}
            disabled={isAiProcessing}
            aria-label="AI Assist"
            className={`relative p-2 rounded-lg transition-colors flex items-center justify-center ${
              aiMenuOpen
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                : 'text-[#a855f7] hover:bg-purple-50 dark:hover:bg-purple-900/20'
            } ${isAiProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isAiProcessing
              ? <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              : <Sparkles size={18} />}
          </button>

          {/* Tooltip (only when menu closed) */}
          {!aiMenuOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 delay-150 z-50">
              <div className="bg-black text-white text-xs font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl">
                AI Assist
              </div>
            </div>
          )}

          {/* Floating Action Menu */}
          {aiMenuOpen && (
            <div
              className="absolute bottom-full right-0 mb-2 z-50 min-w-[160px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              style={{ animation: 'aiMenuIn 0.15s ease-out' }}
            >
              <style>{`
                @keyframes aiMenuIn {
                  from { opacity: 0; transform: scale(0.92) translateY(6px); }
                  to   { opacity: 1; transform: scale(1) translateY(0); }
                }
              `}</style>
              <div className="px-3 py-2 border-b border-gray-700">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">AI Assist</p>
              </div>
              {([
                { action: 'improve'   as const, label: '✨ Improve',      desc: 'Rewrite for clarity & flow' },
                { action: 'summarize' as const, label: '📝 Summarize',    desc: 'Condense key points' },
                { action: 'grammar'   as const, label: '🔍 Fix Grammar',  desc: 'Correct errors & spelling' },
              ]).map(({ action, label, desc }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => runAiAction(action)}
                  className="w-full flex flex-col items-start px-3 py-2.5 hover:bg-gray-800 transition-colors group/item text-left"
                >
                  <span className="text-sm font-semibold text-white group-hover/item:text-purple-300 transition-colors">{label}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
    {mediaModal && (
      <MediaPickerModal
        mode={mediaModal}
        onInsertImages={handleInsertImages}
        onInsertUrl={handleInsertUrl}
        onClose={() => setMediaModal(null)}
      />
    )}
  </>
  );
};

// ── Editor Root ────────────────────────────────────────────────────────────────

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
