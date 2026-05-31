import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stripHtml, truncate, relativeTime, parseTagInput, htmlToMarkdown } from '../utils/helpers';

// ── stripHtml ─────────────────────────────────────────────────────────────────

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('handles nested tags', () => {
    expect(stripHtml('<div><ul><li>Item</li></ul></div>')).toBe('Item');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });

  it('replaces &nbsp; with a space', () => {
    expect(stripHtml('hello&nbsp;world')).toBe('hello world');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot;')).toBe('& < > "');
  });

  it('trims leading and trailing whitespace', () => {
    expect(stripHtml('  <p>  text  </p>  ')).toBe('text');
  });
});

// ── truncate ──────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns the string unchanged when within maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns the string unchanged when exactly at maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends ellipsis when over maxLen', () => {
    const result = truncate('hello world', 5);
    expect(result.endsWith('…')).toBe(true);
    // Content before ellipsis should be no longer than maxLen chars
    expect(result.replace('…', '').length).toBeLessThanOrEqual(5);
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('does not truncate HTML content differently from plain text', () => {
    // truncate works on raw strings — callers should stripHtml first
    const html = '<p>Short</p>';
    expect(truncate(html, 100)).toBe(html);
  });
});

// ── relativeTime ──────────────────────────────────────────────────────────────

describe('relativeTime', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(()  => { vi.useRealTimers(); });

  it('returns "just now" for dates less than a minute ago', () => {
    vi.setSystemTime(new Date('2024-01-01T12:00:30Z'));
    expect(relativeTime('2024-01-01T12:00:00Z')).toBe('just now');
  });

  it('returns minutes ago for dates within the last hour', () => {
    vi.setSystemTime(new Date('2024-01-01T12:05:00Z'));
    expect(relativeTime('2024-01-01T12:00:00Z')).toBe('5m ago');
  });

  it('returns hours ago for dates within the last day', () => {
    vi.setSystemTime(new Date('2024-01-01T15:00:00Z'));
    expect(relativeTime('2024-01-01T12:00:00Z')).toBe('3h ago');
  });

  it('returns days ago for dates within the last week', () => {
    vi.setSystemTime(new Date('2024-01-04T12:00:00Z'));
    expect(relativeTime('2024-01-01T12:00:00Z')).toBe('3d ago');
  });

  it('returns a short date for dates older than a week', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    const result = relativeTime('2024-01-01T12:00:00Z');
    // Should not contain "ago"
    expect(result).not.toContain('ago');
    // Should look like a date (e.g. "Jan 1")
    expect(result).toMatch(/[A-Z][a-z]+\s\d+/);
  });

  it('returns empty string for an invalid date string', () => {
    // Guards against showing "Invalid Date" to the user when backend sends
    // a malformed timestamp
    expect(relativeTime('not-a-date')).toBe('');
    expect(relativeTime('')).toBe('');
  });
});

// ── parseTagInput ─────────────────────────────────────────────────────────────

describe('parseTagInput', () => {
  it('parses a single tag', () => {
    expect(parseTagInput('work')).toEqual(['work']);
  });

  it('parses comma-separated tags', () => {
    expect(parseTagInput('work,personal,ideas')).toEqual(['work', 'personal', 'ideas']);
  });

  it('trims whitespace from each tag', () => {
    expect(parseTagInput('  work  ,  personal  ')).toEqual(['work', 'personal']);
  });

  it('removes empty tags from splits', () => {
    expect(parseTagInput('work,,personal,')).toEqual(['work', 'personal']);
  });

  it('removes duplicate tags (case-insensitive)', () => {
    expect(parseTagInput('work,Work,WORK')).toEqual(['work']);
  });

  it('lowercases all tags', () => {
    expect(parseTagInput('Work,PERSONAL')).toEqual(['work', 'personal']);
  });

  it('returns empty array for an empty string', () => {
    expect(parseTagInput('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parseTagInput('   ')).toEqual([]);
  });
});

// ── htmlToMarkdown ────────────────────────────────────────────────────────────

describe('htmlToMarkdown', () => {
  it('converts headings', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
    expect(htmlToMarkdown('<h2>Sub</h2>')).toBe('## Sub');
    expect(htmlToMarkdown('<h3>Sub sub</h3>')).toBe('### Sub sub');
  });

  it('converts bold and italic', () => {
    expect(htmlToMarkdown('<strong>bold</strong>')).toBe('**bold**');
    expect(htmlToMarkdown('<b>also bold</b>')).toBe('**also bold**');
    expect(htmlToMarkdown('<em>italic</em>')).toBe('_italic_');
    expect(htmlToMarkdown('<i>also italic</i>')).toBe('_also italic_');
  });

  it('converts inline code', () => {
    expect(htmlToMarkdown('<code>const x = 1</code>')).toBe('`const x = 1`');
  });

  it('converts fenced code blocks', () => {
    const result = htmlToMarkdown('<pre><code>hello\nworld</code></pre>');
    expect(result).toContain('```');
    expect(result).toContain('hello');
  });

  it('converts paragraphs to plain text', () => {
    expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
  });

  it('converts bullet lists', () => {
    const result = htmlToMarkdown('<ul><li>item one</li><li>item two</li></ul>');
    expect(result).toContain('- item one');
    expect(result).toContain('- item two');
  });

  it('converts horizontal rule', () => {
    expect(htmlToMarkdown('<hr />')).toBe('---');
  });

  it('decodes HTML entities', () => {
    expect(htmlToMarkdown('&amp; &lt; &gt; &quot;')).toBe('& < > "');
  });

  it('returns empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('');
  });

  it('strips unknown tags', () => {
    expect(htmlToMarkdown('<span class="foo">text</span>')).toBe('text');
  });

  it('separates multiple block elements with blank lines', () => {
    // Regression: without trailing \n\n on each block, heading and paragraph ran together
    const result = htmlToMarkdown('<h1>Title</h1><p>First paragraph</p><p>Second paragraph</p>');
    expect(result).toMatch(/# Title\n\nFirst paragraph/);
    expect(result).toMatch(/First paragraph\n\nSecond paragraph/);
  });

  it('converts blockquote', () => {
    const result = htmlToMarkdown('<blockquote><p>A quote</p></blockquote>');
    expect(result).toContain('> A quote');
  });
});
