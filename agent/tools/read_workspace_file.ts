import { lstat, readFile, stat } from "node:fs/promises";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveWorkspacePath } from "../lib/workspace";

const MAX_BYTES = 32 * 1024;

export default defineTool({
  description: "Read a UTF-8 text file within the read-only harness workspace, up to 32 KiB.",
  inputSchema: z.object({
    path: z.string().min(1).describe("Relative path of the file to read."),
  }),
  async execute({ path }) {
    const filePath = resolveWorkspacePath(path);
    if ((await lstat(filePath)).isSymbolicLink()) {
      throw new Error("Symbolic links are not readable through this harness.");
    }
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("The requested path is not a regular file.");
    if (info.size > MAX_BYTES) throw new Error(`The file is ${info.size} bytes; the read-only limit is ${MAX_BYTES} bytes.`);
    return { path, content: await readFile(filePath, "utf8") };
  },
});
