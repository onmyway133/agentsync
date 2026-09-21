import * as TOML from "@iarna/toml";

/**
 * Bridges Gemini CLI's TOML custom-command format (`{ description, prompt }`,
 * using `{{args}}` for argument substitution) with the store's plain-markdown
 * command format (optional `description:` frontmatter + body, using Claude's
 * `$ARGUMENTS` convention). Conversion is content-based, not byte-identical,
 * so commands using this path are synced as independent copies rather than
 * symlinks (see `commandsConversion` on `ToolAdapter`).
 */

interface GeminiCommandToml {
  description?: string;
  prompt?: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function parseDescriptionFrontmatter(content: string): { description?: string; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { body: content };
  const frontmatter = match[1] ?? "";
  const body = match[2] ?? "";
  const lines = frontmatter.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("description:"));
  if (idx === -1) return { body };

  const first = (lines[idx] ?? "").slice("description:".length).trim();
  if (first === ">" || first === "|") {
    // YAML folded/literal block scalar: collect indented continuation lines
    // and fold them into a single line (folded-scalar semantics).
    const collected: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (line.startsWith(" ") || line.startsWith("\t")) collected.push(line.trim());
      else break;
    }
    return { description: collected.join(" ").trim(), body };
  }

  let description = first;
  if (description.startsWith('"') && description.endsWith('"')) {
    try {
      description = JSON.parse(description) as string;
    } catch {
      /* leave as-is if not valid JSON string syntax */
    }
  } else if (description.startsWith("'") && description.endsWith("'")) {
    description = description.slice(1, -1);
  }
  return { description, body };
}

/** Convert Gemini's native TOML command content into store-shaped markdown. */
export function geminiCommandToStore(native: string): string {
  const parsed = TOML.parse(native) as GeminiCommandToml;
  const prompt = (parsed.prompt ?? "").replaceAll("{{args}}", "$ARGUMENTS");
  const body = prompt.endsWith("\n") ? prompt : `${prompt}\n`;
  if (!parsed.description) return body;
  return `---\ndescription: ${JSON.stringify(parsed.description)}\n---\n${body}`;
}

/** Convert store-shaped markdown command content into Gemini's native TOML. */
export function geminiCommandToNative(storeContent: string): string {
  const { description, body } = parseDescriptionFrontmatter(storeContent);
  const prompt = body.replaceAll("$ARGUMENTS", "{{args}}").trim();
  const table: Record<string, unknown> = {};
  if (description) table["description"] = description;
  table["prompt"] = prompt;
  return TOML.stringify(table as TOML.JsonMap);
}
