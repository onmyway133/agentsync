import { claudeAdapter } from "./claude";
import { codexAdapter } from "./codex";
import { copilotAdapter } from "./copilot";
import { cursorAdapter } from "./cursor";
import { geminiAdapter } from "./gemini";
import { opencodeAdapter } from "./opencode";
import type { ToolAdapter } from "./types";

export const adapters: ToolAdapter[] = [
  claudeAdapter,
  codexAdapter,
  copilotAdapter,
  geminiAdapter,
  opencodeAdapter,
  cursorAdapter,
];

const byId = new Map(adapters.map((a) => [a.id, a]));

export function getAdapter(id: string): ToolAdapter {
  const adapter = byId.get(id);
  if (!adapter) {
    throw new Error(`Unknown tool "${id}". Supported: ${adapters.map((a) => a.id).join(", ")}`);
  }
  return adapter;
}

export function listToolIds(): string[] {
  return adapters.map((a) => a.id);
}

export * from "./types";
