/**
 * Runtime detection utilities
 * Detects available runtimes and LSP binaries
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

export type RuntimeType = "bun" | "node" | "deno" | null;

interface RuntimeInfo {
    type: RuntimeType;
    path: string;
}

// Cache results
let cachedRuntime: RuntimeInfo | null | undefined = undefined;
let cachedCommands: Map<string, string | null> = new Map();

function findPackageRoot(startPath: string): string | null {
    let currentDir =
        fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
            ? startPath
            : path.dirname(startPath);
    const { root } = path.parse(currentDir);

    while (currentDir !== root) {
        const pkgPath = path.join(currentDir, "package.json");
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
                    name?: string;
                };
                if (pkg.name === "zencode") {
                    return currentDir;
                }
            } catch {
                // ignore
            }
        }
        currentDir = path.dirname(currentDir);
    }

    return null;
}

// Get zencode's installation directory
function getZencodeRoot(): string | null {
    const envRoot = process.env.ZENCODE_ROOT;
    if (envRoot && fs.existsSync(envRoot)) {
        return envRoot;
    }

    const execRoot = findPackageRoot(process.execPath);
    if (execRoot) return execRoot;

    if (process.argv[1]) {
        const argvRoot = findPackageRoot(process.argv[1]);
        if (argvRoot) return argvRoot;
    }

    const thisFile = fileURLToPath(import.meta.url);
    const moduleRoot = findPackageRoot(thisFile);
    if (moduleRoot) return moduleRoot;

    return null;
}

/**
 * Find which command is available in PATH
 */
export function which(command: string): string | null {
    if (cachedCommands.has(command)) {
        return cachedCommands.get(command)!;
    }

    try {
        const result = execSync(`which ${command}`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        cachedCommands.set(command, result || null);
        return result || null;
    } catch {
        cachedCommands.set(command, null);
        return null;
    }
}

/**
 * Check if a command is available
 */
export function isCommandAvailable(command: string): boolean {
    return which(command) !== null;
}

/**
 * Get the preferred JavaScript runtime (bun > node > deno)
 */
export function getPreferredRuntime(): RuntimeInfo | null {
    if (cachedRuntime !== undefined) {
        return cachedRuntime;
    }

    // Prefer Bun (per CLAUDE.md)
    const bunPath = which("bun");
    if (bunPath) {
        cachedRuntime = { type: "bun", path: bunPath };
        return cachedRuntime;
    }

    // Then Node
    const nodePath = which("node");
    if (nodePath) {
        cachedRuntime = { type: "node", path: nodePath };
        return cachedRuntime;
    }

    // Then Deno
    const denoPath = which("deno");
    if (denoPath) {
        cachedRuntime = { type: "deno", path: denoPath };
        return cachedRuntime;
    }

    cachedRuntime = null;
    return null;
}

/**
 * Find TypeScript language server binary
 * Searches in multiple locations:
 * 1. Project's node_modules
 * 2. Zencode's own node_modules (bundled)
 * 3. Global PATH
 * 4. Global npm/bun installations
 */
export function findTypeScriptServer(projectRoot: string): {
    command: string;
    args: string[];
    env?: Record<string, string>;
} | null {
    const runtime = getPreferredRuntime();
    if (!runtime) {
        return null;
    }

    const searchPaths: string[] = [
        // Project's node_modules
        projectRoot,
    ];

    // Zencode's own node_modules (if discoverable)
    const zencodeRoot = getZencodeRoot();
    if (zencodeRoot && zencodeRoot !== projectRoot) {
        searchPaths.push(zencodeRoot);
    }

    // Add global npm prefix if available
    try {
        const npmPrefix = execSync("npm config get prefix", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (npmPrefix) {
            searchPaths.push(path.join(npmPrefix, "lib"));
        }
    } catch {
        // Ignore
    }

    // Search in each path
    for (const searchPath of searchPaths) {
        // Try .bin executable
        const binPath = path.join(
            searchPath,
            "node_modules",
            ".bin",
            "typescript-language-server",
        );
        if (fs.existsSync(binPath)) {
            return {
                command: binPath,
                args: ["--stdio"],
            };
        }

        // Try cli.mjs directly
        const cliPath = path.join(
            searchPath,
            "node_modules",
            "typescript-language-server",
            "lib",
            "cli.mjs",
        );
        if (fs.existsSync(cliPath)) {
            // Also find tsserver.js for TSS_PATH (try project first, then search path)
            let tsserverPath = path.join(
                projectRoot,
                "node_modules",
                "typescript",
                "lib",
                "tsserver.js",
            );
            if (!fs.existsSync(tsserverPath)) {
                tsserverPath = path.join(
                    searchPath,
                    "node_modules",
                    "typescript",
                    "lib",
                    "tsserver.js",
                );
            }

            return {
                command: runtime.path,
                args: [cliPath, "--stdio"],
                env: fs.existsSync(tsserverPath)
                    ? { TSS_PATH: tsserverPath }
                    : undefined,
            };
        }
    }

    // Try global typescript-language-server command
    const globalTsServer = which("typescript-language-server");
    if (globalTsServer) {
        return {
            command: globalTsServer,
            args: ["--stdio"],
        };
    }

    return null;
}

/**
 * Clear runtime cache (useful for testing)
 */
export function clearRuntimeCache(): void {
    cachedRuntime = undefined;
    cachedCommands.clear();
}
