import { confirm, select } from "@inquirer/prompts";
import { createTwoFilesPatch } from "diff";
import pc from "picocolors";

export type ConflictChoice = "keep-store" | "keep-tool" | "view-diff" | "skip";

export function printUnifiedDiff(label: string, oldContent: string, newContent: string): void {
  const patch = createTwoFilesPatch(`${label} (tool)`, `${label} (store)`, oldContent, newContent);
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) console.log(pc.green(line));
    else if (line.startsWith("-") && !line.startsWith("---")) console.log(pc.red(line));
    else if (line.startsWith("@@")) console.log(pc.cyan(line));
    else console.log(pc.gray(line));
  }
}

/**
 * Prompt the user to resolve a conflict between the store's version and the
 * tool's version of a resource. Loops back after "view diff".
 */
export async function promptConflict(
  label: string,
  toolContent: string,
  storeContent: string,
  direction: "push" | "pull",
): Promise<"keep-store" | "keep-tool" | "skip"> {
  const defaultKeep = direction === "push" ? "keep-store" : "keep-tool";
  for (;;) {
    const choice = await select<ConflictChoice>({
      message: `Conflict for ${label}: content differs between store and tool. What do you want to do?`,
      choices: [
        { name: "Keep store version (overwrite tool)", value: "keep-store" },
        { name: "Keep tool version (overwrite store)", value: "keep-tool" },
        { name: "View diff", value: "view-diff" },
        { name: "Skip this resource", value: "skip" },
      ],
      default: defaultKeep,
    });
    if (choice === "view-diff") {
      printUnifiedDiff(label, toolContent, storeContent);
      continue;
    }
    return choice;
  }
}

export async function confirmYesNo(message: string, defaultValue = false): Promise<boolean> {
  return confirm({ message, default: defaultValue });
}
