/**
 * Bash Executor Service - INTERNAL SYSTEM USE ONLY
 *
 * Executes real bash commands using Bun's shell.
 * WARNING: This executor runs with the full permissions of the server process.
 * Use the `bash` tool (which uses `just-bash`) for agent-triggered commands.
 */

import { exec as cpExec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(cpExec);
import * as path from "path";

export interface BashExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    success: boolean;
}

import { getProjectRoot as getRoot } from "../utils/cwd";

/**
 * Get the project root directory
 */
export function getProjectRoot(): string {
    return getRoot();
}

/**
 * Convert an absolute path to a path relative to project root
 */
export function toJustBashPath(absolutePath: string): string {
    const projectRoot = getProjectRoot();

    if (absolutePath.startsWith(projectRoot)) {
        const relativePath = path.relative(projectRoot, absolutePath);
        return relativePath ? `./${relativePath}` : ".";
    }

    return absolutePath;
}

/**
 * Convert a relative path to absolute path
 */
export function fromJustBashPath(justBashPath: string): string {
    const projectRoot = getProjectRoot();

    if (justBashPath.startsWith("./")) {
        return path.join(projectRoot, justBashPath.slice(2));
    }
    if (justBashPath.startsWith("/")) {
        return justBashPath;
    }
    return path.join(projectRoot, justBashPath);
}

/**
 * Shell-escape an argument for safe interpolation in `bash -c` commands.
 */
export function shellEscape(arg: string): string {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * Execute a command using Bun's shell
 */
export async function exec(
    command: string,
    options: { cwd?: string; env?: Record<string, string> } = {},
): Promise<BashExecResult> {
    const projectRoot = options.cwd || getProjectRoot();
    const env = options.env ? { ...process.env, ...options.env } : process.env;

    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: projectRoot,
            env,
            shell: "/bin/bash",
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        return {
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: 0,
            success: true,
        };
    } catch (error: any) {
        // child_process.exec throws on non-zero exit code
        return {
            stdout: error.stdout?.toString() || "",
            stderr: error.stderr?.toString() || error.message || String(error),
            exitCode: error.code || 1,
            success: false,
        };
    }
}

/**
 * Execute a command and return just stdout (convenience method)
 */
export async function execGetOutput(command: string): Promise<string> {
    const result = await exec(command);
    return result.stdout;
}

/**
 * Check if a command exists
 */
export async function commandExists(command: string): Promise<boolean> {
    const result = await exec(`which ${command} 2>/dev/null`);
    return result.success && result.stdout.trim().length > 0;
}

/**
 * Reset the bash instance (for compatibility)
 */
export function resetBashInstance(): void {
    // currentRoot = null; // No longer used
}
