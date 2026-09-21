import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAdapter } from "../../src/adapters";

let fakeHome: string;
let originalTestHome: string | undefined;

beforeEach(() => {
  fakeHome = mkdtempSync(join(tmpdir(), "agentsync-test-home-"));
  originalTestHome = process.env["AGENTSYNC_TEST_HOME"];
  process.env["AGENTSYNC_TEST_HOME"] = fakeHome;
});

afterEach(() => {
  if (originalTestHome === undefined) delete process.env["AGENTSYNC_TEST_HOME"];
  else process.env["AGENTSYNC_TEST_HOME"] = originalTestHome;
  rmSync(fakeHome, { recursive: true, force: true });
});

describe("claude adapter", () => {
  test("reads mcp servers, agents, commands, skills, instructions", async () => {
    mkdirSync(join(fakeHome, ".claude", "agents"), { recursive: true });
    mkdirSync(join(fakeHome, ".claude", "commands"), { recursive: true });
    mkdirSync(join(fakeHome, ".claude", "skills", "demo-skill"), { recursive: true });
    writeFileSync(
      join(fakeHome, ".claude.json"),
      JSON.stringify({ mcpServers: { context7: { command: "npx", args: ["-y", "context7"] } } }),
    );
    writeFileSync(join(fakeHome, ".claude", "agents", "reviewer.md"), "---\nname: reviewer\n---\nbody");
    writeFileSync(join(fakeHome, ".claude", "commands", "hello.md"), "say hello");
    writeFileSync(join(fakeHome, ".claude", "skills", "demo-skill", "SKILL.md"), "---\nname: demo-skill\n---\nbody");
    writeFileSync(join(fakeHome, ".claude", "CLAUDE.md"), "# notes");

    const adapter = getAdapter("claude");
    const mcp = await adapter.readMcpServers();
    expect(mcp["context7"]).toBeDefined();

    const agents = await adapter.listAgents();
    expect(agents.map((a) => a.name)).toEqual(["reviewer"]);

    const commands = await adapter.listCommands();
    expect(commands.map((c) => c.name)).toEqual(["hello"]);

    const skills = await adapter.listSkills();
    expect(skills.map((s) => s.name)).toEqual(["demo-skill"]);

    const instructions = readFileSync(adapter.instructionsPath(), "utf8");
    expect(instructions).toContain("# notes");
  });
});

describe("gemini adapter", () => {
  test("reads mcp servers, agents, skills, instructions (no commands)", async () => {
    mkdirSync(join(fakeHome, ".gemini", "agents"), { recursive: true });
    mkdirSync(join(fakeHome, ".gemini", "skills", "demo-skill"), { recursive: true });
    writeFileSync(
      join(fakeHome, ".gemini", "settings.json"),
      JSON.stringify({ mcpServers: { context7: { command: "npx", args: ["-y", "context7"] } } }),
    );
    writeFileSync(join(fakeHome, ".gemini", "agents", "reviewer.md"), "---\nname: reviewer\n---\nbody");
    writeFileSync(join(fakeHome, ".gemini", "skills", "demo-skill", "SKILL.md"), "---\nname: demo-skill\n---\nbody");
    writeFileSync(join(fakeHome, ".gemini", "GEMINI.md"), "# notes");

    const adapter = getAdapter("gemini");
    expect(adapter.capabilities.commands).toBe(false);

    const mcp = await adapter.readMcpServers();
    expect(mcp["context7"]).toBeDefined();

    const agents = await adapter.listAgents();
    expect(agents.map((a) => a.name)).toEqual(["reviewer"]);

    const skills = await adapter.listSkills();
    expect(skills.map((s) => s.name)).toEqual(["demo-skill"]);

    const instructions = readFileSync(adapter.instructionsPath(), "utf8");
    expect(instructions).toContain("# notes");
  });
});

describe("opencode adapter mcp shape conversion", () => {
  test("round-trips a stdio server through OpenCode's native shape", async () => {
    const adapter = getAdapter("opencode");
    await adapter.writeMcpServers({ demo: { command: "npx", args: ["-y", "demo"], env: {} } }, []);

    const raw = JSON.parse(readFileSync(join(fakeHome, ".config", "opencode", "opencode.json"), "utf8"));
    expect(raw.mcp.demo.type).toBe("local");
    expect(raw.mcp.demo.command).toEqual(["npx", "-y", "demo"]);

    const roundTripped = await adapter.readMcpServers();
    expect(roundTripped["demo"]).toMatchObject({ command: "npx", args: ["-y", "demo"] });
  });
});
