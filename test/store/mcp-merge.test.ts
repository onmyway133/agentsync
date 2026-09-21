import { describe, expect, test } from "bun:test";
import { mergeMcpIntoTool, mergeToolIntoStore } from "../../src/store/mcp-merge";

describe("mergeToolIntoStore", () => {
  test("tool entries win, store-only entries are preserved", () => {
    const store = { a: { command: "store-a" }, b: { command: "store-b" } };
    const tool = { a: { command: "tool-a" }, c: { command: "tool-c" } };
    expect(mergeToolIntoStore(store, tool)).toEqual({
      a: { command: "tool-a" },
      b: { command: "store-b" },
      c: { command: "tool-c" },
    });
  });
});

describe("mergeMcpIntoTool", () => {
  test("adds/updates store keys without touching unowned tool keys", () => {
    const currentTool = { unrelated: { command: "keep-me" } };
    const store = { a: { command: "store-a" } };
    const result = mergeMcpIntoTool(currentTool, store, []);
    expect(result.merged).toEqual({
      unrelated: { command: "keep-me" },
      a: { command: "store-a" },
    });
    expect(result.addedOrUpdatedKeys).toEqual(["a"]);
    expect(result.removedKeys).toEqual([]);
  });

  test("removes previously-owned keys that were deleted from the store", () => {
    const currentTool = {
      unrelated: { command: "keep-me" },
      a: { command: "old-a" },
    };
    const store = {}; // "a" was removed from the store
    const result = mergeMcpIntoTool(currentTool, store, ["a"]);
    expect(result.merged).toEqual({ unrelated: { command: "keep-me" } });
    expect(result.removedKeys).toEqual(["a"]);
  });

  test("never removes a key the tool owns itself (not agentsync-owned)", () => {
    const currentTool = { manual: { command: "user-added" } };
    const result = mergeMcpIntoTool(currentTool, {}, []);
    expect(result.merged).toEqual({ manual: { command: "user-added" } });
    expect(result.removedKeys).toEqual([]);
  });
});
