import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "../utils/cwd";

export interface FileMatch {
    name: string;
    path: string;
    relativePath: string;
    type: "file" | "directory";
    score: number;
}

const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    ".nuxt",
    "dist",
    "build",
    ".cache",
    "coverage",
    ".turbo",
    ".vercel",
    ".output",
    "__pycache__",
    ".pytest_cache",
    "venv",
    ".venv",
    "target",
    ".idea",
    ".vscode",
]);

const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", ".env", ".env.local"]);

function fuzzyScore(pattern: string, text: string): number {
    pattern = pattern.toLowerCase();
    text = text.toLowerCase();

    if (text === pattern) return 1000;
    if (text.startsWith(pattern))
        return 500 + (pattern.length / text.length) * 100;
    if (text.includes(pattern))
        return 200 + (pattern.length / text.length) * 50;

    let patternIdx = 0;
    let score = 0;
    let consecutiveBonus = 0;
    let lastMatchIdx = -1;

    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
        if (text[i] === pattern[patternIdx]) {
            if (lastMatchIdx === i - 1) consecutiveBonus += 10;
            if (
                i === 0 ||
                text[i - 1] === "/" ||
                text[i - 1] === "-" ||
                text[i - 1] === "_" ||
                text[i - 1] === "."
            ) {
                score += 15;
            }
            score += 10 + consecutiveBonus;
            lastMatchIdx = i;
            patternIdx++;
        } else {
            consecutiveBonus = 0;
        }
    }

    return patternIdx === pattern.length ? score : 0;
}

class FileSearchService {
    private cache: Map<string, { files: string[]; timestamp: number }> =
        new Map();
    private static readonly CACHE_TTL = 10000;

    private shouldIgnore(name: string, isDir: boolean): boolean {
        if (isDir) return IGNORED_DIRS.has(name);
        return IGNORED_FILES.has(name) || name.startsWith(".");
    }

    private scanDirectory(
        dir: string,
        baseDir: string,
        files: string[],
        maxDepth: number,
        currentDepth: number = 0,
    ): void {
        if (currentDepth >= maxDepth) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (this.shouldIgnore(entry.name, entry.isDirectory()))
                    continue;

                const fullPath = path.join(dir, entry.name);
                const relativePath = path.relative(baseDir, fullPath);

                if (entry.isDirectory()) {
                    files.push(relativePath + "/");
                    this.scanDirectory(
                        fullPath,
                        baseDir,
                        files,
                        maxDepth,
                        currentDepth + 1,
                    );
                } else {
                    files.push(relativePath);
                }
            }
        } catch {
            // Skip directories we can't read
        }
    }

    private getFileList(projectDir: string): string[] {
        const cached = this.cache.get(projectDir);
        if (
            cached &&
            Date.now() - cached.timestamp < FileSearchService.CACHE_TTL
        ) {
            return cached.files;
        }

        const files: string[] = [];
        this.scanDirectory(projectDir, projectDir, files, 6);

        this.cache.set(projectDir, { files, timestamp: Date.now() });
        return files;
    }

    search(
        query: string,
        projectDir?: string,
        limit: number = 10,
    ): FileMatch[] {
        const cwd = projectDir || getProjectRoot();
        const files = this.getFileList(cwd);

        if (!query || query === "@") {
            return files.slice(0, limit).map((f) => ({
                name: path.basename(f),
                path: path.join(cwd, f),
                relativePath: f,
                type: f.endsWith("/")
                    ? ("directory" as const)
                    : ("file" as const),
                score: 0,
            }));
        }

        const searchTerm = query.startsWith("@") ? query.slice(1) : query;

        const results: FileMatch[] = [];

        for (const file of files) {
            const fileName = path.basename(file);
            const score = Math.max(
                fuzzyScore(searchTerm, fileName),
                fuzzyScore(searchTerm, file) * 0.8,
            );

            if (score > 0) {
                results.push({
                    name: fileName,
                    path: path.join(cwd, file),
                    relativePath: file,
                    type: file.endsWith("/") ? "directory" : "file",
                    score,
                });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }

    invalidateCache(projectDir?: string): void {
        if (projectDir) {
            this.cache.delete(projectDir);
        } else {
            this.cache.clear();
        }
    }
}

export const fileSearchService = new FileSearchService();
