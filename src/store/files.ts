import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function readFileIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function writeFileEnsuringDir(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** List `*.md` file resource names (without extension) in a directory, or [] if it doesn't exist. */
export function listMarkdownFiles(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3));
}

/** List subdirectory names (skills) in a directory, or [] if it doesn't exist. */
export function listSubdirectories(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => e.isDirectory() || e.isSymbolicLink())
    .map((e) => e.name);
}

/**
 * Create/replace `linkPath` as a symlink pointing at `targetPath`. If
 * `linkPath` already points at `targetPath`, this is a no-op. Any existing
 * file/dir/symlink at `linkPath` pointing elsewhere is removed first.
 */
export function ensureSymlink(linkPath: string, targetPath: string): void {
  ensureDir(dirname(linkPath));
  if (existsSync(linkPath) || isBrokenSymlink(linkPath)) {
    const st = lstatSync(linkPath);
    if (st.isSymbolicLink() && readlinkSync(linkPath) === targetPath) return;
    rmSync(linkPath, { recursive: true, force: true });
  }
  symlinkSync(targetPath, linkPath);
}

export function isBrokenSymlink(path: string): boolean {
  try {
    const st = lstatSync(path);
    return st.isSymbolicLink() && !existsSync(path);
  } catch {
    return false;
  }
}

export function isSymlinkTo(path: string, targetPath: string): boolean {
  try {
    const st = lstatSync(path);
    return st.isSymbolicLink() && readlinkSync(path) === targetPath;
  } catch {
    return false;
  }
}
