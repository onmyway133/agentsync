/** Canonical resource kinds agentsync knows how to sync. */
export type ResourceType = "mcp" | "agents" | "commands" | "skills" | "instructions";

export const ALL_RESOURCE_TYPES: ResourceType[] = [
  "mcp",
  "agents",
  "commands",
  "skills",
  "instructions",
];

/** A single MCP server entry, kept as an opaque JSON-ish object (shape varies per tool). */
export type McpServerEntry = Record<string, unknown>;
export type McpServerMap = Record<string, McpServerEntry>;

/** A single markdown-file resource (a subagent or a slash command). */
export interface FileResource {
  /** File name without extension, e.g. "super-designer" */
  name: string;
  /** Raw file content (including frontmatter, if any). */
  content: string;
}

/** A skill: a directory containing SKILL.md plus optional supporting files. */
export interface SkillResource {
  name: string;
  /** Absolute path to the skill directory (source of truth on disk, in the store or the tool). */
  dirPath: string;
}

/**
 * Declares which resource types a tool adapter can read/write, so pull/push
 * can skip unsupported types with a clear warning instead of failing.
 */
export interface ToolCapabilities {
  mcp: boolean;
  agents: boolean;
  commands: boolean;
  skills: boolean;
  instructions: boolean;
}

export interface ToolAdapter {
  /** Stable identifier used on the CLI, e.g. "claude-code" */
  id: string;
  displayName: string;
  capabilities: ToolCapabilities;

  /** Read all MCP servers currently configured for this tool. */
  readMcpServers(): Promise<McpServerMap>;
  /**
   * Merge `entries` into the tool's live MCP config, without touching keys
   * not present in `entries` unless they're in `removeKeys` (previously
   * agentsync-owned keys that no longer exist in the store).
   */
  writeMcpServers(entries: McpServerMap, removeKeys: string[]): Promise<void>;

  listAgents(): Promise<FileResource[]>;
  /** Absolute path where a given agent file should live for this tool. */
  agentPath(name: string): string;

  listCommands(): Promise<FileResource[]>;
  commandPath(name: string): string;

  listSkills(): Promise<SkillResource[]>;
  /** Absolute path where a given skill directory should live for this tool. */
  skillPath(name: string): string;

  /** Absolute path to the tool's global instructions/memory file. */
  instructionsPath(): string;
}

export const MARKER_START = "<!-- agentsync:start -->";
export const MARKER_END = "<!-- agentsync:end -->";
