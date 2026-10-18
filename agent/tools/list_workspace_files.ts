import { readdir } from "node:fs/promises";
import path from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveWorkspacePath, workspaceRoot } from "../lib/workspace";

const MAX_DEPTH = 3;
const MAX_RESULTS = 100;

async function walk(directory: string, depth: number, results: string[]): Promise<void> {
  if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return;

  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (results.length >= MAX_RESULTS || entry.isSymbolicLink() || entry.name === ".git" || entry.name === "node_modules" || entry.name.startsWith(".env")) continue;
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(workspaceRoot(), fullPath);
    results.push(entry.isDirectory() ? `${relativePath}/` : relativePath);
    if (entry.isDirectory()) await walk(fullPath, depth + 1, results);
  }
}

export default defineTool({
  description: "List non-secret files and directories within the read-only harness workspace.",
  inputSchema: z.object({
    path: z.string().default(".").describe("Relative directory path, or . for the workspace root."),
  }),
  async execute({ path: relativePath }) {
    const directory = relativePath === "." ? workspaceRoot() : resolveWorkspacePath(relativePath);
    const results: string[] = [];
    await walk(directory, 0, results);
    return { root: path.relative(workspaceRoot(), directory) || ".", entries: results, truncated: results.length >= MAX_RESULTS };
  },
});
