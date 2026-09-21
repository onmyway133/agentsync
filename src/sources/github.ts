import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { McpServerMap } from "../adapters/types";
import { ensureDir, hashContent, listMarkdownFiles, listSubdirectories, readFileIfExists, writeFileEnsuringDir } from "../store/files";
import { mergeToolIntoStore } from "../store/mcp-merge";
import { STORE_AGENTS_DIR, STORE_COMMANDS_DIR, STORE_INSTRUCTIONS_FILE, STORE_MCP_FILE, STORE_SKILLS_DIR } from "../store/paths";
import { log } from "../ui/logger";

export interface GithubPullOptions {
  ref?: string;
  dryRun?: boolean;
}

/**
 * Pull a Claude-Code-shaped repo (`agents/*.md`, `commands/*.md`,
 * `skills/<name>/SKILL.md`, `.mcp.json` with `mcpServers`, `CLAUDE.md` or
 * `AGENTS.md`) into the canonical store. Content is copied (not symlinked,
 * since the clone is deleted afterwards); conflicts are reported and skipped
 * rather than prompted, since there's no "tool" side to fall back to.
 */
export async function pullFromGithub(ownerRepo: string, options: GithubPullOptions = {}): Promise<void> {
  log.heading(`Pulling from github:${ownerRepo}`);
  const tmp = mkdtempSync(join(tmpdir(), "agentsync-src-"));
  try {
    const branchArgs = options.ref ? ["--branch", options.ref] : [];
    execSync(
      ["git", "clone", "--depth", "1", ...branchArgs, `https://github.com/${ownerRepo}.git`, tmp]
        .map((a) => `'${a.replace(/'/g, "'\\''")}'`)
        .join(" "),
      { stdio: "pipe" },
    );

    copyMarkdownDir(join(tmp, "agents"), STORE_AGENTS_DIR, "agents", options.dryRun);
    copyMarkdownDir(join(tmp, "commands"), STORE_COMMANDS_DIR, "commands", options.dryRun);
    copySkillsDir(join(tmp, "skills"), options.dryRun);
    copyMcp(tmp, options.dryRun);
    copyInstructions(tmp, options.dryRun);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function copyMarkdownDir(sourceDir: string, storeDir: string, label: string, dryRun?: boolean): void {
  const names = listMarkdownFiles(sourceDir);
  if (names.length === 0) {
    log.skip(`${label}: none found in repo`);
    return;
  }
  ensureDir(storeDir);
  for (const name of names) {
    const content = readFileSync(join(sourceDir, `${name}.md`), "utf8");
    const storePath = join(storeDir, `${name}.md`);
    const existing = readFileIfExists(storePath);
    if (existing !== null && hashContent(existing) !== hashContent(content)) {
      log.warn(`${label}/${name}: differs from store, skipping (resolve manually)`);
      continue;
    }
    log.success(`${label}/${name}: pulled`);
    if (!dryRun) writeFileEnsuringDir(storePath, content);
  }
}

function copySkillsDir(sourceDir: string, dryRun?: boolean): void {
  const names = listSubdirectories(sourceDir);
  if (names.length === 0) {
    log.skip("skills: none found in repo");
    return;
  }
  ensureDir(STORE_SKILLS_DIR);
  for (const name of names) {
    const storeDir = join(STORE_SKILLS_DIR, name);
    if (existsSync(storeDir)) {
      log.warn(`skills/${name}: already exists in store, skipping`);
      continue;
    }
    log.success(`skills/${name}: pulled`);
    if (!dryRun) {
      cpSync(join(sourceDir, name), storeDir, { recursive: true });
    }
  }
}

function copyMcp(repoRoot: string, dryRun?: boolean): void {
  const candidates = [".mcp.json", "mcp-servers.json"];
  for (const candidate of candidates) {
    const path = join(repoRoot, candidate);
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const toolMap = ((raw["mcpServers"] as McpServerMap | undefined) ?? (raw as McpServerMap));
    const count = Object.keys(toolMap).length;
    log.success(`mcp: ${count} server(s) pulled from ${candidate}`);
    if (!dryRun) {
      const existing = readFileIfExists(STORE_MCP_FILE);
      const merged = mergeToolIntoStore(existing ? JSON.parse(existing) : {}, toolMap);
      writeFileEnsuringDir(STORE_MCP_FILE, JSON.stringify(merged, null, 2) + "\n");
    }
    return;
  }
  log.skip("mcp: no .mcp.json/mcp-servers.json found in repo");
}

function copyInstructions(repoRoot: string, dryRun?: boolean): void {
  for (const candidate of ["CLAUDE.md", "AGENTS.md"]) {
    const path = join(repoRoot, candidate);
    if (!existsSync(path)) continue;
    log.success(`instructions: pulled from ${candidate}`);
    if (!dryRun) writeFileEnsuringDir(STORE_INSTRUCTIONS_FILE, readFileSync(path, "utf8"));
    return;
  }
  log.skip("instructions: no CLAUDE.md/AGENTS.md found in repo");
}
