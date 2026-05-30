import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit    from '@tiptap/starter-kit';
import Placeholder   from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Minus,
} from 'lucide-react';
import type { Note } from '../types';

// ── Toolbar button ────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick:  () => void;
  active:   boolean;
  title:    string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent the editor losing focus on mouse click.
        // The action itself is handled by onClick, which fires for both
        // mouse clicks AND keyboard (Space/Enter) — keeping toolbar accessible.
        e.preventDefault();
      }}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent/20 text-accent'
          : 'text-text-faint hover:text-text-sec hover:bg-bg-hover'
      }`}
    >
      {children}
    </button>
  );
}

// ── NoteEditor ────────────────────────────────────────────────────────────────

interface Props {
  note: Note;
}

// Renders a TipTap rich-text editor for the selected note.
// At this commit the editor is interactive but changes are NOT persisted —
// auto-save with debounce is added in commit 11.
export default function NoteEditor({ note }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note.content,
  });

  // When the user selects a different note, swap the editor content.
  // Using `note.id` as the dependency ensures we only reset on note change,
  // not on every content update (which would fight the editor's own state).
  useEffect(() => {
    if (!editor) return;
    // setContent with emitUpdate=false prevents triggering onUpdate callbacks
    editor.commands.setContent(note.content, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // useEditor cleans up the editor instance when the component unmounts —
  // no manual destroy needed.

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex items-center gap-0.5 px-5 py-2.5 border-b border-border-col shrink-0 flex-wrap"
      >
        {editor && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold (⌘B)"
            >
              <Bold className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic (⌘I)"
            >
              <Italic className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <div className="w-px h-4 bg-border-col mx-1" aria-hidden="true" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <div className="w-px h-4 bg-border-col mx-1" aria-hidden="true" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Blockquote"
            >
              <Quote className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Inline code"
            >
              <Code className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              active={false}
              title="Divider"
            >
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* ── Title (display-only at this stage; editing wired in commit 11) ── */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        <h2 className="text-3xl font-serif text-text-pri">
          {note.title || 'Untitled'}
        </h2>
      </div>

      {/* ── Editor content ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-6 pb-10"
        aria-label="Note content"
      >
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}
