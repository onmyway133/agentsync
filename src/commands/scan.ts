import { existsSync } from "node:fs";
import { adapters } from "../adapters";
import type { ToolAdapter } from "../adapters/types";
import { readSources } from "../store/manifest";
import { log } from "../ui/logger";

interface ScanRow {
  adapter: ToolAdapter;
  detected: boolean;
  registered: boolean;
  mcp: number;
  agents: number;
  commands: number;
  skills: number;
  instructions: boolean;
}

async function scanAdapter(adapter: ToolAdapter, registeredIds: Set<string>): Promise<ScanRow> {
  const detected = adapter.scanPaths().some((p) => existsSync(p));

  const [mcpServers, agentList, commandList, skillList] = await Promise.all([
    adapter.capabilities.mcp ? adapter.readMcpServers().catch(() => ({})) : Promise.resolve({}),
    adapter.capabilities.agents ? adapter.listAgents().catch(() => []) : Promise.resolve([]),
    adapter.capabilities.commands ? adapter.listCommands().catch(() => []) : Promise.resolve([]),
    adapter.capabilities.skills ? adapter.listSkills().catch(() => []) : Promise.resolve([]),
  ]);

  let instructions = false;
  if (adapter.capabilities.instructions) {
    try {
      instructions = existsSync(adapter.instructionsPath());
    } catch {
      instructions = false;
    }
  }

  return {
    adapter,
    detected,
    registered: registeredIds.has(adapter.id),
    mcp: Object.keys(mcpServers).length,
    agents: agentList.length,
    commands: commandList.length,
    skills: skillList.length,
    instructions,
  };
}

/**
 * Scan the local machine for AI coding tool configs (e.g. `~/.claude`,
 * `~/.copilot`) and report which are detected, what resources they hold,
 * and whether they're already registered as an agentsync source.
 */
export async function runScan(): Promise<void> {
  const { sources } = readSources();
  const registeredIds = new Set(sources.filter((s) => s.type === "tool").map((s) => s.id));

  const rows = await Promise.all(adapters.map((a) => scanAdapter(a, registeredIds)));

  log.heading("Scanning for installed AI coding tools");
  console.log();

  const found = rows.filter((r) => r.detected);
  const missing = rows.filter((r) => !r.detected);

  if (found.length === 0) {
    log.skip("(no known tool configs found under your home directory)");
    return;
  }

  for (const row of found) {
    const parts: string[] = [];
    if (row.adapter.capabilities.mcp) parts.push(`mcp:${row.mcp}`);
    if (row.adapter.capabilities.agents) parts.push(`agents:${row.agents}`);
    if (row.adapter.capabilities.commands) parts.push(`commands:${row.commands}`);
    if (row.adapter.capabilities.skills) parts.push(`skills:${row.skills}`);
    if (row.adapter.capabilities.instructions) parts.push(`instructions:${row.instructions ? "yes" : "no"}`);

    const status = row.registered ? "registered" : "not registered";
    log.success(`${row.adapter.displayName} (${row.adapter.id}) — ${parts.join(", ")} — ${status}`);
    if (!row.registered) {
      log.skip(`  run \`agentsync pull ${row.adapter.id}\` to bring it into the store`);
    }
  }

  if (missing.length > 0) {
    console.log();
    log.skip(`not detected: ${missing.map((r) => r.adapter.id).join(", ")}`);
  }
}
