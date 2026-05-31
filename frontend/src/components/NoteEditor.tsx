import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit  from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Minus,
  Loader2, Check, AlertCircle, Tag, X,
} from 'lucide-react';
import type { Note } from '../types';
import { useDebounce }   from '../hooks/useDebounce';
import { useUpdateNote } from '../hooks/useNotes';
import { parseTagInput } from '../utils/helpers';

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 1_000;
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
  const [title,     setTitle]     = useState(note.title);
  const [tags,      setTags]      = useState<string[]>(note.tags);
  const [tagInput,  setTagInput]  = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Debounce the title so we only fire PATCH after 1 s of no typing
  const debouncedTitle = useDebounce(title, AUTOSAVE_DELAY_MS);

  // Keep a ref to the latest content so the onUpdate callback always has the
  // current value without adding it to any dependency arrays
  const latestContentRef = useRef(note.content);

  // Ref to the pending content-save timeout — cleared on unmount to prevent
  // setState calls on an unmounted component
  const contentTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateNote = useUpdateNote();

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
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note.content,
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

  // ── Sync when the selected note changes ────────────────────────────────────

  useEffect(() => {
    if (!editor) return;
    setTitle(note.title);
    setTags(note.tags);
    setTagInput('');
    latestContentRef.current = note.content;
    editor.commands.setContent(note.content, false);
    setSaveState('idle');
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

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

  // ── Tag management ────────────────────────────────────────────────────────

  const MAX_TAG_LENGTH = 50; // mirrors backend Zod schema constraint
  const MAX_TAGS       = 10;

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
      </div>

      {/* ── Title input ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        <input
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Note title"
          className="w-full text-3xl font-serif bg-transparent border-none outline-none text-text-pri placeholder:text-text-faint"
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
      <div className="flex-1 overflow-y-auto px-6 pb-10" aria-label="Note content">
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}
