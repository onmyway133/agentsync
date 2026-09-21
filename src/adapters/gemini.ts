import { join } from "node:path";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const geminiDir = () => join(home(), ".gemini");
const settingsJson = () => join(geminiDir(), "settings.json");
const instructionsFile = () => join(geminiDir(), "GEMINI.md");

export const geminiAdapter: ToolAdapter = {
  id: "gemini",
  displayName: "Gemini CLI",
  // Gemini custom commands are TOML-based and global support is unconfirmed,
  // so commands are not synced yet (see README "known gaps").
  capabilities: { mcp: true, agents: false, commands: false, skills: false, instructions: true },

  async readMcpServers(): Promise<McpServerMap> {
    return readJsonMcpServers(settingsJson(), "mcpServers");
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    writeJsonMcpServers("gemini", settingsJson(), "mcpServers", entries);
  },

  async listAgents(): Promise<FileResource[]> {
    return [];
  },
  agentPath(): string {
    throw new Error("Gemini CLI does not support subagents");
  },

  async listCommands(): Promise<FileResource[]> {
    return [];
  },
  commandPath(): string {
    throw new Error("Gemini CLI slash commands are not yet supported by agentsync (TOML format)");
  },

  async listSkills(): Promise<SkillResource[]> {
    return [];
  },
  skillPath(): string {
    throw new Error("Gemini CLI does not support skills");
  },

  instructionsPath(): string {
    return instructionsFile();
  },
};
