/**
 * Write File Tool
 *
 * Single Responsibility: Write content to files
 */

import { tool } from "ai";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { TOOL_CONSTANTS } from "../types/tool";
import { lspManager } from "../services/lsp/index";
import { isFileAllowed, isPathInProject } from "../services/fileSecurity";
import { withToolScheduling } from "../services/toolExecutionScheduler";
import {
    ensureFileUnchangedSinceRead,
    normalizeLineEndingsForFile,
    rememberFileWrite,
} from "../services/fileStateCache";

interface WriteResult {
    success: boolean;
    message?: string;
    path?: string;
    bytes?: number;
    diff?: string;
    isNew?: boolean;
    error?: string;
    diagnostics?: string;
}

const AUTO_APPROVE_EXTENSIONS = new Set([
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".lock",
    ".gitignore",
]);

function shouldRequireWriteApproval(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return !AUTO_APPROVE_EXTENSIONS.has(ext);
}

export const writeFile = tool({
    description:
        "Write content to a file (creates file if it doesn't exist, overwrites if it does)",
    inputSchema: z.object({
        path: z.string().describe("Path to the file to write"),
        content: z.string().describe("Content to write to the file"),
    }),

    execute: async ({ path: filePath, content }): Promise<WriteResult> =>
        withToolScheduling("write", async () => {
            try {
                const resolvedPath = path.resolve(process.cwd(), filePath);
                const dir = path.dirname(resolvedPath);

                if (!isPathInProject(resolvedPath)) {
                    return {
                        success: false,
                        error: "Access denied: path is outside the project directory",
                    };
                }

                const { allowed, reason } = isFileAllowed(resolvedPath);
                if (!allowed) {
                    return {
                        success: false,
                        error: `Access denied: ${reason}`,
                    };
                }

                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                const existed = fs.existsSync(resolvedPath);
                const oldContent = existed
                    ? fs.readFileSync(resolvedPath, "utf-8")
                    : "";

                if (existed) {
                    const unchanged =
                        ensureFileUnchangedSinceRead(resolvedPath);
                    if (!unchanged.valid) {
                        return {
                            success: false,
                            error: unchanged.reason,
                        };
                    }
                }

                const normalizedContent = existed
                    ? normalizeLineEndingsForFile(resolvedPath, content)
                    : content.replace(/\r\n/g, "\n");

                if (existed && normalizedContent === oldContent) {
                    return {
                        success: true,
                        message: `No changes needed for ${filePath}`,
                        path: resolvedPath,
                        bytes: Buffer.byteLength(normalizedContent, "utf-8"),
                        diff: "",
                        isNew: false,
                        diagnostics: "",
                    };
                }

                fs.writeFileSync(resolvedPath, normalizedContent, "utf-8");
                rememberFileWrite(resolvedPath, normalizedContent);

                // Generate diff
                const diff = generateDiff(
                    filePath,
                    oldContent,
                    normalizedContent,
                    existed,
                );

                // Run LSP diagnostics
                const diagnostics = await lspManager.getDiagnostics(
                    resolvedPath,
                    normalizedContent,
                );
                let message = existed
                    ? `Updated ${filePath}`
                    : `Created ${filePath}`;

                let diagnosticsString = "";

                if (diagnostics.length > 0) {
                    diagnosticsString = diagnostics
                        .map(
                            (d) =>
                                `[${d.severity.toUpperCase()}] Line ${d.line + 1}: ${d.message}`,
                        )
                        .join("\n");
                }

                return {
                    success: true,
                    message,
                    path: resolvedPath,
                    bytes: Buffer.byteLength(normalizedContent, "utf-8"),
                    diff,
                    isNew: !existed,
                    diagnostics: diagnosticsString,
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

function generateDiff(
    filePath: string,
    oldContent: string,
    newContent: string,
    existed: boolean,
): string {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    const lines: string[] = [];

    const { DIFF_PREVIEW_LINES, OLD_CONTENT_PREVIEW_LINES } = TOOL_CONSTANTS;

    if (!existed) {
        // New file - show all lines as added
        lines.push(`+++ ${filePath} (new file)`);
        const previewLines = newLines.slice(0, DIFF_PREVIEW_LINES);
        previewLines.forEach((line, i) => {
            lines.push(`${String(i + 1).padStart(3)} + ${line}`);
        });
        if (newLines.length > DIFF_PREVIEW_LINES) {
            lines.push(
                `    ... +${newLines.length - DIFF_PREVIEW_LINES} more lines`,
            );
        }
    } else {
        // Existing file - show simple diff
        lines.push(`--- ${filePath}`);
        lines.push(`+++ ${filePath}`);

        const removedLines = oldLines.length;
        const addedLines = newLines.length;

        lines.push(`@@ -1,${removedLines} +1,${addedLines} @@`);

        // Show first few removed lines
        const oldPreview = oldLines.slice(0, OLD_CONTENT_PREVIEW_LINES);
        oldPreview.forEach((line, i) => {
            lines.push(`${String(i + 1).padStart(3)} - ${line}`);
        });
        if (oldLines.length > OLD_CONTENT_PREVIEW_LINES) {
            lines.push(
                `    ... -${oldLines.length - OLD_CONTENT_PREVIEW_LINES} more lines removed`,
            );
        }

        lines.push("");

        // Show first few added lines
        const newPreview = newLines.slice(0, OLD_CONTENT_PREVIEW_LINES);
        newPreview.forEach((line, i) => {
            lines.push(`${String(i + 1).padStart(3)} + ${line}`);
        });
        if (newLines.length > OLD_CONTENT_PREVIEW_LINES) {
            lines.push(
                `    ... +${newLines.length - OLD_CONTENT_PREVIEW_LINES} more lines added`,
            );
        }
    }

    return lines.join("\n");
}
