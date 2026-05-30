import type { Note, NotesFilter, NotesResponse, Tag } from '../types';

// In development the Vite proxy rewrites /api/* → http://localhost:3001/*.
// In production set VITE_API_URL to the deployed backend base URL.
const BASE = import.meta.env.VITE_API_URL ?? '/api';

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  // 204 No Content — return undefined, nothing to parse
  if (res.status === 204) return undefined as T;

  // Parse JSON defensively: if the server returns an HTML error page (e.g. a
  // reverse-proxy 502) res.json() would throw a misleading parse error rather
  // than a useful HTTP status message.
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}`);
  }

  if (!res.ok) {
    const msg = (body as { error?: { message?: string } })?.error?.message;
    throw new Error(msg ?? `HTTP ${res.status}`);
  }

  return body as T;
}

// Build a query string from an object, omitting undefined/empty values
function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ── API methods ───────────────────────────────────────────────────────────────

export const notesApi = {
  list: (filter: NotesFilter = {}): Promise<NotesResponse> =>
    request(`/notes${toQuery({ ...filter })}`),

  get: (id: string): Promise<Note> =>
    request(`/notes/${id}`),

  create: (data: Partial<Pick<Note, 'title' | 'content' | 'tags'>>): Promise<Note> =>
    request('/notes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Pick<Note, 'title' | 'content' | 'tags'>>): Promise<Note> =>
    request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string): Promise<void> =>
    request(`/notes/${id}`, { method: 'DELETE' }),

  tags: (): Promise<Tag[]> =>
    request('/tags'),
};
