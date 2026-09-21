import type { ResourceType } from "../adapters/types";
import { getAdapter } from "../adapters";
import { pushToTool } from "../sync";

export interface PushFlags {
  dryRun?: boolean;
  yes?: boolean;
  type?: string;
}

export async function runPush(tool: string, flags: PushFlags): Promise<void> {
  const adapter = getAdapter(tool);
  const types = flags.type ? (flags.type.split(",") as ResourceType[]) : undefined;
  await pushToTool(adapter, { dryRun: flags.dryRun, yes: flags.yes, types });
}
