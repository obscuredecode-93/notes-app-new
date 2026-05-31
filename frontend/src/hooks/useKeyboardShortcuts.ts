import { useEffect, useLayoutEffect, useRef } from 'react';

interface Shortcuts {
  onNew?:    () => void;  // ⌘N / Ctrl+N
  onSearch?: () => void;  // ⌘K / Ctrl+K — focus search bar
  onDelete?: () => void;  // ⌘Delete / Ctrl+Delete — delete selected note
  onEscape?: () => void;  // Escape — context-sensitive dismiss
}

// Global keyboard shortcut handler.
// Uses a ref to hold the latest callbacks so the event listener is registered
// exactly once (stable deps) while always calling the current handler version.
export function useKeyboardShortcuts(shortcuts: Shortcuts): void {
  const ref = useRef(shortcuts);
  // useLayoutEffect (not render) keeps the ref current before any event fires.
  // This satisfies the react-hooks/refs rule while avoiding stale closures.
  useLayoutEffect(() => {
    ref.current = shortcuts;
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod      = e.metaKey || e.ctrlKey;
      const { onNew, onSearch, onDelete, onEscape } = ref.current;

      // ⌘/Ctrl+N — new note (global, works from anywhere)
      if (mod && e.key === 'n') {
        e.preventDefault();
        onNew?.();
        return;
      }

      // ⌘/Ctrl+K — focus search (global, works even from inside the editor)
      if (mod && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // ⌘/Ctrl+Delete — delete selected note.
      // Guard: don't intercept when a contenteditable element (TipTap) is focused
      // so the editor's own line-deletion behaviour still works.
      if (mod && e.key === 'Delete') {
        const inContentEditable =
          (document.activeElement as HTMLElement)?.contentEditable === 'true';
        if (!inContentEditable) {
          e.preventDefault();
          onDelete?.();
        }
        return;
      }

      // Escape — context-sensitive dismiss (no mod key required)
      if (e.key === 'Escape') {
        onEscape?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    // Remove listener on unmount — prevents memory leaks and duplicate handlers
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // empty deps: listener is registered once; latest callbacks come from ref
}
