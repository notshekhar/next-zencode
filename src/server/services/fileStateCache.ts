import * as fs from "fs";
import * as path from "path";

interface CachedFileState {
    mtimeMs: number;
    size: number;
    lastReadAt: number;
    lineEnding: "lf" | "crlf";
}

const FILE_STATE_TTL_MS = 15 * 60 * 1000;
const fileStateCache = new Map<string, CachedFileState>();

import { getProjectRoot } from "../utils/cwd";

function normalizePath(filePath: string): string {
    return path.resolve(getProjectRoot(), filePath);
}

function detectLineEnding(content: string): "lf" | "crlf" {
    return content.includes("\r\n") ? "crlf" : "lf";
}

function clearExpiredEntries(): void {
    const now = Date.now();
    for (const [filePath, state] of fileStateCache.entries()) {
        if (now - state.lastReadAt > FILE_STATE_TTL_MS) {
            fileStateCache.delete(filePath);
        }
    }
}

export function rememberFileRead(filePath: string, content: string): void {
    clearExpiredEntries();

    const resolvedPath = normalizePath(filePath);
    const stats = fs.statSync(resolvedPath);

    fileStateCache.set(resolvedPath, {
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        lastReadAt: Date.now(),
        lineEnding: detectLineEnding(content),
    });
}

export function rememberFileWrite(filePath: string, content: string): void {
    clearExpiredEntries();

    const resolvedPath = normalizePath(filePath);
    const stats = fs.statSync(resolvedPath);

    fileStateCache.set(resolvedPath, {
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        lastReadAt: Date.now(),
        lineEnding: detectLineEnding(content),
    });
}

export function getCachedLineEnding(filePath: string): "lf" | "crlf" | null {
    clearExpiredEntries();
    const resolvedPath = normalizePath(filePath);
    return fileStateCache.get(resolvedPath)?.lineEnding ?? null;
}

export function ensureFileUnchangedSinceRead(filePath: string): {
    valid: boolean;
    reason?: string;
} {
    clearExpiredEntries();

    const resolvedPath = normalizePath(filePath);
    const cached = fileStateCache.get(resolvedPath);

    if (!cached) {
        return {
            valid: false,
            reason: "File must be read with readFile before modifying it.",
        };
    }

    if (!fs.existsSync(resolvedPath)) {
        return {
            valid: false,
            reason: "File no longer exists on disk.",
        };
    }

    const stats = fs.statSync(resolvedPath);

    if (stats.mtimeMs !== cached.mtimeMs || stats.size !== cached.size) {
        return {
            valid: false,
            reason: "File changed since the last read. Read it again before modifying.",
        };
    }

    return { valid: true };
}

export function normalizeLineEndingsForFile(
    filePath: string,
    content: string,
): string {
    const lineEnding = getCachedLineEnding(filePath);
    if (lineEnding === "crlf") {
        return content.replace(/\r?\n/g, "\r\n");
    }
    return content.replace(/\r\n/g, "\n");
}
