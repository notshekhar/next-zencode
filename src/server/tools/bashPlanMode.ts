/**
 * Bash Tool for Plan Mode
 *
 * Single Responsibility: Execute read-only bash commands for planning/exploration
 * Only allows safe, non-destructive commands like ls, cat, find, grep, git status, etc.
 * Uses just-bash with OverlayFs so writes stay in memory.
 */

import { tool } from "ai";
import { z } from "zod";
import { Bash, OverlayFs } from "just-bash";
import { getProjectRoot } from "../utils/cwd";
import { withToolScheduling } from "../services/toolExecutionScheduler";

// Commands allowed in plan mode (read-only operations)
const ALLOWED_COMMANDS = [
    // File exploration
    "ls",
    "ll",
    "tree",
    "find",
    "locate",
    // File viewing
    "cat",
    "head",
    "tail",
    "less",
    "more",
    "wc",
    // Search
    "grep",
    "rg",
    "ag",
    "ack",
    "fzf",
    // Git read-only
    "git status",
    "git log",
    "git diff",
    "git branch",
    "git show",
    "git blame",
    "git ls-files",
    // System info
    "pwd",
    "whoami",
    "which",
    "where",
    "type",
    "file",
    "stat",
    // Package info (read-only)
    "npm list",
    "npm ls",
    "bun pm ls",
    "yarn list",
    "pnpm list",
    "npm info",
    "npm view",
    "npm outdated",
    // Process info
    "ps",
    "top",
    "htop",
    // Misc read-only
    "echo",
    "date",
    "env",
    "printenv",
    "df",
    "du",
];

// Command patterns that are always blocked in plan mode
const BLOCKED_PATTERNS = [
    /\brm\b/,
    /\bmv\b/,
    /\bcp\b/,
    /\bchmod\b/,
    /\bchown\b/,
    /\bmkdir\b/,
    /\brmdir\b/,
    /\btouch\b/,
    /\btruncate\b/,
    /\bnpm\s+(install|i|add|remove|uninstall|update|publish)/,
    /\bbun\s+(install|add|remove|update|publish|build|run)/,
    /\byarn\s+(install|add|remove|upgrade|publish)/,
    /\bpnpm\s+(install|add|remove|update|publish)/,
    /\bgit\s+(push|pull|commit|merge|rebase|reset|checkout|stash|add|rm|clean)/,
    /\bsudo\b/,
    /\bsu\b/,
    /\bdd\b/,
    /\bkill\b/,
    /\bkillall\b/,
    /\bcurl\b.*-[Xx]/,
    /\bwget\b/, // curl with methods, wget
    /\bnpx\b/,
    /\bbunx\b/, // Package runners that can execute arbitrary code
    />/,
    />>/,
    /\|.*>/, // Redirects
];

interface BashResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode?: number;
    error?: string;
    blocked?: boolean;
}

// Initialize Bash with OverlayFs for Plan Mode
// Reads come from disk, writes stay in memory
const projectDir = getProjectRoot();
const overlayFs = new OverlayFs({ root: projectDir });
const bashInstance = new Bash({
    fs: overlayFs,
    cwd: "/",
    python: true, // Enable Python support in plan mode
});

function isCommandAllowed(command: string): {
    allowed: boolean;
    reason?: string;
} {
    const trimmed = command.trim().toLowerCase();

    // Check blocked patterns first
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                allowed: false,
                reason: "This command is not allowed in Plan mode. Switch to Build mode to execute it.",
            };
        }
    }

    // Check if command starts with an allowed command
    const firstWord = trimmed.split(/\s+/)[0];
    const isAllowed = ALLOWED_COMMANDS.some((allowed) => {
        const allowedFirst = allowed.split(/\s+/)[0];
        return firstWord === allowedFirst;
    });

    if (!isAllowed) {
        return {
            allowed: false,
            reason: `Command '${firstWord}' is not allowed in Plan mode. Only read-only commands are permitted. Switch to Build mode for full access.`,
        };
    }

    return { allowed: true };
}

export const bashPlanMode = tool({
    description:
        "Execute a read-only bash command in Plan mode. Only safe, non-destructive commands like ls, cat, grep, git status are allowed. Uses a virtual filesystem so changes are NOT persisted.",
    inputSchema: z.object({
        command: z
            .string()
            .describe("The bash command to execute (must be read-only)"),
    }),

    execute: async ({ command }): Promise<BashResult> =>
        withToolScheduling("read", async () => {
            // Validate command against plan mode rules
            const validation = isCommandAllowed(command);

            if (!validation.allowed) {
                return {
                    success: false,
                    error: validation.reason,
                    stdout: "",
                    stderr: "",
                    blocked: true,
                };
            }

            // Execute the command in the virtual environment
            try {
                const result = await bashInstance.exec(command);

                return {
                    success: result.exitCode === 0,
                    stdout: result.stdout,
                    stderr: result.stderr,
                    exitCode: result.exitCode,
                };
            } catch (error) {
                return {
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                    stdout: "",
                    stderr: "",
                };
            }
        }),
});
