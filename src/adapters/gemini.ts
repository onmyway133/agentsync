import { join } from "node:path";
import { listMarkdownResources, listResourcesWithExt, listSkillResources, markdownResourcePath, resourcePathWithExt, skillResourcePath } from "./common";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import { geminiCommandToNative, geminiCommandToStore } from "./toml-commands";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const geminiDir = () => join(home(), ".gemini");
const settingsJson = () => join(geminiDir(), "settings.json");
const agentsDir = () => join(geminiDir(), "agents");
const commandsDir = () => join(geminiDir(), "commands");
const skillsDir = () => join(geminiDir(), "skills");
const instructionsFile = () => join(geminiDir(), "GEMINI.md");

export const geminiAdapter: ToolAdapter = {
  id: "gemini",
  displayName: "Gemini CLI",
  // Gemini subagents (~/.gemini/agents/*.md, YAML frontmatter) and skills
  // (~/.gemini/skills/<name>/SKILL.md) are the same shape as Claude Code's,
  // so they sync directly. Gemini custom commands are TOML
  // (~/.gemini/commands/*.toml, `{ description, prompt }` with `{{args}}`),
  // so they're synced via content conversion (see `commandsConversion`)
  // rather than a symlink.
  capabilities: { mcp: true, agents: true, commands: true, skills: true, instructions: true },
  commandsConversion: {
    toStore: geminiCommandToStore,
    toNative: geminiCommandToNative,
  },

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
    return listResourcesWithExt(commandsDir(), "toml");
  },
  commandPath(name: string): string {
    return resourcePathWithExt(commandsDir(), name, "toml");
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
