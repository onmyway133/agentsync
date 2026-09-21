import type { McpServerMap } from "../adapters/types";

export interface McpMergeResult {
  merged: McpServerMap;
  ownedKeys: string[];
  removedKeys: string[];
  addedOrUpdatedKeys: string[];
}

/**
 * Merge the canonical store's MCP servers into a tool's live config map,
 * without disturbing entries the tool owns itself.
 *
 * - Keys present in `storeMap` are written/overwritten in the result.
 * - Keys previously owned by agentsync (`previouslyOwnedKeys`) but no longer
 *   present in `storeMap` are removed (they were deleted from the store).
 * - Any other key in `currentToolMap` (never agentsync-owned) is left untouched.
 */
export function mergeMcpIntoTool(
  currentToolMap: McpServerMap,
  storeMap: McpServerMap,
  previouslyOwnedKeys: string[],
): McpMergeResult {
  const merged: McpServerMap = { ...currentToolMap };
  const removedKeys: string[] = [];
  const addedOrUpdatedKeys: string[] = [];

  const storeKeys = new Set(Object.keys(storeMap));

  for (const key of previouslyOwnedKeys) {
    if (!storeKeys.has(key) && key in merged) {
      delete merged[key];
      removedKeys.push(key);
    }
  }

  for (const [key, value] of Object.entries(storeMap)) {
    merged[key] = value;
    addedOrUpdatedKeys.push(key);
  }

  return { merged, ownedKeys: Object.keys(storeMap), removedKeys, addedOrUpdatedKeys };
}

/**
 * Merge a tool's live MCP servers into the canonical store map (used by `pull`).
 * Tool entries always win for keys they define; store-only keys are preserved.
 */
export function mergeToolIntoStore(storeMap: McpServerMap, toolMap: McpServerMap): McpServerMap {
  return { ...storeMap, ...toolMap };
}
