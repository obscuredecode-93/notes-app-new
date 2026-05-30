import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../hooks/useDebounce';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(()  => { vi.useRealTimers(); });

describe('useDebounce', () => {
  it('returns the initial value immediately without waiting for the delay', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update the debounced value before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebounce(v, 300),
      { initialProps: { v: 'initial' } }
    );

    rerender({ v: 'changed' });
    act(() => { vi.advanceTimersByTime(299); });

    // Still showing the old value — delay has not elapsed
    expect(result.current).toBe('initial');
  });

  it('updates the debounced value after the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebounce(v, 300),
      { initialProps: { v: 'initial' } }
    );

    rerender({ v: 'changed' });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('changed');
  });

  it('resets the timer on rapid updates — only the final value is applied', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebounce(v, 300),
      { initialProps: { v: 'a' } }
    );

    // Fire two updates in quick succession
    rerender({ v: 'b' });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ v: 'c' });
    act(() => { vi.advanceTimersByTime(200); }); // 400ms since 'b', but only 200ms since 'c'

    // 'b' should NOT have been applied (its timer was cancelled by 'c')
    expect(result.current).toBe('a');

    act(() => { vi.advanceTimersByTime(100); }); // now 300ms since 'c'
    expect(result.current).toBe('c');
  });

  it('works with number values', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: number }) => useDebounce(v, 500),
      { initialProps: { v: 0 } }
    );

    rerender({ v: 42 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(42);
  });

  it('cleans up the timer when the component unmounts', () => {
    const { result, rerender, unmount } = renderHook(
      ({ v }: { v: string }) => useDebounce(v, 300),
      { initialProps: { v: 'initial' } }
    );

    rerender({ v: 'changed' });
    unmount(); // Should cancel the pending timeout

    act(() => { vi.advanceTimersByTime(300); });

    // The debounced value should still be 'initial' since unmount cancelled the timer
    expect(result.current).toBe('initial');
  });
});
