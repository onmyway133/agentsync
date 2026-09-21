import { join } from "node:path";
import { listMarkdownResources, listSkillResources, markdownResourcePath, skillResourcePath } from "./common";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const cursorDir = () => join(home(), ".cursor");
const mcpJson = () => join(cursorDir(), "mcp.json");
const agentsDir = () => join(cursorDir(), "agents");
const skillsDir = () => join(cursorDir(), "skills");

export const cursorAdapter: ToolAdapter = {
  id: "cursor",
  displayName: "Cursor",
  // Cursor subagents (~/.cursor/agents/*.md) and skills (~/.cursor/skills/<name>/SKILL.md)
  // now use the same shape as Claude Code. Slash commands and global instructions are
  // still project-scoped only (.cursor/rules/*.mdc), no confirmed global path.
  capabilities: { mcp: true, agents: true, commands: false, skills: true, instructions: false },

  async readMcpServers(): Promise<McpServerMap> {
    return readJsonMcpServers(mcpJson(), "mcpServers");
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    writeJsonMcpServers("cursor", mcpJson(), "mcpServers", entries);
  },

  async listAgents(): Promise<FileResource[]> {
    return listMarkdownResources(agentsDir());
  },
  agentPath(name: string): string {
    return markdownResourcePath(agentsDir(), name);
  },

  async listCommands(): Promise<FileResource[]> {
    return [];
  },
  commandPath(): string {
    throw new Error("Cursor does not support slash commands");
  },

  async listSkills(): Promise<SkillResource[]> {
    return listSkillResources(skillsDir());
  },
  skillPath(name: string): string {
    return skillResourcePath(skillsDir(), name);
  },

  instructionsPath(): string {
    throw new Error("Cursor has no confirmed global instructions path");
  },

  scanPaths(): string[] {
    return [cursorDir()];
  },
};
