import { useState, useEffect } from 'react';

// Returns a debounced copy of `value` that only updates after `delay` ms
// of silence. The cleanup function cancels the pending timeout so the state
// update never fires after the consuming component unmounts.
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
