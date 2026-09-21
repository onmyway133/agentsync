import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { McpServerMap, ResourceType, ToolAdapter } from "./adapters/types";
import { extractMarkerBlock, upsertMarkerBlock } from "./store/instructions-merge";
import { mergeToolIntoStore } from "./store/mcp-merge";
import {
  ensureDir,
  ensureSymlink,
  hashContent,
  isSymlinkTo,
  readFileIfExists,
  writeFileEnsuringDir,
} from "./store/files";
import {
  STORE_AGENTS_DIR,
  STORE_COMMANDS_DIR,
  STORE_INSTRUCTIONS_FILE,
  STORE_MCP_FILE,
  STORE_SKILLS_DIR,
} from "./store/paths";
import { promptConflict } from "./ui/diff";
import { log } from "./ui/logger";

export interface SyncOptions {
  dryRun?: boolean;
  yes?: boolean;
  types?: ResourceType[];
}

function wants(options: SyncOptions, type: ResourceType): boolean {
  return !options.types || options.types.includes(type);
}

function readStoreMcp(): McpServerMap {
  const raw = readFileIfExists(STORE_MCP_FILE);
  return raw ? (JSON.parse(raw) as McpServerMap) : {};
}

function writeStoreMcp(map: McpServerMap): void {
  writeFileEnsuringDir(STORE_MCP_FILE, JSON.stringify(map, null, 2) + "\n");
}

/** Pull resources FROM a tool INTO the canonical store. */
export async function pullFromTool(adapter: ToolAdapter, options: SyncOptions = {}): Promise<void> {
  log.heading(`Pulling from ${adapter.displayName}`);

  if (adapter.capabilities.mcp && wants(options, "mcp")) {
    const toolMap = await adapter.readMcpServers();
    const merged = mergeToolIntoStore(readStoreMcp(), toolMap);
    const count = Object.keys(toolMap).length;
    if (count > 0) {
      log.info(`mcp: ${count} server(s) found`);
      if (!options.dryRun) writeStoreMcp(merged);
    } else {
      log.skip("mcp: nothing to pull");
    }
  }

  if (adapter.capabilities.agents && wants(options, "agents")) {
    await pullFileResources(adapter, "agents", STORE_AGENTS_DIR, options);
  }
  if (adapter.capabilities.commands && wants(options, "commands")) {
    await pullFileResources(adapter, "commands", STORE_COMMANDS_DIR, options);
  }
  if (adapter.capabilities.skills && wants(options, "skills")) {
    await pullSkills(adapter, options);
  }
  if (adapter.capabilities.instructions && wants(options, "instructions")) {
    await pullInstructions(adapter, options);
  }

  for (const type of ["mcp", "agents", "commands", "skills", "instructions"] as ResourceType[]) {
    if (wants(options, type) && !adapter.capabilities[type]) {
      log.skip(`${type}: not supported by ${adapter.displayName}`);
    }
  }
}

async function pullFileResources(
  adapter: ToolAdapter,
  type: "agents" | "commands",
  storeDir: string,
  options: SyncOptions,
): Promise<void> {
  const resources = type === "agents" ? await adapter.listAgents() : await adapter.listCommands();
  if (resources.length === 0) {
    log.skip(`${type}: nothing to pull`);
    return;
  }
  ensureDir(storeDir);
  for (const resource of resources) {
    const toolPath = type === "agents" ? adapter.agentPath(resource.name) : adapter.commandPath(resource.name);
    const storePath = join(storeDir, `${resource.name}.md`);

    if (isSymlinkTo(toolPath, storePath)) {
      log.skip(`${type}/${resource.name}: already synced`);
      continue;
    }

    const storeContent = readFileIfExists(storePath);
    if (storeContent !== null && hashContent(storeContent) !== hashContent(resource.content)) {
      const choice = options.yes
        ? "keep-tool"
        : await promptConflict(`${type}/${resource.name}`, resource.content, storeContent, "pull");
      if (choice === "skip") continue;
      if (choice === "keep-store") {
        log.info(`${type}/${resource.name}: kept store version`);
        continue;
      }
    }

    log.success(`${type}/${resource.name}: pulled`);
    if (!options.dryRun) {
      writeFileEnsuringDir(storePath, resource.content);
      ensureSymlink(toolPath, storePath);
    }
  }
}

async function pullSkills(adapter: ToolAdapter, options: SyncOptions): Promise<void> {
  const skills = await adapter.listSkills();
  if (skills.length === 0) {
    log.skip("skills: nothing to pull");
    return;
  }
  ensureDir(STORE_SKILLS_DIR);
  for (const skill of skills) {
    const storeDir = join(STORE_SKILLS_DIR, skill.name);
    if (isSymlinkTo(skill.dirPath, storeDir) || isSymlinkTo(storeDir, skill.dirPath)) {
      log.skip(`skills/${skill.name}: already synced`);
      continue;
    }
    if (existsSync(storeDir)) {
      log.warn(`skills/${skill.name}: already exists in store, skipping (remove it to re-pull)`);
      continue;
    }
    log.success(`skills/${skill.name}: pulled`);
    if (!options.dryRun) {
      const { cpSync, rmSync } = await import("node:fs");
      cpSync(skill.dirPath, storeDir, { recursive: true });
      rmSync(skill.dirPath, { recursive: true, force: true });
      ensureSymlink(skill.dirPath, storeDir);
    }
  }
}

async function pullInstructions(adapter: ToolAdapter, options: SyncOptions): Promise<void> {
  const path = adapter.instructionsPath();
  const content = readFileIfExists(path);
  if (!content) {
    log.skip("instructions: nothing to pull");
    return;
  }
  const block = extractMarkerBlock(content);
  const canonical = block ?? content;
  const existingStore = readFileIfExists(STORE_INSTRUCTIONS_FILE);
  if (existingStore && hashContent(existingStore.trim()) === hashContent(canonical.trim())) {
    log.skip("instructions: already synced");
    return;
  }
  if (existingStore) {
    const choice = options.yes
      ? "keep-tool"
      : await promptConflict("instructions", canonical, existingStore, "pull");
    if (choice === "skip") return;
    if (choice === "keep-store") {
      log.info("instructions: kept store version");
      return;
    }
  }
  log.success("instructions: pulled");
  if (!options.dryRun) writeFileEnsuringDir(STORE_INSTRUCTIONS_FILE, canonical.trim() + "\n");
}

/** Push resources FROM the canonical store INTO a tool's native config. */
export async function pushToTool(adapter: ToolAdapter, options: SyncOptions = {}): Promise<void> {
  log.heading(`Pushing to ${adapter.displayName}`);

  if (adapter.capabilities.mcp && wants(options, "mcp")) {
    const storeMap = readStoreMcp();
    const count = Object.keys(storeMap).length;
    log.info(`mcp: ${count} server(s) to push`);
    if (!options.dryRun) await adapter.writeMcpServers(storeMap, []);
  }

  if (adapter.capabilities.agents && wants(options, "agents")) {
    await pushFileResources(adapter, "agents", STORE_AGENTS_DIR, options);
  }
  if (adapter.capabilities.commands && wants(options, "commands")) {
    await pushFileResources(adapter, "commands", STORE_COMMANDS_DIR, options);
  }
  if (adapter.capabilities.skills && wants(options, "skills")) {
    await pushSkills(adapter, options);
  }
  if (adapter.capabilities.instructions && wants(options, "instructions")) {
    await pushInstructions(adapter, options);
  }

  for (const type of ["mcp", "agents", "commands", "skills", "instructions"] as ResourceType[]) {
    if (wants(options, type) && !adapter.capabilities[type]) {
      log.skip(`${type}: not supported by ${adapter.displayName}`);
    }
  }
}

async function pushFileResources(
  adapter: ToolAdapter,
  type: "agents" | "commands",
  storeDir: string,
  options: SyncOptions,
): Promise<void> {
  if (!existsSync(storeDir)) {
    log.skip(`${type}: nothing in store to push`);
    return;
  }
  const { listMarkdownFiles } = await import("./store/files");
  const names = listMarkdownFiles(storeDir);
  if (names.length === 0) {
    log.skip(`${type}: nothing in store to push`);
    return;
  }
  for (const name of names) {
    const storePath = join(storeDir, `${name}.md`);
    const toolPath = type === "agents" ? adapter.agentPath(name) : adapter.commandPath(name);

    if (isSymlinkTo(toolPath, storePath)) {
      log.skip(`${type}/${name}: already synced`);
      continue;
    }
    if (existsSync(toolPath) && !lstatSync(toolPath).isSymbolicLink()) {
      const toolContent = readFileSync(toolPath, "utf8");
      const storeContent = readFileSync(storePath, "utf8");
      if (hashContent(toolContent) !== hashContent(storeContent)) {
        const choice = options.yes
          ? "keep-store"
          : await promptConflict(`${type}/${name}`, toolContent, storeContent, "push");
        if (choice === "skip") continue;
        if (choice === "keep-tool") {
          log.info(`${type}/${name}: kept tool version, updating store`);
          if (!options.dryRun) writeFileEnsuringDir(storePath, toolContent);
          continue;
        }
      }
    }
    log.success(`${type}/${name}: pushed`);
    if (!options.dryRun) ensureSymlink(toolPath, storePath);
  }
}

async function pushSkills(adapter: ToolAdapter, options: SyncOptions): Promise<void> {
  if (!existsSync(STORE_SKILLS_DIR)) {
    log.skip("skills: nothing in store to push");
    return;
  }
  const { listSubdirectories } = await import("./store/files");
  const names = listSubdirectories(STORE_SKILLS_DIR);
  if (names.length === 0) {
    log.skip("skills: nothing in store to push");
    return;
  }
  for (const name of names) {
    const storeDir = join(STORE_SKILLS_DIR, name);
    const toolPath = adapter.skillPath(name);
    if (isSymlinkTo(toolPath, storeDir)) {
      log.skip(`skills/${name}: already synced`);
      continue;
    }
    if (existsSync(toolPath) && !lstatSync(toolPath).isSymbolicLink()) {
      log.warn(`skills/${name}: exists in ${adapter.displayName} as a real directory, skipping (remove it to push)`);
      continue;
    }
    log.success(`skills/${name}: pushed`);
    if (!options.dryRun) ensureSymlink(toolPath, storeDir);
  }
}

async function pushInstructions(adapter: ToolAdapter, options: SyncOptions): Promise<void> {
  const storeContent = readFileIfExists(STORE_INSTRUCTIONS_FILE);
  if (!storeContent) {
    log.skip("instructions: nothing in store to push");
    return;
  }
  const path = adapter.instructionsPath();
  const existing = readFileIfExists(path);
  const currentBlock = extractMarkerBlock(existing);
  if (currentBlock && hashContent(currentBlock.trim()) === hashContent(storeContent.trim())) {
    log.skip("instructions: already synced");
    return;
  }
  log.success("instructions: pushed");
  if (!options.dryRun) writeFileEnsuringDir(path, upsertMarkerBlock(existing, storeContent));
}
