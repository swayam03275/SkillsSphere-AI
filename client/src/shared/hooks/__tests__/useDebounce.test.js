import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should update the value after the specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });
    
    // Value should not update immediately
    expect(result.current).toBe('initial');

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should clear the timeout if value changes before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'update1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Change again before first timer finishes
    rerender({ value: 'update2', delay: 500 });
    
    // The previous timer should be cleared. 
    // Advance 200ms more (which would have completed the first timer)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // Advance the remaining 300ms for the second timer
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('update2');
  });
});
