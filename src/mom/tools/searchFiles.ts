/**
 * Search Files Tool
 *
 * Single Responsibility: Search for files by name pattern
 * Uses shared just-bash executor with ReadWriteFs.
 */

import { tool } from "ai";
import { z } from "zod";
import * as path from "path";
import { exec, fromJustBashPath, shellEscape } from "../services/bashExecutor";
import { isFileAllowed, isPathInProject } from "../services/fileSecurity";
import { skillService } from "../services/skillService";
import { TOOL_CONSTANTS } from "../types/tool";
import { withToolScheduling } from "../services/toolExecutionScheduler";

interface SearchResult {
    success: boolean;
    files?: string[];
    count?: number;
    error?: string;
}

export const searchFiles = tool({
    description: "Search for files matching a filename pattern",
    inputSchema: z.object({
        pattern: z
            .string()
            .describe(
                "Filename pattern to search for (e.g., '*.ts', 'package.json')",
            ),
        directory: z.string().describe("Directory to search in").default("."),
    }),
    execute: async ({ pattern, directory }): Promise<SearchResult> =>
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

                // Use escaped arguments to avoid shell injection
                const result = await exec(
                    `find ${shellEscape(searchDir)} -name ${shellEscape(pattern)} -type f 2>/dev/null`,
                );

                if (!result.success && result.exitCode !== 0 && result.stderr) {
                    return { success: false, error: result.stderr };
                }

                // Parse results and convert to absolute paths
                const allFiles = result.stdout
                    .trim()
                    .split("\n")
                    .filter(Boolean)
                    .map((f) => fromJustBashPath(f));

                // Filter allowed files and limit results
                const files = allFiles
                    .filter(
                        (file) =>
                            (isPathInProject(file) ||
                                skillService.isPathInSkillResources(
                                    file,
                                    process.cwd(),
                                )) &&
                            isFileAllowed(file).allowed,
                    )
                    .slice(0, TOOL_CONSTANTS.FILE_SEARCH_LIMIT);

                return {
                    success: true,
                    files,
                    count: files.length,
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
