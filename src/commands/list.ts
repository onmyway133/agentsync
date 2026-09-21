import { existsSync } from "node:fs";
import { listMarkdownFiles, listSubdirectories, readFileIfExists } from "../store/files";
import { readSources } from "../store/manifest";
import { STORE_AGENTS_DIR, STORE_COMMANDS_DIR, STORE_INSTRUCTIONS_FILE, STORE_MCP_FILE, STORE_SKILLS_DIR } from "../store/paths";
import { log } from "../ui/logger";

export function runList(): void {
  const { sources } = readSources();
  log.heading("Registered sources");
  if (sources.length === 0) {
    log.skip("(none yet — run `agentsync pull <tool>` or `agentsync pull github:owner/repo`)");
  } else {
    for (const s of sources) {
      const label = s.type === "github" ? `github:${s.id}` : s.id;
      console.log(`  - ${label}${s.lastSyncedAt ? ` (last synced ${s.lastSyncedAt})` : ""}`);
    }
  }

  console.log();
  log.heading("Store contents");
  const mcpRaw = readFileIfExists(STORE_MCP_FILE);
  const mcpCount = mcpRaw ? Object.keys(JSON.parse(mcpRaw)).length : 0;
  console.log(`  mcp servers:   ${mcpCount}`);
  console.log(`  agents:        ${listMarkdownFiles(STORE_AGENTS_DIR).length}`);
  console.log(`  commands:      ${listMarkdownFiles(STORE_COMMANDS_DIR).length}`);
  console.log(`  skills:        ${listSubdirectories(STORE_SKILLS_DIR).length}`);
  console.log(`  instructions:  ${existsSync(STORE_INSTRUCTIONS_FILE) ? "present" : "none"}`);
}
