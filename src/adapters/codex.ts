import * as TOML from "@iarna/toml";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listMarkdownResources, markdownResourcePath } from "./common";
import { home } from "./home";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";
import { getOwnedMcpKeys, setOwnedMcpKeys } from "../store/manifest";
import { mergeMcpIntoTool } from "../store/mcp-merge";
import { ensureDir } from "../store/files";

const codexDir = () => join(home(), ".codex");
const configToml = () => join(codexDir(), "config.toml");
const promptsDir = () => join(codexDir(), "prompts");
const instructionsFile = () => join(codexDir(), "AGENTS.md");

function readConfig(): Record<string, unknown> {
  if (!existsSync(configToml())) return {};
  return TOML.parse(readFileSync(configToml(), "utf8")) as Record<string, unknown>;
}

export const codexAdapter: ToolAdapter = {
  id: "codex",
  displayName: "Codex CLI",
  capabilities: { mcp: true, agents: false, commands: true, skills: false, instructions: true },

  async readMcpServers(): Promise<McpServerMap> {
    const config = readConfig();
    return (config["mcp_servers"] as McpServerMap | undefined) ?? {};
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    const config = readConfig();
    const currentToolMap = (config["mcp_servers"] as McpServerMap | undefined) ?? {};
    const result = mergeMcpIntoTool(currentToolMap, entries, getOwnedMcpKeys("codex"));
    config["mcp_servers"] = result.merged;
    ensureDir(codexDir());
    writeFileSync(configToml(), TOML.stringify(config as TOML.JsonMap), "utf8");
    setOwnedMcpKeys("codex", result.ownedKeys);
  },

  async listAgents(): Promise<FileResource[]> {
    return [];
  },
  agentPath(): string {
    throw new Error("Codex CLI does not support subagents");
  },

  // Codex "custom prompts" (~/.codex/prompts/*.md) are the closest analog to slash commands.
  async listCommands(): Promise<FileResource[]> {
    return listMarkdownResources(promptsDir());
  },
  commandPath(name: string): string {
    return markdownResourcePath(promptsDir(), name);
  },

  async listSkills(): Promise<SkillResource[]> {
    return [];
  },
  skillPath(): string {
    throw new Error("Codex CLI does not support skills");
  },

  instructionsPath(): string {
    return instructionsFile();
  },

  scanPaths(): string[] {
    return [codexDir()];
  },
};
