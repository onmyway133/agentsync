import { join } from "node:path";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const cursorDir = () => join(home(), ".cursor");
const mcpJson = () => join(cursorDir(), "mcp.json");

export const cursorAdapter: ToolAdapter = {
  id: "cursor",
  displayName: "Cursor",
  // Cursor has no subagents, slash commands, or skills; global rules/instructions
  // are primarily project-scoped (.cursor/rules/*.mdc), no confirmed global path.
  capabilities: { mcp: true, agents: false, commands: false, skills: false, instructions: false },

  async readMcpServers(): Promise<McpServerMap> {
    return readJsonMcpServers(mcpJson(), "mcpServers");
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    writeJsonMcpServers("cursor", mcpJson(), "mcpServers", entries);
  },

  async listAgents(): Promise<FileResource[]> {
    return [];
  },
  agentPath(): string {
    throw new Error("Cursor does not support subagents");
  },

  async listCommands(): Promise<FileResource[]> {
    return [];
  },
  commandPath(): string {
    throw new Error("Cursor does not support slash commands");
  },

  async listSkills(): Promise<SkillResource[]> {
    return [];
  },
  skillPath(): string {
    throw new Error("Cursor does not support skills");
  },

  instructionsPath(): string {
    throw new Error("Cursor has no confirmed global instructions path");
  },

  scanPaths(): string[] {
    return [cursorDir()];
  },
};
