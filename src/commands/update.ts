import { getAdapter } from "../adapters";
import { pullFromGithub } from "../sources/github";
import { readSources } from "../store/manifest";
import { pullFromTool } from "../sync";
import { log } from "../ui/logger";
import type { PullFlags } from "./pull";

export async function runUpdate(sourceId: string | undefined, flags: PullFlags): Promise<void> {
  const { sources } = readSources();
  if (sources.length === 0) {
    log.warn("No registered sources yet. Run `agentsync pull <tool>` or `agentsync pull github:owner/repo` first.");
    return;
  }

  const targets = sourceId ? sources.filter((s) => s.id === sourceId) : sources;
  if (targets.length === 0) {
    log.error(`No registered source matches "${sourceId}".`);
    process.exitCode = 1;
    return;
  }

  for (const source of targets) {
    if (source.type === "github") {
      await pullFromGithub(source.id, { dryRun: flags.dryRun, ref: source.ref });
    } else {
      await pullFromTool(getAdapter(source.id), { dryRun: flags.dryRun, yes: flags.yes });
    }
  }
}
