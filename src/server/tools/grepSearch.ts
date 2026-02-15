/**
 * Grep Search Tool
 *
 * Single Responsibility: Search for text content in files
 * Uses shared just-bash executor with ReadWriteFs.
 */

import { tool } from "ai";
import { z } from "zod";
import * as path from "path";
import { exec, fromJustBashPath, shellEscape } from "../services/bashExecutor";
import { TOOL_CONSTANTS } from "../types/tool";
import { isFileAllowed, isPathInProject } from "../services/fileSecurity";
import { skillService } from "../services/skillService";
import { withToolScheduling } from "../services/toolExecutionScheduler";

interface GrepResult {
    success: boolean;
    matches?: string[];
    count?: number;
    message?: string;
    error?: string;
}

export const grepSearch = tool({
    description: "Search for text content in files using grep",
    inputSchema: z.object({
        pattern: z.string().describe("Text or regex pattern to search for"),
        filePattern: z
            .string()
            .describe("File pattern to search in (e.g., '*.ts')")
            .default("*"),
        directory: z.string().describe("Directory to search in").default("."),
    }),
    execute: async ({ pattern, filePattern, directory }): Promise<GrepResult> =>
        withToolScheduling("read", async () => {
            try {
                const resolvedDirectory = path.resolve(
                    process.cwd(),
                    directory,
                );
                const isReadableDirectory =
                    isPathInProject(resolvedDirectory) ||
                    skillService.isPathInSkillResources(
                        resolvedDirectory,
                        process.cwd(),
                    );

                if (!isReadableDirectory) {
                    return {
                        success: false,
                        error: "Access denied: directory is outside the project or skill directories",
                    };
                }

                const searchDir = path.isAbsolute(directory)
                    ? directory
                    : directory === "."
                      ? "."
                      : `./${directory.replace(/^\.\//, "")}`;

                // Use escaped shell args to avoid command injection
                const result = await exec(
                    `grep -rn --include=${shellEscape(filePattern)} ${shellEscape(pattern)} ${shellEscape(searchDir)} 2>/dev/null`,
                );

                // Exit code 1 means no matches found (not an error for grep)
                if (result.exitCode === 1 && !result.stderr) {
                    return {
                        success: true,
                        matches: [],
                        count: 0,
                        message: "No matches found",
                    };
                }

                // Exit code > 1 means an actual error
                if (result.exitCode > 1) {
                    return {
                        success: false,
                        error: result.stderr || "Grep command failed",
                    };
                }

                // Parse results and convert paths to absolute
                const matches = result.stdout
                    .trim()
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => {
                        // grep output format: file:line:content
                        const colonIndex = line.indexOf(":");
                        if (colonIndex > 0) {
                            const filePath = line.substring(0, colonIndex);
                            const absolutePath = fromJustBashPath(filePath);
                            if (
                                (!isPathInProject(absolutePath) &&
                                    !skillService.isPathInSkillResources(
                                        absolutePath,
                                        process.cwd(),
                                    )) ||
                                !isFileAllowed(absolutePath).allowed
                            ) {
                                return null;
                            }

                            const rest = line.substring(colonIndex);
                            return absolutePath + rest;
                        }
                        return null;
                    })
                    .filter((line): line is string => !!line);

                return {
                    success: true,
                    matches: matches.slice(0, TOOL_CONSTANTS.GREP_RESULT_LIMIT),
                    count: Math.min(
                        matches.length,
                        TOOL_CONSTANTS.GREP_RESULT_LIMIT,
                    ),
                };
            } catch (error) {
                return {
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                };
            }
        }),
});
