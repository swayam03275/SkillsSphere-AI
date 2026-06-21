import { describe, expect, it, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDocumentTitle } from "../useDocumentTitle";

describe("useDocumentTitle", () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it("sets document title to title plus suffix on mount", () => {
    const { result } = renderHook(() => useDocumentTitle("Dashboard"));
    expect(document.title).toBe("Dashboard | SkillSphere AI");
  });

  it("sets document title to default when title prop is empty string", () => {
    const { result } = renderHook(() => useDocumentTitle(""));
    expect(document.title).toBe("SkillSphere AI");
  });

  it("restores original document title on unmount", () => {
    document.title = "Original Title";
    const { unmount } = renderHook(() => useDocumentTitle("Temp Title"));
    expect(document.title).toBe("Temp Title | SkillSphere AI");
    unmount();
    expect(document.title).toBe("Original Title");
  });

  it("updates document title when title prop changes", () => {
    const { result, rerender } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: "Page One" } },
    );
    expect(document.title).toBe("Page One | SkillSphere AI");

    rerender({ title: "Page Two" });
    expect(document.title).toBe("Page Two | SkillSphere AI");
  });

  it("handles null-like title gracefully", () => {
    // @ts-expect-error intentionally passing invalid prop
    const { result } = renderHook(() => useDocumentTitle(null));
    expect(document.title).toBe("SkillSphere AI");
  });
});