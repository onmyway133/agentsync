import { MARKER_END, MARKER_START } from "../adapters/types";

/**
 * Replace (or append) the agentsync-managed block inside a tool's instructions
 * file, leaving any surrounding tool-specific content untouched.
 */
export function upsertMarkerBlock(existingContent: string | null, blockContent: string): string {
  const block = `${MARKER_START}\n${blockContent.trim()}\n${MARKER_END}`;
  if (!existingContent) return block + "\n";

  const startIdx = existingContent.indexOf(MARKER_START);
  const endIdx = existingContent.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    const sep = existingContent.endsWith("\n") ? "\n" : "\n\n";
    return existingContent + sep + block + "\n";
  }

  const before = existingContent.slice(0, startIdx);
  const after = existingContent.slice(endIdx + MARKER_END.length);
  return before + block + after;
}

/** Extract the agentsync-managed block content from a tool's instructions file, if present. */
export function extractMarkerBlock(content: string | null): string | null {
  if (!content) return null;
  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
  return content.slice(startIdx + MARKER_START.length, endIdx).trim();
}
