import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listFilesWithExt, listSubdirectories } from "../store/files";
import { log } from "../ui/logger";
import type { FileResource, SkillResource } from "./types";

/** List file resources with a given extension (e.g. "md", "toml") in a directory. */
export function listResourcesWithExt(dirPath: string, ext: string): FileResource[] {
  const resources: FileResource[] = [];
  for (const name of listFilesWithExt(dirPath, ext)) {
    const filePath = join(dirPath, `${name}.${ext}`);
    try {
      resources.push({ name, content: readFileSync(filePath, "utf8") });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      log.warn(`skipping unreadable file ${filePath} (${reason})`);
    }
  }
  return resources;
}

export function resourcePathWithExt(dirPath: string, name: string, ext: string): string {
  return join(dirPath, `${name}.${ext}`);
}

export function listMarkdownResources(dirPath: string): FileResource[] {
  return listResourcesWithExt(dirPath, "md");
}

export function markdownResourcePath(dirPath: string, name: string): string {
  return join(dirPath, `${name}.md`);
}

export function listSkillResources(dirPath: string): SkillResource[] {
  return listSubdirectories(dirPath)
    .filter((name) => existsSync(join(dirPath, name, "SKILL.md")))
    .map((name) => ({ name, dirPath: join(dirPath, name) }));
}

export function skillResourcePath(dirPath: string, name: string): string {
  return join(dirPath, name);
}
