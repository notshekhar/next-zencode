import type { ToolCall } from "../shared/types";

/**
 * Helper functions to track which tools modify files
 * and extract file paths from tool calls
 */

const FILE_MODIFYING_TOOLS = new Set([
    "writeFile",
    "editFile",
    "replaceInFile",
    "bash", // Bash can modify files
]);

export function isFileModifyingTool(tool: ToolCall): boolean {
    return FILE_MODIFYING_TOOLS.has(tool.name);
}

export function getFilesFromTool(tool: ToolCall): string[] {
    const files: string[] = [];

    switch (tool.name) {
        case "writeFile":
        case "editFile":
            if (tool.args.path) {
                files.push(tool.args.path as string);
            } else if (tool.args.file) {
                files.push(tool.args.file as string);
            }
            break;

        case "replaceInFile":
            if (tool.args.file) {
                files.push(tool.args.file as string);
            }
            break;

        case "bash":
            // For bash commands, we can't always determine which files were modified
            // We'll need to track this differently (future enhancement)
            break;
    }

    return files.filter(Boolean);
}

/**
 * Collect all files modified from an array of stream parts
 */
export function collectModifiedFiles(
    parts: Array<{ type: string; toolCall?: ToolCall }>,
): string[] {
    const files = new Set<string>();

    for (const part of parts) {
        if (part.type === "tool" && part.toolCall) {
            const toolFiles = getFilesFromTool(part.toolCall);
            toolFiles.forEach((f) => files.add(f));
        }
    }

    return Array.from(files);
}
