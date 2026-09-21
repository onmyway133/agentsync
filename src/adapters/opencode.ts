import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listMarkdownResources, listSkillResources, markdownResourcePath, skillResourcePath } from "./common";
import { home } from "./home";
import { getOwnedMcpKeys, setOwnedMcpKeys } from "../store/manifest";
import { mergeMcpIntoTool } from "../store/mcp-merge";
import { ensureDir } from "../store/files";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const opencodeDir = () => join(home(), ".config", "opencode");
const configJson = () => join(opencodeDir(), "opencode.json");
const instructionsFile = () => join(opencodeDir(), "AGENTS.md");

/**
 * OpenCode's directory naming (singular vs. plural) isn't fully confirmed
 * across versions. Prefer whichever candidate already exists on disk; fall
 * back to the first candidate (creating it) if neither does.
 */
function resolveDir(candidates: string[]): string {
  for (const c of candidates) {
    const full = join(opencodeDir(), c);
    if (existsSync(full)) return full;
  }
  return join(opencodeDir(), candidates[0] as string);
}

const agentsDir = () => resolveDir(["agent", "agents"]);
const commandsDir = () => resolveDir(["command", "commands"]);
const skillsDir = () => resolveDir(["skill", "skills"]);

/** OpenCode's `mcp` entries use `{type: "local"|"remote", ...}` instead of Claude's shape. */
function toCanonical(entry: Record<string, unknown>): Record<string, unknown> {
  if (entry["type"] === "remote") {
    return { type: "http", url: entry["url"] };
  }
  const command = entry["command"];
  const [cmd, ...args] = Array.isArray(command) ? (command as string[]) : [String(command)];
  return { command: cmd, args, env: entry["environment"] ?? {} };
}

function fromCanonical(entry: Record<string, unknown>): Record<string, unknown> {
  if (entry["type"] === "http" || entry["type"] === "sse" || "url" in entry) {
    return { type: "remote", url: entry["url"], enabled: true };
  }
  const command = [entry["command"], ...((entry["args"] as string[] | undefined) ?? [])];
  return { type: "local", command, environment: entry["env"] ?? {}, enabled: true };
}

function readConfig(): Record<string, unknown> {
  if (!existsSync(configJson())) return {};
  return JSON.parse(readFileSync(configJson(), "utf8")) as Record<string, unknown>;
}

export const opencodeAdapter: ToolAdapter = {
  id: "opencode",
  displayName: "OpenCode",
  capabilities: { mcp: true, agents: true, commands: true, skills: true, instructions: true },

  async readMcpServers(): Promise<McpServerMap> {
    const raw = (readConfig()["mcp"] as Record<string, Record<string, unknown>> | undefined) ?? {};
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, toCanonical(v)]));
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    const config = readConfig();
    const currentToolMap = (config["mcp"] as McpServerMap | undefined) ?? {};
    const canonicalCurrent = Object.fromEntries(
      Object.entries(currentToolMap).map(([k, v]) => [k, toCanonical(v as Record<string, unknown>)]),
    );
    const result = mergeMcpIntoTool(canonicalCurrent, entries, getOwnedMcpKeys("opencode"));
    const nativeMerged = Object.fromEntries(
      Object.entries(result.merged).map(([k, v]) => [k, fromCanonical(v as Record<string, unknown>)]),
    );
    config["mcp"] = nativeMerged;
    ensureDir(opencodeDir());
    writeFileSync(configJson(), JSON.stringify(config, null, 2) + "\n", "utf8");
    setOwnedMcpKeys("opencode", result.ownedKeys);
  },

  async listAgents(): Promise<FileResource[]> {
    return listMarkdownResources(agentsDir());
  },
  agentPath(name: string): string {
    return markdownResourcePath(agentsDir(), name);
  },

  async listCommands(): Promise<FileResource[]> {
    return listMarkdownResources(commandsDir());
  },
  commandPath(name: string): string {
    return markdownResourcePath(commandsDir(), name);
  },

  async listSkills(): Promise<SkillResource[]> {
    return listSkillResources(skillsDir());
  },
  skillPath(name: string): string {
    return skillResourcePath(skillsDir(), name);
  },

  instructionsPath(): string {
    return instructionsFile();
  },

  scanPaths(): string[] {
    return [opencodeDir()];
  },
};
