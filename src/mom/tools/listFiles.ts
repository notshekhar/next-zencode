/**
 * List Files Tool
 *
 * Single Responsibility: List directory contents
 *
 * Fixes:
 * - Removed dynamic import
 * - Direct import of fileSecurity
 * - Added directory validation
 * - Consistent return type
 */

import { tool } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import {
    isFileAllowed,
    isDirectoryAllowed,
    isPathInProject,
} from "../services/fileSecurity";
import { skillService } from "../services/skillService";
import { withToolScheduling } from "../services/toolExecutionScheduler";

interface FileEntry {
    name: string;
    type: "file" | "directory";
}

interface ListResult {
    success: boolean;
    files?: FileEntry[];
    path?: string;
    count?: number;
    error?: string;
}

export const listFiles = tool({
    description: "List files and directories in a path",
    inputSchema: z.object({
        dirPath: z.string().describe("Path to the directory").default("."),
    }),
    execute: async ({ dirPath }): Promise<ListResult> =>
        withToolScheduling("read", async () => {
            try {
                const resolvedPath = path.resolve(process.cwd(), dirPath);
                const isReadablePath =
                    isPathInProject(resolvedPath) ||
                    skillService.isPathInSkillResources(
                        resolvedPath,
                        process.cwd(),
                    );

                if (!isReadablePath) {
                    return {
                        success: false,
                        error: "Access denied: directory is outside the project or skill directories",
                    };
                }

                // Check if directory is allowed
                const dirCheck = isDirectoryAllowed(resolvedPath);
                if (!dirCheck.allowed) {
                    return {
                        success: false,
                        error: `Access denied: ${dirCheck.reason}`,
                    };
                }

                // Check if path exists and is a directory
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        success: false,
                        error: `Directory not found: ${dirPath}`,
                    };
                }

                const stats = fs.statSync(resolvedPath);
                if (!stats.isDirectory()) {
                    return {
                        success: false,
                        error: `Path is not a directory: ${dirPath}`,
                    };
                }

                const entries = fs.readdirSync(resolvedPath, {
                    withFileTypes: true,
                });

                const files: FileEntry[] = entries
                    .filter((entry) => {
                        const fullPath = path.join(resolvedPath, entry.name);
                        return isFileAllowed(fullPath).allowed;
                    })
                    .map((entry) => ({
                        name: entry.name,
                        type: entry.isDirectory()
                            ? ("directory" as const)
                            : ("file" as const),
                    }));

                return {
                    success: true,
                    files,
                    path: resolvedPath,
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
