import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "../useDebounce";

describe("useDebounce hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces string values after the specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    expect(result.current).toBe("initial");

    rerender({ value: "updated", delay: 300 });
    // Before timer fires, should still be old value
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    // After timer fires, should be new value
    expect(result.current).toBe("updated");
  });

  it("rapid value changes reset the pending timer", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    );

    expect(result.current).toBe("a");

    rerender({ value: "b", delay: 500 });
    rerender({ value: "c", delay: 500 });
    rerender({ value: "d", delay: 500 });

    // Only the last value should win after delay
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("a"); // Not yet

    act(() => {
      vi.advanceTimersByTime(1); // Now 500ms have passed
    });
    expect(result.current).toBe("d"); // Last value
  });

  it("works with custom delay values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "start", delay: 1000 } }
    );

    rerender({ value: "middle", delay: 1000 });

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toBe("start");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("middle");
  });

  it("debounces number values correctly", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 200 } }
    );

    expect(result.current).toBe(42);

    rerender({ value: 100, delay: 200 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(100);
  });

  it("debounces object values correctly", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { id: 1 }, delay: 200 } }
    );

    expect(result.current).toEqual({ id: 1 });

    rerender({ value: { id: 2 }, delay: 200 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toEqual({ id: 2 });
  });

  it("uses 500ms default delay when not specified", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "start" } }
    );

    rerender({ value: "finish" });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("start");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("finish");
  });
});
