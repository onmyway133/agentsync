import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Root of the agentsync store. Overridable via AGENTSYNC_HOME for tests.
 */
export const AGENTSYNC_HOME = process.env["AGENTSYNC_HOME"] ?? join(homedir(), ".agentsync");

export const STORE_DIR = join(AGENTSYNC_HOME, "store");
export const SOURCES_FILE = join(AGENTSYNC_HOME, "sources.json");
export const MANIFEST_FILE = join(AGENTSYNC_HOME, "manifest.json");

export const STORE_MCP_FILE = join(STORE_DIR, "mcp-servers.json");
export const STORE_AGENTS_DIR = join(STORE_DIR, "agents");
export const STORE_COMMANDS_DIR = join(STORE_DIR, "commands");
export const STORE_SKILLS_DIR = join(STORE_DIR, "skills");
export const STORE_INSTRUCTIONS_FILE = join(STORE_DIR, "instructions", "AGENTSYNC.md");
