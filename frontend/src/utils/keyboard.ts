// Detect Mac so we can show the correct modifier key symbol in UI hints.
// The actual shortcut detection in useKeyboardShortcuts already uses
// (e.metaKey || e.ctrlKey) which works correctly on all platforms.
export const isMac: boolean =
  typeof navigator !== 'undefined' &&
  (/mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent));

// Returns the display string for a shortcut hint, e.g.:
//   Mac     → "⌘N"
//   Windows → "Ctrl+N"
export function shortcut(key: string): string {
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}
