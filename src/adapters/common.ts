import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listMarkdownFiles, listSubdirectories } from "../store/files";
import type { FileResource, SkillResource } from "./types";

export function listMarkdownResources(dirPath: string): FileResource[] {
  return listMarkdownFiles(dirPath).map((name) => ({
    name,
    content: readFileSync(join(dirPath, `${name}.md`), "utf8"),
  }));
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
