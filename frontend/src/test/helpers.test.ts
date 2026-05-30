import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stripHtml, truncate, relativeTime } from '../utils/helpers';

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
