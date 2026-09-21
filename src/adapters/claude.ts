import { existsSync } from "node:fs";
import { join } from "node:path";
import { listMarkdownResources, listSkillResources, markdownResourcePath, skillResourcePath } from "./common";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const claudeJson = () => join(home(), ".claude.json");
const claudeDir = () => join(home(), ".claude");
const agentsDir = () => join(claudeDir(), "agents");
const commandsDir = () => join(claudeDir(), "commands");
const skillsDir = () => join(claudeDir(), "skills");
/**
 * Claude Code now prefers AGENTS.md (CLAUDE.md is still supported). Use
 * AGENTS.md if it already exists, otherwise fall back to an existing
 * CLAUDE.md; if neither exists yet, default to the new AGENTS.md name.
 */
const instructionsFile = () => {
  const agentsMd = join(claudeDir(), "AGENTS.md");
  const claudeMd = join(claudeDir(), "CLAUDE.md");
  return existsSync(claudeMd) && !existsSync(agentsMd) ? claudeMd : agentsMd;
};

export const claudeAdapter: ToolAdapter = {
  id: "claude",
  displayName: "Claude Code",
  capabilities: { mcp: true, agents: true, commands: true, skills: true, instructions: true },

  async readMcpServers(): Promise<McpServerMap> {
    return readJsonMcpServers(claudeJson(), "mcpServers");
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    writeJsonMcpServers("claude", claudeJson(), "mcpServers", entries);
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
    return [claudeDir(), claudeJson()];
  },
};
