import { join } from "node:path";
import { listSkillResources, skillResourcePath } from "./common";
import { home } from "./home";
import { readJsonMcpServers, writeJsonMcpServers } from "./json-mcp";
import type { FileResource, McpServerMap, SkillResource, ToolAdapter } from "./types";

const copilotDir = () => join(home(), ".copilot");
const mcpConfig = () => join(copilotDir(), "mcp-config.json");
const agentsDir = () => join(copilotDir(), "agents");
const skillsDir = () => join(copilotDir(), "skills");
const instructionsFile = () => join(copilotDir(), "copilot-instructions.md");

export const copilotAdapter: ToolAdapter = {
  id: "copilot",
  displayName: "GitHub Copilot CLI",
  // No confirmed user-level slash command directory. User-level instructions
  // are supported at $HOME/.copilot/copilot-instructions.md.
  capabilities: { mcp: true, agents: true, commands: false, skills: true, instructions: true },

  async readMcpServers(): Promise<McpServerMap> {
    return readJsonMcpServers(mcpConfig(), "mcpServers");
  },
  async writeMcpServers(entries: McpServerMap): Promise<void> {
    writeJsonMcpServers("copilot", mcpConfig(), "mcpServers", entries);
  },

  async listAgents(): Promise<FileResource[]> {
    const { readFileSync, existsSync } = await import("node:fs");
    return listSkillResources(agentsDir())
      .filter(({ dirPath }) => existsSync(join(dirPath, "AGENT.md")))
      .map(({ name, dirPath }) => ({ name, content: readFileSync(join(dirPath, "AGENT.md"), "utf8") }));
  },
  agentPath(name: string): string {
    return join(agentsDir(), name, "AGENT.md");
  },

  async listCommands(): Promise<FileResource[]> {
    return [];
  },
  commandPath(name: string): string {
    throw new Error("Copilot CLI has no known user-level slash command directory");
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
};
