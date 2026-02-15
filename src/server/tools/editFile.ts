/**
 * Edit File Tool
 *
 * Single Responsibility: Edit files by replacing text
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

interface EditResult {
    success: boolean;
    message?: string;
    path?: string;
    diff?: string;
    replacements?: number;
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

function shouldRequireEditApproval(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return !AUTO_APPROVE_EXTENSIONS.has(ext);
}

export const editFile = tool({
    description:
        "Edit a file by replacing specific text. Use this for making targeted changes to existing files.",
    inputSchema: z.object({
        path: z.string().describe("Path to the file to edit"),
        oldText: z.string().describe("The exact text to find and replace"),
        newText: z.string().describe("The new text to replace with"),
        replaceAll: z
            .boolean()
            .describe("Replace all occurrences (default: false)")
            .default(false),
        expectedReplacements: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe(
                "Optional guard for the exact number of replacements expected",
            ),
    }),

    execute: async ({
        path: filePath,
        oldText,
        newText,
        replaceAll,
        expectedReplacements,
    }): Promise<EditResult> =>
        withToolScheduling("write", async () => {
            try {
                const resolvedPath = path.resolve(process.cwd(), filePath);

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

                // Check if file exists
                if (!fs.existsSync(resolvedPath)) {
                    return {
                        success: false,
                        error: `File not found: ${filePath}`,
                    };
                }

                const unchanged = ensureFileUnchangedSinceRead(resolvedPath);
                if (!unchanged.valid) {
                    return { success: false, error: unchanged.reason };
                }

                const content = fs.readFileSync(resolvedPath, "utf-8");

                if (!content.includes(oldText)) {
                    return {
                        success: false,
                        error: "Could not find the text to replace. Make sure it matches exactly.",
                    };
                }

                // Count occurrences
                const occurrences = content.split(oldText).length - 1;

                if (
                    !replaceAll &&
                    occurrences > 1 &&
                    expectedReplacements === undefined
                ) {
                    return {
                        success: false,
                        error: `Found ${occurrences} matches. Provide expectedReplacements or set replaceAll=true to avoid ambiguous edits.`,
                    };
                }

                const targetReplacements = replaceAll ? occurrences : 1;
                const expected = expectedReplacements ?? targetReplacements;

                if (expected !== targetReplacements) {
                    return {
                        success: false,
                        error: `Replacement guard failed. Expected ${expected}, but operation would replace ${targetReplacements}.`,
                    };
                }

                // Replace text
                let newContent: string;
                let replacementCount: number;

                if (replaceAll) {
                    const escapedOldText = oldText.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&",
                    );
                    newContent = content.replace(
                        new RegExp(escapedOldText, "g"),
                        newText,
                    );
                    replacementCount = occurrences;
                } else {
                    newContent = content.replace(oldText, newText);
                    replacementCount = 1;
                }

                newContent = normalizeLineEndingsForFile(
                    resolvedPath,
                    newContent,
                );

                if (newContent === content) {
                    return {
                        success: true,
                        message: `No changes needed for ${filePath}`,
                        path: resolvedPath,
                        diff: "",
                        replacements: 0,
                        diagnostics: "",
                    };
                }

                fs.writeFileSync(resolvedPath, newContent, "utf-8");
                rememberFileWrite(resolvedPath, newContent);

                // Generate diff showing the change
                const diff = generateEditDiff(
                    filePath,
                    content,
                    newContent,
                    oldText,
                    newText,
                );

                // Run LSP diagnostics
                const diagnostics = await lspManager.getDiagnostics(
                    resolvedPath,
                    newContent,
                );

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
                    message: `Updated ${filePath} (${replacementCount} replacement${replacementCount > 1 ? "s" : ""})`,
                    path: resolvedPath,
                    diff,
                    replacements: replacementCount,
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

/**
 * Find the line number where oldText starts
 * Handles multiple occurrences correctly by finding the actual replacement position
 */
function findLineNumber(content: string, searchText: string): number {
    const index = content.indexOf(searchText);
    if (index === -1) return 1;

    const beforeMatch = content.substring(0, index);
    return beforeMatch.split("\n").length;
}

function generateEditDiff(
    filePath: string,
    originalContent: string,
    newContent: string,
    oldText: string,
    newText: string,
): string {
    const lines: string[] = [];
    const { CONTEXT_LINES } = TOOL_CONSTANTS;

    // Find line number where change occurs in the original content
    const lineNumber = findLineNumber(originalContent, oldText);

    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const allLines = originalContent.split("\n");

    lines.push(`--- ${filePath}`);
    lines.push(`+++ ${filePath}`);
    lines.push(
        `@@ -${lineNumber},${oldLines.length} +${lineNumber},${newLines.length} @@`,
    );

    // Show context (lines before if available)
    const contextStart = Math.max(0, lineNumber - CONTEXT_LINES - 1);
    for (let i = contextStart; i < lineNumber - 1; i++) {
        if (allLines[i] !== undefined) {
            lines.push(`${String(i + 1).padStart(4)}   ${allLines[i]}`);
        }
    }

    // Show removed lines (old text)
    oldLines.forEach((line, i) => {
        lines.push(`${String(lineNumber + i).padStart(4)} - ${line}`);
    });

    // Show added lines (new text)
    newLines.forEach((line, i) => {
        lines.push(`${String(lineNumber + i).padStart(4)} + ${line}`);
    });

    // Show context (lines after if available)
    const afterLineNumber = lineNumber + oldLines.length - 1;
    const contextEnd = Math.min(
        allLines.length,
        afterLineNumber + CONTEXT_LINES,
    );
    for (let i = afterLineNumber; i < contextEnd; i++) {
        if (allLines[i] !== undefined) {
            lines.push(`${String(i + 1).padStart(4)}   ${allLines[i]}`);
        }
    }

    return lines.join("\n");
}
