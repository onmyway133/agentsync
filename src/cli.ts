#!/usr/bin/env bun
import { Command } from "commander";
import { listToolIds } from "./adapters";
import { runInit } from "./commands/init";
import { runList } from "./commands/list";
import { runPull } from "./commands/pull";
import { runPush } from "./commands/push";
import { runScan } from "./commands/scan";
import { runStatus } from "./commands/status";
import { runUpdate } from "./commands/update";
import { log } from "./ui/logger";

const program = new Command();

program
  .name("agentsync")
  .description("Sync MCP servers, subagents, slash commands, skills, and instructions between AI coding tools")
  .version("0.1.0");

program
  .command("init")
  .description("Create the ~/.agentsync store")
  .action(() => runInit());

program
  .command("pull <target>")
  .description(`Pull resources from a tool (${listToolIds().join(", ")}) or a repo (github:owner/repo) into the store`)
  .option("--dry-run", "show what would change without writing anything")
  .option("--yes", "don't prompt on conflicts (keeps the tool's version)")
  .option("--type <types>", "comma-separated resource types: mcp,agents,commands,skills,instructions")
  .action((target: string, opts) => runPull(target, opts));

program
  .command("push <tool>")
  .description(`Push resources from the store into a tool (${listToolIds().join(", ")})`)
  .option("--dry-run", "show what would change without writing anything")
  .option("--yes", "don't prompt on conflicts (keeps the store's version)")
  .option("--type <types>", "comma-separated resource types: mcp,agents,commands,skills,instructions")
  .action((tool: string, opts) => runPush(tool, opts));

program
  .command("update [source]")
  .description("Re-pull from one or all registered sources")
  .option("--dry-run", "show what would change without writing anything")
  .option("--yes", "don't prompt on conflicts")
  .action((source: string | undefined, opts) => runUpdate(source, opts));

program
  .command("scan")
  .description("Scan your home directory for installed AI coding tool configs")
  .action(() => runScan());

program
  .command("list")
  .description("Show registered sources and store contents")
  .action(() => runList());

program
  .command("status <tool>")
  .description("Show what a pull from this tool would change (dry run)")
  .action((tool: string) => runStatus(tool));

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
