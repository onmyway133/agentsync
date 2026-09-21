import { describe, expect, test } from "bun:test";
import { extractMarkerBlock, upsertMarkerBlock } from "../../src/store/instructions-merge";

describe("upsertMarkerBlock", () => {
  test("creates the block when there is no existing content", () => {
    const result = upsertMarkerBlock(null, "hello");
    expect(result).toContain("<!-- agentsync:start -->");
    expect(result).toContain("hello");
    expect(result).toContain("<!-- agentsync:end -->");
  });

  test("appends the block after existing tool-specific content", () => {
    const existing = "# My Notes\nDon't touch this.\n";
    const result = upsertMarkerBlock(existing, "canonical content");
    expect(result.startsWith(existing)).toBe(true);
    expect(result).toContain("canonical content");
  });

  test("replaces only the managed block, preserving surrounding content", () => {
    const existing = [
      "# Before",
      "<!-- agentsync:start -->",
      "old content",
      "<!-- agentsync:end -->",
      "# After",
    ].join("\n");
    const result = upsertMarkerBlock(existing, "new content");
    expect(result).toContain("# Before");
    expect(result).toContain("# After");
    expect(result).toContain("new content");
    expect(result).not.toContain("old content");
  });
});

describe("extractMarkerBlock", () => {
  test("returns null when there is no marker block", () => {
    expect(extractMarkerBlock("plain text")).toBeNull();
    expect(extractMarkerBlock(null)).toBeNull();
  });

  test("extracts the trimmed content between markers", () => {
    const content = "before\n<!-- agentsync:start -->\n  hello  \n<!-- agentsync:end -->\nafter";
    expect(extractMarkerBlock(content)).toBe("hello");
  });
});
