/**
 * Read File Tool
 *
 * Single Responsibility: Read file contents
 *
 * Fixes:
 * - Removed dynamic import (was causing performance issues)
 * - Direct import of fileSecurity
 * - Consistent return type
 */

import { tool } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { isFileAllowed, isPathInProject } from "../services/fileSecurity";
import { skillService } from "../services/skillService";
import { lspManager } from "../services/lsp/index";
import { withToolScheduling } from "../services/toolExecutionScheduler";
import { rememberFileRead } from "../services/fileStateCache";

interface ReadResult {
    success: boolean;
    content?: string;
    path?: string;
    size?: number;
    lines?: number;
    truncated?: boolean;
    offset?: number;
    limit?: number;

    diagnostics?: string;
    error?: string;
}

export const readFile = tool({
    description: "Read the contents of a file",
    inputSchema: z.object({
        path: z
            .string()
            .describe("Path to the file to read (relative or absolute)"),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe("Starting line offset (0-based)"),
        limit: z
            .number()
            .int()
            .min(1)
            .max(5000)
            .optional()
            .describe("Maximum number of lines to return"),
    }),
    execute: async ({ path: filePath, offset, limit }): Promise<ReadResult> =>
        withToolScheduling("read", async () => {
            try {
                const resolvedPath = path.resolve(process.cwd(), filePath);
                const isReadablePath =
                    isPathInProject(resolvedPath) ||
                    skillService.isPathInSkillResources(
                        resolvedPath,
                        process.cwd(),
                    );

                if (!isReadablePath) {
                    return {
                        success: false,
                        error: "Access denied: path is outside the project or skill directories",
                    };
                }

                // Check if file is allowed
                const { allowed, reason } = isFileAllowed(resolvedPath);
                if (!allowed) {
                    return {
                        success: false,
                        error: `Access denied: ${reason}`,
                    };
                }

                // Check if file exists
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        success: false,
                        error: `File not found: ${filePath}`,
                    };
                }

                const content = fs.readFileSync(resolvedPath, "utf-8");
                const stats = fs.statSync(resolvedPath);
                rememberFileRead(resolvedPath, content);

                const allLines = content.split("\n");
                const start = offset ?? 0;
                const maxLines = limit ?? allLines.length;
                const end = Math.min(allLines.length, start + maxLines);
                const slicedContent = allLines.slice(start, end).join("\n");
                const truncated = start > 0 || end < allLines.length;

                // Run LSP diagnostics
                const diagnostics = await lspManager.getDiagnostics(
                    resolvedPath,
                    content,
                );
                let diagString: string | undefined;

                if (diagnostics.length > 0) {
                    diagString = diagnostics
                        .map(
                            (d) =>
                                `[${d.severity.toUpperCase()}] Line ${d.line + 1}: ${d.message}`,
                        )
                        .join("\n");
                }

                return {
                    success: true,
                    content: slicedContent,
                    path: resolvedPath,
                    size: stats.size,
                    lines: allLines.length,
                    truncated,
                    offset: start,
                    limit: maxLines,
                    diagnostics: diagString,
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
