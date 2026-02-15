/**
 * Common interfaces for tool results following SOLID principles
 * Single Responsibility: This file only defines tool-related types
 * Open/Closed: New result types can extend these without modifying existing code
 */

// Base result type - all tools return this shape
export interface ToolResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// Specific result types for different tools
export interface BashResult extends ToolResult<{
    stdout: string;
    stderr: string;
    exitCode: number;
}> {
    blocked?: boolean;
    denied?: boolean;
}

export interface FileResult extends ToolResult<{
    path: string;
    content?: string;
    size?: number;
    lines?: number;
}> {}

export interface WriteResult extends ToolResult<{
    path: string;
    bytes: number;
    diff: string;
    isNew: boolean;
}> {}

export interface EditResult extends ToolResult<{
    path: string;
    diff: string;
}> {}

export interface ListResult extends ToolResult<{
    path: string;
    files: Array<{ name: string; type: "file" | "directory" }>;
    count: number;
}> {}

export interface SearchResult extends ToolResult<{
    files: string[];
    count: number;
}> {}

export interface GrepResult extends ToolResult<{
    matches: string[];
    count: number;
}> {}

// Constants for tool configuration
export const TOOL_CONSTANTS = {
    // Preview limits
    DIFF_PREVIEW_LINES: 20,
    OLD_CONTENT_PREVIEW_LINES: 10,
    CONTEXT_LINES: 3,

    // Search limits
    FILE_SEARCH_LIMIT: 30,
    GREP_RESULT_LIMIT: 20,

    // Display limits
    MAX_DISPLAY_LINES: 4,
    COMMAND_TRUNCATE_LENGTH: 80,
} as const;
