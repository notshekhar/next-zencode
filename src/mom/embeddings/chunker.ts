import * as path from "path";

export interface Chunk {
    content: string;
    startLine: number;
    endLine: number;
    filePath: string;
    language: string;
}

const TARGET_LINES = 60;
const MIN_LINES = 15;
const MAX_LINES = 120;
const OVERLAP_LINES = 5;

const LANGUAGE_MAP: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".css": "css",
    ".scss": "scss",
    ".less": "css",
    ".html": "html",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".md": "markdown",
    ".mdx": "markdown",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".prisma": "prisma",
    ".svelte": "svelte",
    ".vue": "vue",
    ".astro": "astro",
    ".swift": "swift",
    ".kt": "kotlin",
    ".rb": "ruby",
    ".php": "php",
    ".lua": "lua",
    ".zig": "zig",
    ".ex": "elixir",
    ".exs": "elixir",
    ".erl": "erlang",
    ".dockerfile": "dockerfile",
    ".xml": "xml",
    ".env": "env",
    ".ini": "ini",
    ".cfg": "ini",
    ".txt": "text",
};

function detectLanguage(filePath: string): string {
    const base = path.basename(filePath).toLowerCase();
    if (base === "dockerfile" || base.startsWith("dockerfile."))
        return "dockerfile";
    if (base === "makefile" || base === "gnumakefile") return "makefile";

    const ext = path.extname(filePath).toLowerCase();
    return LANGUAGE_MAP[ext] || "text";
}

const BOUNDARY_PATTERNS = [
    /^(export\s+)?(async\s+)?function\s+/,
    /^(export\s+)?(default\s+)?class\s+/,
    /^(export\s+)?(const|let|var)\s+\w+\s*[:=]/,
    /^(export\s+)?interface\s+/,
    /^(export\s+)?type\s+\w+/,
    /^(export\s+)?enum\s+/,
    /^(\/\/\s*={4,})/,
    /^(def|async\s+def)\s+\w+/,
    /^(pub\s+)?(fn|struct|enum|impl|trait|mod)\s+/,
    /^func\s+/,
    /^(public|private|protected)\s+(static\s+)?[\w<>]+\s+\w+\s*\(/,
    /^#{1,6}\s+/,
    /^---$/,
    /^@@\s/,
    /^\[[\w.]+\]/,
];

function isBoundaryLine(line: string): boolean {
    const trimmed = line.trimStart();
    if (!trimmed) return false;
    // Only treat as boundary if the line has no or minimal indentation
    // (top-level declarations, not nested code)
    const indent = line.length - line.trimStart().length;
    if (indent > 4) return false;
    return BOUNDARY_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * Look for the best place to break the chunk near `target`.
 * Prefers function/class boundaries, then empty lines.
 */
function findBestBreak(
    lines: string[],
    minPos: number,
    maxPos: number,
    target: number,
): number {
    const cap = Math.min(maxPos, lines.length);
    const searchRadius = 15;

    for (let offset = 0; offset <= searchRadius; offset++) {
        for (const pos of [target + offset, target - offset]) {
            if (pos > minPos && pos < cap && isBoundaryLine(lines[pos])) {
                return pos;
            }
        }
    }

    for (let offset = 0; offset <= searchRadius; offset++) {
        for (const pos of [target + offset, target - offset]) {
            if (
                pos > minPos &&
                pos < cap &&
                lines[pos]?.trim() === ""
            ) {
                return pos + 1;
            }
        }
    }

    return Math.min(target, cap);
}

/**
 * Prepend file path context to chunk text so embeddings capture
 * both the code content and its location in the project.
 */
function formatChunkText(
    filePath: string,
    content: string,
    startLine: number,
    endLine: number,
): string {
    return `File: ${filePath} (lines ${startLine}-${endLine})\n\n${content}`;
}

export function chunkFile(filePath: string, content: string): Chunk[] {
    const lines = content.split("\n");
    const language = detectLanguage(filePath);

    if (lines.length === 0 || !content.trim()) return [];

    if (lines.length <= TARGET_LINES) {
        return [
            {
                content: formatChunkText(filePath, content, 1, lines.length),
                startLine: 1,
                endLine: lines.length,
                filePath,
                language,
            },
        ];
    }

    const chunks: Chunk[] = [];
    let start = 0;

    while (start < lines.length) {
        let end = Math.min(start + TARGET_LINES, lines.length);

        if (end < lines.length) {
            end = findBestBreak(
                lines,
                start + MIN_LINES,
                start + MAX_LINES,
                end,
            );
        }

        end = Math.min(end, start + MAX_LINES, lines.length);

        if (end <= start) {
            end = Math.min(start + TARGET_LINES, lines.length);
        }

        const slice = lines.slice(start, end).join("\n");
        chunks.push({
            content: formatChunkText(filePath, slice, start + 1, end),
            startLine: start + 1,
            endLine: end,
            filePath,
            language,
        });

        const nextStart = end - OVERLAP_LINES;
        if (lines.length - nextStart <= MIN_LINES) break;
        if (nextStart <= start) break;
        start = nextStart;
    }

    return chunks;
}

/**
 * Chunk multiple files at once. Returns flat array of all chunks.
 */
export function chunkFiles(
    files: Array<{ relativePath: string; content: string }>,
): Chunk[] {
    return files.flatMap((f) => chunkFile(f.relativePath, f.content));
}
