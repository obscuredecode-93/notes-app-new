// ── Core domain types — kept in sync with the backend's Note interface ────────

export interface Note {
  id:        string;
  title:     string;
  content:   string;   // HTML string produced by TipTap
  tags:      string[];
  createdAt: string;   // ISO 8601 timestamp
  updatedAt: string;
}

export interface Tag {
  tag:   string;
  count: number;
}

// Shape of GET /notes response
export interface NotesResponse {
  data:  Note[];
  total: number;  // total matching rows (for pagination)
  page:  number;
}

// Valid sort columns — mirrored from backend listNotesSchema
export type SortBy    = 'createdAt' | 'updatedAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface NotesFilter {
  search?: string;
  tag?:    string;
  sort?:   SortBy;
  order?:  SortOrder;
  page?:   number;
  limit?:  number;
}

// Consistent error shape returned by the backend
export interface ApiError {
  error: {
    code:    string;
    message: string;
    details: unknown;
  };
}
