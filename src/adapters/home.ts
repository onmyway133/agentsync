import { homedir } from "node:os";

/**
 * Home directory to resolve tool config paths under. Overridable via
 * AGENTSYNC_TEST_HOME so tests can point adapters at fixture directories
 * without touching the real ~/.
 */
export function home(): string {
  return process.env["AGENTSYNC_TEST_HOME"] ?? homedir();
}
