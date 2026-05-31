import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit  from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Minus,
  Loader2, Check, AlertCircle, Tag, X, Trash2, Download,
} from 'lucide-react';
import type { Note } from '../types';
import { useDebounce }                    from '../hooks/useDebounce';
import { useUpdateNote, useDeleteNote }   from '../hooks/useNotes';
import { parseTagInput, htmlToMarkdown }  from '../utils/helpers';
import { useNoteStore }                   from '../store/noteStore';
import DeleteConfirmDialog                from './DeleteConfirmDialog';

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 1_000;
const MAX_TAG_LENGTH    =    50; // mirrors backend Zod schema max(50)
const MAX_TAGS          =    10; // mirrors backend Zod schema max(10)
const SAVED_LABEL_TTL   = 2_000; // how long "Saved" stays visible

// ── Save state indicator ──────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// The aria-live region must remain in the DOM at all times.
// Screen readers only announce changes to *existing* live regions — if the
// element is conditionally mounted/unmounted the announcement is often skipped.
function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className="flex items-center gap-1 text-xs ml-auto min-w-[4rem]"
    >
      {state === 'saving' && (
        <><Loader2 className="w-3 h-3 animate-spin text-text-faint" aria-hidden="true" />
          <span className="text-text-faint">Saving…</span></>
      )}
      {state === 'saved' && (
        <><Check className="w-3 h-3 text-success" aria-hidden="true" />
          <span className="text-success">Saved</span></>
      )}
      {state === 'error' && (
        <><AlertCircle className="w-3 h-3 text-danger" aria-hidden="true" />
          <span className="text-danger">Failed to save</span></>
      )}
    </span>
  );
}

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
      onMouseDown={(e) => e.preventDefault()} // keep editor focused on mouse click
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

export default function NoteEditor({ note }: Props) {
  const { setSelectedNote }  = useNoteStore();
  const [title,       setTitle]       = useState(note.title);
  const [tags,        setTags]        = useState<string[]>(note.tags);
  const [tagInput,    setTagInput]    = useState('');
  const [saveState,   setSaveState]   = useState<SaveState>('idle');
  const [showConfirm, setShowConfirm] = useState(false);

  // TipTap v3: editor.isActive() does not automatically cause a re-render when
  // the cursor moves or selection changes. onTransaction fires on every editor
  // state change (cursor move, selection, formatting toggle) and increments a
  // counter, forcing React to re-render so toolbar active states stay correct.
  const [, forceToolbarUpdate] = useState(0);

  // Debounce the title so we only fire PATCH after 1 s of no typing
  const debouncedTitle = useDebounce(title, AUTOSAVE_DELAY_MS);

  // Keep a ref to the latest content so the onUpdate callback always has the
  // current value without adding it to any dependency arrays
  const latestContentRef = useRef(note.content);

  // Ref to the pending content-save timeout — cleared on unmount to prevent
  // setState calls on an unmounted component
  const contentTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // ── Save helper ─────────────────────────────────────────────────────────────

  // Use a ref so the save function is always current inside callbacks/effects
  // without needing to be listed as a dependency
  const saveRef = useRef(
    async (patch: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
      setSaveState('saving');
      try {
        await updateNote.mutateAsync({ id: note.id, ...patch });
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), SAVED_LABEL_TTL);
      } catch {
        setSaveState('error');
      }
    }
  );
  // Keep saveRef.current up-to-date whenever note.id or updateNote changes
  useEffect(() => {
    saveRef.current = async (patch) => {
      setSaveState('saving');
      try {
        await updateNote.mutateAsync({ id: note.id, ...patch });
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), SAVED_LABEL_TTL);
      } catch {
        setSaveState('error');
      }
    };
  }, [note.id, updateNote]);

  // ── TipTap editor ──────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:        { levels: [1, 2, 3] },
        bulletList:     {},
        orderedList:    {},
        blockquote:     {},
        bold:           {},
        italic:         {},
        strike:         {},
        code:           {},
        codeBlock:      {},
        horizontalRule: {},
      }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note.content,
    // Fires on every state change (cursor move, selection, format toggle).
    // Increments the counter above so React re-renders and toolbar
    // editor.isActive() calls reflect the current cursor position.
    onTransaction: () => forceToolbarUpdate((n) => n + 1),
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      latestContentRef.current = html;

      // Debounce: clear any pending save and schedule a new one
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
      contentTimerRef.current = setTimeout(() => {
        saveRef.current({ content: latestContentRef.current });
      }, AUTOSAVE_DELAY_MS);
    },
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  // Note: state reset on note change is handled by key={note.id} in App.tsx,
  // which forces a full remount — no setState-in-effect needed here.

  useEffect(() => {
    return () => {
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    };
  }, []);

  // ── Auto-save title ────────────────────────────────────────────────────────

  useEffect(() => {
    // Skip the initial render and identical values
    if (debouncedTitle === note.title) return;
    saveRef.current({ title: debouncedTitle });
  }, [debouncedTitle, note.title]);

  // ── Markdown export ───────────────────────────────────────────────────────

  function handleExportMarkdown() {
    // Prefix with the note title as an H1 so the file is self-contained
    const content  = `# ${title || 'Untitled'}\n\n${htmlToMarkdown(latestContentRef.current)}`;
    const blob     = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    // Sanitise the title for use as a filename
    a.download     = `${(title || 'untitled').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').toLowerCase() || 'note'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    try {
      await deleteNote.mutateAsync(note.id);
      setSelectedNote(null);
    } catch {
      // Cache rollback in useDeleteNote's onError
    } finally {
      setShowConfirm(false);
    }
  }

  // ── Tag management ────────────────────────────────────────────────────────

  function addTag(raw: string) {
    const parsed = parseTagInput(raw)
      // Silently drop any tag that exceeds the backend's 50-char limit rather
      // than letting the save fail with a generic "Failed to save" message.
      .filter((t) => t.length <= MAX_TAG_LENGTH);
    if (!parsed.length) return;
    const next = [...new Set([...tags, ...parsed])].slice(0, MAX_TAGS);
    setTags(next);
    setTagInput('');
    saveRef.current({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveRef.current({ tags: next });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      // Remove the last tag when backspacing on an empty input
      removeTag(tags[tags.length - 1]);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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

        {/* Save state indicator — pushed to the right */}
        <SaveIndicator state={saveState} />

        {/* Export as Markdown */}
        <button
          type="button"
          onClick={handleExportMarkdown}
          aria-label="Export note as Markdown"
          title="Export as Markdown (.md)"
          className="ml-1 p-1.5 rounded text-text-faint hover:text-text-sec hover:bg-bg-hover transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Delete — opens confirmation dialog */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={deleteNote.isPending}
          aria-label="Delete note"
          title="Move note to trash"
          className="ml-1 p-1.5 rounded text-text-faint hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus:ring-1 focus:ring-danger disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Title input ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <input
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Note title"
          className="w-full text-3xl font-serif bg-transparent outline-none text-text-pri placeholder:text-text-faint border-b border-border-col pb-3 focus:border-accent transition-colors"
        />
      </div>

      {/* ── Tag input ────────────────────────────────────────────────────── */}
      <div className="px-6 pb-3 flex flex-wrap items-center gap-1.5 shrink-0">
        <Tag className="w-3.5 h-3.5 text-text-faint shrink-0" aria-hidden="true" />

        {/* Existing tag chips */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-accent/10 text-accent border border-accent/20"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="hover:text-white transition-colors focus:outline-none"
            >
              <X className="w-2.5 h-2.5" aria-hidden="true" />
            </button>
          </span>
        ))}

        {/* New tag input — hidden when at the 10-tag limit */}
        {tags.length < 10 && (
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? 'Add tags…' : '+'}
            aria-label="Add tag"
            className="text-xs bg-transparent outline-none text-text-sec placeholder:text-text-faint min-w-[60px] max-w-[120px]"
          />
        )}
      </div>

      {/* ── Editor content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint mb-2 select-none">
          Content
        </p>
        {/* Bordered wrapper — focus-within glow shows which area is active */}
        <div
          className="border border-border-col rounded-lg bg-bg-surface cursor-text transition-all duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10"
          onClick={() => editor?.commands.focus()}
          aria-label="Note content"
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ── Delete confirmation dialog ────────────────────────────────────── */}
      {showConfirm && (
        <DeleteConfirmDialog
          title={title}
          loading={deleteNote.isPending}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

    </div>
  );
}
