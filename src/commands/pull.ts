import type { ResourceType } from "../adapters/types";
import { getAdapter, listToolIds } from "../adapters";
import { pullFromGithub } from "../sources/github";
import { upsertSource } from "../store/manifest";
import { pullFromTool } from "../sync";
import { log } from "../ui/logger";

export interface PullFlags {
  dryRun?: boolean;
  yes?: boolean;
  type?: string;
}

function parseTypes(type?: string): ResourceType[] | undefined {
  return type ? (type.split(",") as ResourceType[]) : undefined;
}

export async function runPull(target: string, flags: PullFlags): Promise<void> {
  const options = { dryRun: flags.dryRun, yes: flags.yes, types: parseTypes(flags.type) };

  if (target.startsWith("github:")) {
    const repo = target.slice("github:".length);
    await pullFromGithub(repo, { dryRun: flags.dryRun });
    if (!flags.dryRun) upsertSource({ type: "github", id: repo });
    return;
  }

  if (!listToolIds().includes(target)) {
    log.error(`Unknown pull target "${target}". Expected a tool (${listToolIds().join(", ")}) or "github:owner/repo".`);
    process.exitCode = 1;
    return;
  }

  const adapter = getAdapter(target);
  await pullFromTool(adapter, options);
  if (!flags.dryRun) upsertSource({ type: "tool", id: adapter.id });
}
