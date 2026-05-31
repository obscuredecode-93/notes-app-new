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

// ── Markdown export ───────────────────────────────────────────────────────────

// Convert TipTap HTML output to plain Markdown.
// Handles the subset of HTML that TipTap's StarterKit produces.
// Code blocks are processed before inline code to avoid nested tag confusion.
export function htmlToMarkdown(html: string): string {
  return html
    // ── Block elements (order matters) ────────────────────────────────────
    // Fenced code blocks — must come before inline <code> replacement
    .replace(
      /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
      (_, code) => '```\n' + code.replace(/<[^>]+>/g, '').trim() + '\n```\n\n'
    )
    // All block headings get a trailing blank line so they don't run into the
    // next element when multiple blocks are rendered back-to-back.
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
      inner
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
        .replace(/<[^>]+>/g, '')
        .trim()
        .split('\n')
        .map((l: string) => `> ${l.trim()}`)
        .join('\n') + '\n\n'
    )
    .replace(/<hr[^>]*\/?>/gi, '---\n\n')
    // List items — remove the enclosing <ul>/<ol> wrappers
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    // Each paragraph ends with a blank line; trim() removes the final one
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // ── Inline elements ───────────────────────────────────────────────────
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    // ── Strip remaining tags and decode entities ───────────────────────────
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse 3+ consecutive newlines to a single blank line
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
