// ── Text helpers ──────────────────────────────────────────────────────────────

// Strip HTML tags and decode basic entities for use in plain-text previews
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Truncate a string to maxLen characters, appending an ellipsis if cut
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '…';
}

// ── Tag helpers ───────────────────────────────────────────────────────────────

// Parse a raw user-typed string into clean, deduplicated tag tokens.
// Splits on commas, trims whitespace, removes empty entries and duplicates.
// Used by the tag input in NoteEditor.
export function parseTagInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

// Return a human-readable relative time string (e.g. "3m ago", "2d ago").
// Returns an empty string for invalid/missing date strings rather than
// "Invalid Date", which would confuse users.
export function relativeTime(dateStr: string): string {
  const parsed = new Date(dateStr).getTime();
  if (isNaN(parsed)) return '';
  const diff = Date.now() - parsed;
  const mins  = Math.floor(diff  / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;

  // Older than a week — show a short calendar date
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });
}
