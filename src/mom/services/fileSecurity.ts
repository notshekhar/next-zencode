/**
 * File Security Service
 *
 * Single Responsibility: Validates file access permissions
 * Uses shared just-bash executor for git commands.
 */

import * as fs from "fs";
import * as path from "path";
import { exec, toJustBashPath } from "./bashExecutor";

// Sensitive file patterns that should always be blocked
const SENSITIVE_FILE_PATTERNS = [
    /^\.env($|\.)/i, // .env files
    /^\.git$/, // .git directory itself
    /credentials\.json$/i, // credentials files
    /secrets?\.(json|yaml|yml)$/i, // secrets files
    /^id_rsa/, // SSH keys
    /^id_ed25519/, // SSH keys
    /\.pem$/i, // PEM files
    /\.key$/i, // Key files
] as const;

// Common ignored patterns (for sync check without git)
const COMMON_IGNORED_PATTERNS = [
    /^node_modules$/,
    /^\.git$/,
    /^dist$/,
    /^build$/,
    /^coverage$/,
    /^\.cache$/,
    /^\.tmp$/,
    /^\.DS_Store$/,
    /^Thumbs\.db$/,
    /\.log$/,
    /\.swp$/,
    /\.swo$/,
    /~$/,
] as const;

// Cache for git ignore checks to avoid repeated commands
const gitIgnoreCache = new Map<string, boolean>();
const CACHE_TTL = 30000; // 30 seconds
let lastCacheClear = Date.now();

function clearCacheIfNeeded(): void {
    if (Date.now() - lastCacheClear > CACHE_TTL) {
        gitIgnoreCache.clear();
        lastCacheClear = Date.now();
    }
}

/**
 * Check if a file is executable
 */
export function isFileExecutable(filePath: string): boolean {
    try {
        const stats = fs.statSync(filePath);
        const isUnixExecutable = !!(stats.mode & 0o111);
        return isUnixExecutable && !stats.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Check if a file matches sensitive file patterns
 */
function isSensitiveFile(filePath: string): boolean {
    const basename = path.basename(filePath);
    return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(basename));
}

/**
 * Check if a file is ignored by git (async version)
 * Uses shared just-bash executor with caching
 */
export async function isGitIgnoredAsync(filePath: string): Promise<boolean> {
    clearCacheIfNeeded();

    if (gitIgnoreCache.has(filePath)) {
        return gitIgnoreCache.get(filePath)!;
    }

    try {
        const justBashPath = toJustBashPath(filePath);
        const result = await exec(
            `git check-ignore -q "${justBashPath}" 2>/dev/null`,
        );
        const isIgnored = result.exitCode === 0;
        gitIgnoreCache.set(filePath, isIgnored);
        return isIgnored;
    } catch {
        gitIgnoreCache.set(filePath, false);
        return false;
    }
}

/**
 * Synchronous version - uses heuristic check
 */
export function isGitIgnored(filePath: string): boolean {
    const pathParts = filePath.split(path.sep);
    for (const part of pathParts) {
        for (const pattern of COMMON_IGNORED_PATTERNS) {
            if (pattern.test(part)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if a file is ignored by git or is a sensitive configuration file
 */
export function isFileIgnored(filePath: string): boolean {
    if (path.basename(filePath) === ".gitignore") {
        return true;
    }

    if (isSensitiveFile(filePath)) {
        return true;
    }

    return isGitIgnored(filePath);
}

import { getProjectRoot } from "../utils/cwd";

/**
 * Check if a path is within the project directory
 */
export function isPathInProject(
    filePath: string,
    projectDir?: string,
): boolean {
    const baseDir = projectDir || getProjectRoot();
    const resolvedPath = path.resolve(baseDir, filePath);
    const normalizedBase = path.normalize(baseDir);

    const relativePath = path.relative(normalizedBase, resolvedPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return false;
    }

    return true;
}

/**
 * Check if a path contains dangerous patterns
 */
function hasDangerousPath(filePath: string): boolean {
    if (filePath.includes("\0")) {
        return true;
    }

    const parentRefs = (filePath.match(/\.\./g) || []).length;
    if (parentRefs > 5) {
        return true;
    }

    return false;
}

export interface FileAllowedResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Validate if a file is allowed to be read or listed
 */
export function isFileAllowed(filePath: string): FileAllowedResult {
    if (hasDangerousPath(filePath)) {
        return {
            allowed: false,
            reason: "File path contains dangerous patterns",
        };
    }

    if (isFileIgnored(filePath)) {
        return {
            allowed: false,
            reason: "File is ignored by git or is a sensitive file",
        };
    }

    if (isFileExecutable(filePath)) {
        return { allowed: false, reason: "File is executable" };
    }

    return { allowed: true };
}

/**
 * Validate if a directory is allowed to be listed
 */
export function isDirectoryAllowed(dirPath: string): FileAllowedResult {
    if (hasDangerousPath(dirPath)) {
        return {
            allowed: false,
            reason: "Directory path contains dangerous patterns",
        };
    }

    if (path.basename(dirPath) === ".git") {
        return { allowed: false, reason: "Cannot access .git directory" };
    }

    return { allowed: true };
}
