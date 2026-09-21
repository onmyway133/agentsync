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

/**
 * Recognizes "github:owner/repo[#ref]" as well as common GitHub URL forms:
 * https://github.com/owner/repo(.git)?, https://github.com/owner/repo/tree/<ref>,
 * git@github.com:owner/repo.git, and bare github.com/owner/repo. Returns
 * null if `target` isn't a GitHub reference at all.
 */
export function parseGithubTarget(target: string): { repo: string; ref?: string } | null {
  if (target.startsWith("github:")) {
    const rest = target.slice("github:".length);
    const [repo, ref] = rest.split("#");
    return repo ? { repo, ref } : null;
  }

  const sshMatch = target.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch?.[1]) return { repo: sshMatch[1] };

  const urlMatch = target.match(
    /^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?(?:\/tree\/([^/#]+))?\/?(?:#.*)?$/,
  );
  if (urlMatch?.[1] && urlMatch[2]) {
    return { repo: `${urlMatch[1]}/${urlMatch[2]}`, ref: urlMatch[3] };
  }

  return null;
}

export async function runPull(target: string, flags: PullFlags): Promise<void> {
  const options = { dryRun: flags.dryRun, yes: flags.yes, types: parseTypes(flags.type) };

  const github = parseGithubTarget(target);
  if (github) {
    await pullFromGithub(github.repo, { dryRun: flags.dryRun, ref: github.ref });
    if (!flags.dryRun) upsertSource({ type: "github", id: github.repo, ref: github.ref });
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
