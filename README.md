# agentsync

Sync MCP servers, subagents, slash commands, skills, and instructions between
AI coding CLIs — Claude Code, Codex, GitHub Copilot CLI, Gemini CLI, OpenCode,
and Cursor.

You install an MCP server, a subagent, or a skill in one tool. `agentsync`
keeps a canonical copy at `~/.agentsync` and syncs it to (or from) any of the
others, so you can try a new tool without rebuilding your setup, and bring
things you pick up in a new tool back to your daily driver.

Only global (`~/...`) configuration is synced — no per-project resources.

## Install

```sh
bun install
bun link   # exposes the `agentsync` command globally
```

## Commands

```sh
agentsync init                         # create the ~/.agentsync store
agentsync scan                         # detect installed tool configs under your home dir
agentsync pull <tool>                  # copy a tool's resources into the store
agentsync pull github:<owner>/<repo>   # pull a Claude-Code-shaped repo into the store
agentsync pull https://github.com/<owner>/<repo>  # same, full URL also accepted
agentsync push <tool>                  # write the store's resources into a tool
agentsync update [source]              # re-pull from one or all registered sources
agentsync list                         # show registered sources + store contents
agentsync status <tool>                # dry-run diff of store vs. a tool
```

`<tool>` is one of: `claude`, `codex`, `copilot`, `gemini`, `opencode`, `cursor`.

Flags on `pull`/`push`/`update`:

- `--dry-run` — show what would change, write nothing
- `--yes` — don't prompt on conflicts (pull keeps the tool's version, push keeps the store's)
- `--type <types>` — comma-separated: `mcp,agents,commands,skills,instructions`

## How it works

- **Store**: `~/.agentsync/store/` holds the canonical copies, shaped like
  Claude Code's format (`agents/*.md`, `commands/*.md`, `skills/<name>/SKILL.md`,
  `mcp-servers.json`, `instructions/AGENTS.md`).
- **MCP servers** are merged into each tool's existing config file by key —
  your other settings in that file are left untouched. `manifest.json` tracks
  which keys agentsync owns per tool.
- **Agents, commands, skills** are synced via symlinks from the tool's config
  directory into the store, so editing either side keeps them in sync.
- **Instructions** are synced as a fenced block
  (`<!-- agentsync:start -->...<!-- agentsync:end -->`) inside each tool's
  memory file, so tool-specific notes around it are preserved.
- **Conflicts** (content differs on both sides) prompt you with a diff unless
  `--yes`/`--dry-run` is passed.

## Supported tools & formats

| Tool | MCP servers | Subagents | Slash commands | Skills | Instructions |
|---|---|---|---|---|---|
| **Claude Code** | `~/.claude.json` → `mcpServers` | `~/.claude/agents/*.md` | `~/.claude/commands/*.md` | `~/.claude/skills/<name>/SKILL.md` | `~/.claude/CLAUDE.md` |
| **Codex CLI** | `~/.codex/config.toml` → `[mcp_servers.<name>]` | ❌ | `~/.codex/prompts/*.md` | ❌ | `~/.codex/AGENTS.md` |
| **Copilot CLI** | `~/.copilot/mcp-config.json` → `mcpServers` | `~/.copilot/agents/<name>/AGENT.md` | ❌ | `~/.copilot/skills/<name>/SKILL.md` | `~/.copilot/copilot-instructions.md` |
| **Gemini CLI** | `~/.gemini/settings.json` → `mcpServers` | `~/.gemini/agents/*.md` | ❌ (`.toml` format, not yet synced) | `~/.gemini/skills/<name>/SKILL.md` | `~/.gemini/GEMINI.md` |
| **OpenCode** | `~/.config/opencode/opencode.json` → `mcp` | `~/.config/opencode/agent/*.md` | `~/.config/opencode/command/*.md` | `~/.config/opencode/skill/<name>/SKILL.md` | `~/.config/opencode/AGENTS.md` |
| **Cursor** | `~/.cursor/mcp.json` → `mcpServers` | ❌ | ❌ | ❌ | ❌ (no confirmed global file) |

❌ = not synced for that tool, either because the tool has no equivalent
concept or because there's no confirmed global (non-project) location for it.
`pull`/`push` skip these resource types per tool with a log message instead
of failing.

OpenCode's MCP entries use a different shape (`{type, command, environment}`)
than the others (`{command, args, env}`); agentsync converts between them
automatically.

## Pulling from a GitHub repo

```sh
agentsync pull github:owner/repo
agentsync pull https://github.com/owner/repo
agentsync pull https://github.com/owner/repo/tree/some-branch
agentsync pull git@github.com:owner/repo.git
```

All of these forms are accepted and normalized to `owner/repo` (plus an
optional branch/ref) before cloning. Expects the repo to already be laid out
like a Claude Code config: `agents/`, `commands/`, `skills/`, a `.mcp.json` or
`mcp-servers.json`, and an optional `CLAUDE.md`/`AGENTS.md`. Useful for
pulling in someone else's published agents/commands/skills collection.

## Finding installed tools

```sh
agentsync scan
```

Looks for known config locations (`~/.claude`, `~/.codex`, `~/.copilot`,
`~/.gemini`, `~/.config/opencode`, `~/.cursor`) and reports which tools are
installed, how many resources of each type they hold, and whether they're
already registered as an agentsync source — a quick way to see what you could
`agentsync pull` next.

## Development

```sh
bun run typecheck
bun test
```

Use `AGENTSYNC_HOME` to point the store somewhere other than `~/.agentsync`,
and `AGENTSYNC_TEST_HOME` to simulate a different user home for adapters
(used by the test suite's fixtures).
