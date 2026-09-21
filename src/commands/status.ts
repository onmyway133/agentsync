import { getAdapter } from "../adapters";
import { pullFromTool } from "../sync";
import { log } from "../ui/logger";

/** Show what a `pull` from this tool would change, without writing anything. */
export async function runStatus(tool: string): Promise<void> {
  const adapter = getAdapter(tool);
  log.info(`Comparing store against ${adapter.displayName} (dry run, nothing will change)`);
  await pullFromTool(adapter, { dryRun: true });
}
