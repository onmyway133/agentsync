import { ensureDir } from "../store/files";
import { readManifest, readSources, writeManifest, writeSources } from "../store/manifest";
import { STORE_AGENTS_DIR, STORE_COMMANDS_DIR, STORE_DIR, STORE_SKILLS_DIR } from "../store/paths";
import { log } from "../ui/logger";

export function runInit(): void {
  ensureDir(STORE_DIR);
  ensureDir(STORE_AGENTS_DIR);
  ensureDir(STORE_COMMANDS_DIR);
  ensureDir(STORE_SKILLS_DIR);
  writeSources(readSources());
  writeManifest(readManifest());
  log.success(`Initialized agentsync store at ${STORE_DIR}`);
}
