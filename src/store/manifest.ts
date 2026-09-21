import { readFileIfExists, writeFileEnsuringDir } from "./files";
import { MANIFEST_FILE, SOURCES_FILE } from "./paths";

export interface ToolSource {
  type: "tool";
  id: string; // adapter id, e.g. "claude"
}

export interface GithubSource {
  type: "github";
  id: string; // "owner/repo"
  ref?: string; // branch/tag, defaults to repo default branch
}

export type Source = ToolSource | GithubSource;

export interface SourcesFile {
  version: 1;
  sources: Array<Source & { lastSyncedAt?: string }>;
}

export interface ManifestFile {
  version: 1;
  /** MCP server keys agentsync currently owns in each tool's live config. */
  mcpOwnedKeys: Record<string, string[]>;
  updatedAt: string;
}

function emptySources(): SourcesFile {
  return { version: 1, sources: [] };
}

function emptyManifest(): ManifestFile {
  return { version: 1, mcpOwnedKeys: {}, updatedAt: new Date().toISOString() };
}

export function readSources(): SourcesFile {
  const raw = readFileIfExists(SOURCES_FILE);
  if (!raw) return emptySources();
  return JSON.parse(raw) as SourcesFile;
}

export function writeSources(data: SourcesFile): void {
  writeFileEnsuringDir(SOURCES_FILE, JSON.stringify(data, null, 2) + "\n");
}

export function readManifest(): ManifestFile {
  const raw = readFileIfExists(MANIFEST_FILE);
  if (!raw) return emptyManifest();
  return JSON.parse(raw) as ManifestFile;
}

export function writeManifest(data: ManifestFile): void {
  writeFileEnsuringDir(MANIFEST_FILE, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2) + "\n");
}

/** Record that `toolId` now owns exactly `keys` for MCP servers (replaces prior list). */
export function setOwnedMcpKeys(toolId: string, keys: string[]): void {
  const manifest = readManifest();
  manifest.mcpOwnedKeys[toolId] = keys;
  writeManifest(manifest);
}

export function getOwnedMcpKeys(toolId: string): string[] {
  return readManifest().mcpOwnedKeys[toolId] ?? [];
}

export function upsertSource(source: Source): void {
  const data = readSources();
  const idx = data.sources.findIndex((s) => s.type === source.type && s.id === source.id);
  const entry = { ...source, lastSyncedAt: new Date().toISOString() };
  if (idx >= 0) data.sources[idx] = entry;
  else data.sources.push(entry);
  writeSources(data);
}
