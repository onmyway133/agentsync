import { join } from "node:path";
import { listMarkdownResources, listSkillResources, markdownResourcePath, skillResourcePath } from "./common";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const geminiDir = () => join(home(), ".gemini");
const settingsJson = () => join(geminiDir(), "settings.json");
const agentsDir = () => join(geminiDir(), "agents");
const skillsDir = () => join(geminiDir(), "skills");
const instructionsFile = () => join(geminiDir(), "GEMINI.md");

export const geminiAdapter: ToolAdapter = {
  id: "gemini",
  displayName: "Gemini CLI",
  // Gemini subagents (~/.gemini/agents/*.md, YAML frontmatter) and skills
  // (~/.gemini/skills/<name>/SKILL.md) are the same shape as Claude Code's,
  // so they sync directly. Gemini custom commands are TOML-based (different
  // shape from the store's markdown commands), so they're not synced yet
  // (see README "known gaps").
  capabilities: { mcp: true, agents: true, commands: false, skills: true, instructions: true },

  async readMcpServers(): Promise<McpServerMap> {
    return readJsonMcpServers(settingsJson(), "mcpServers");
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    writeJsonMcpServers("gemini", settingsJson(), "mcpServers", entries);
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
    throw new Error("Gemini CLI slash commands are not yet supported by agentsync (TOML format)");
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
    return [geminiDir()];
  },
};
