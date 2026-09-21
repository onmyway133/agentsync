import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mergeMcpIntoTool } from "../store/mcp-merge";
import { getOwnedMcpKeys, setOwnedMcpKeys } from "../store/manifest";
import { ensureDir } from "../store/files";
import type { McpServerMap } from "./types";

/**
 * Shared helper for tools that store MCP servers as `{ [mcpKey]: { <name>: {...} } }`
 * inside an otherwise-arbitrary JSON config file (Claude Code, Copilot, Gemini,
 * Cursor all use this shape with `mcpKey = "mcpServers"`).
 */
export function readJsonMcpServers(configPath: string, mcpKey: string): McpServerMap {
  if (!existsSync(configPath)) return {};
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  return (raw[mcpKey] as McpServerMap | undefined) ?? {};
}

export function writeJsonMcpServers(
  toolId: string,
  configPath: string,
  mcpKey: string,
  storeMap: McpServerMap,
): void {
  const existing: Record<string, unknown> = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>)
    : {};
  const currentToolMap = (existing[mcpKey] as McpServerMap | undefined) ?? {};
  const result = mergeMcpIntoTool(currentToolMap, storeMap, getOwnedMcpKeys(toolId));
  existing[mcpKey] = result.merged;
  ensureDir(dirname(configPath));
  writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n", "utf8");
  setOwnedMcpKeys(toolId, result.ownedKeys);
}
