import path from "node:path";

const blockedNames = new Set([".git", "node_modules", ".env", ".env.local", ".env.production"]);

export function workspaceRoot() {
  return path.resolve(process.env.HARNESS_WORKSPACE_ROOT ?? process.cwd());
}

export function resolveWorkspacePath(relativePath: string) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error("Only a non-empty relative path inside the workspace is allowed.");
  }

  const root = workspaceRoot();
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("The requested path is outside the workspace.");
  }

  const segments = relative.split(path.sep);
  if (segments.some((segment) => blockedNames.has(segment) || segment.startsWith(".env"))) {
    throw new Error("The requested path is blocked because it may contain credentials or dependencies.");
  }

  return resolved;
}
