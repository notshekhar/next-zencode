/**
 * Bash Tool
 *
 * Single Responsibility: Execute bash commands using just-bash
 * Uses AI SDK's needsApproval for user confirmation flow.
 */

import { tool } from "ai";
import { z } from "zod";
import { Bash, ReadWriteFs } from "just-bash";
import { getProjectRoot } from "../utils/cwd";
import { withToolScheduling } from "../services/toolExecutionScheduler";

// Our tool's return type
interface BashResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode?: number;
    error?: string;
}

// Initialize Bash with ReadWriteFs for the project root
const projectDir = getProjectRoot();
const fs = new ReadWriteFs({ root: projectDir });
const bashInstance = new Bash({
    fs,
    cwd: "/",
    python: true,
});

export const bash = tool({
    description:
        "Execute a bash command in the current project directory using just-bash. Commands are executed in a secure environment with Python and limited network access.",
    inputSchema: z.object({
        command: z.string().describe("The bash command to execute"),
    }),

    execute: async ({ command }): Promise<BashResult> =>
        withToolScheduling("write", async () => {
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
