import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export interface ScannedFile {
    relativePath: string;
    absolutePath: string;
    content: string;
    hash: string;
}

const SUPPORTED_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".rs",
    ".go",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".css",
    ".scss",
    ".less",
    ".html",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".md",
    ".mdx",
    ".sql",
    ".sh",
    ".bash",
    ".zsh",
    ".graphql",
    ".gql",
    ".prisma",
    ".svelte",
    ".vue",
    ".astro",
    ".swift",
    ".kt",
    ".rb",
    ".php",
    ".lua",
    ".zig",
    ".ex",
    ".exs",
    ".erl",
    ".xml",
    ".env.example",
    ".cfg",
    ".ini",
    ".txt",
    ".dockerfile",
]);

const ALWAYS_IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    ".nuxt",
    ".output",
    "dist",
    "build",
    "out",
    ".cache",
    ".turbo",
    ".vercel",
    ".netlify",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    "target",
    "vendor",
    ".idea",
    ".vscode",
    ".cursor",
    ".svn",
    ".hg",
    ".DS_Store",
    "bower_components",
    ".parcel-cache",
    ".webpack",
    ".docusaurus",
    ".expo",
    ".yarn",
    ".pnp",
]);

const ALWAYS_IGNORE_FILES = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    "bun.lock",
    "composer.lock",
    "Gemfile.lock",
    "Cargo.lock",
    "poetry.lock",
    "Pipfile.lock",
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
]);

const MAX_FILE_SIZE = 100 * 1024; // 100 KB

function isSupportedFile(filePath: string): boolean {
    const base = path.basename(filePath).toLowerCase();
    if (ALWAYS_IGNORE_FILES.has(base)) return false;

    if (
        base === "dockerfile" ||
        base.startsWith("dockerfile.") ||
        base === "makefile" ||
        base === "gnumakefile"
    ) {
        return true;
    }

    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
}

function quickHash(content: string): string {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(content);
    return hasher.digest("hex");
}

/**
 * Try using `git ls-files` to get the list of tracked + untracked files.
 * This automatically respects .gitignore.
 */
function tryGitLsFiles(projectPath: string): string[] | null {
    try {
        const stdout = execSync(
            "git ls-files --cached --others --exclude-standard",
            {
                cwd: projectPath,
                encoding: "utf-8",
                maxBuffer: 10 * 1024 * 1024,
                timeout: 10_000,
            },
        );
        return stdout.trim().split("\n").filter(Boolean);
    } catch {
        return null;
    }
}

/**
 * Fallback: walk the directory tree manually, skipping ignored dirs.
 */
function walkDirectory(dir: string, base: string): string[] {
    const results: string[] = [];

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (entry.name.startsWith(".") && ALWAYS_IGNORE_DIRS.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (ALWAYS_IGNORE_DIRS.has(entry.name)) continue;
            results.push(...walkDirectory(fullPath, base));
        } else if (entry.isFile()) {
            const rel = path.relative(base, fullPath);
            results.push(rel);
        }
    }

    return results;
}

export function scanProject(projectPath: string): ScannedFile[] {
    const fileList = tryGitLsFiles(projectPath) ?? walkDirectory(projectPath, projectPath);

    const results: ScannedFile[] = [];

    for (const relativePath of fileList) {
        if (!isSupportedFile(relativePath)) continue;

        // Skip files in ignored directories
        const parts = relativePath.split(path.sep);
        if (parts.some((p) => ALWAYS_IGNORE_DIRS.has(p))) continue;

        const absolutePath = path.join(projectPath, relativePath);

        let stat: fs.Stats;
        try {
            stat = fs.statSync(absolutePath);
        } catch {
            continue;
        }

        if (!stat.isFile() || stat.size > MAX_FILE_SIZE || stat.size === 0)
            continue;

        let content: string;
        try {
            content = fs.readFileSync(absolutePath, "utf-8");
        } catch {
            continue;
        }

        // Skip binary-looking content (high ratio of non-printable chars)
        const sample = content.slice(0, 1000);
        const nonPrintable = (sample.match(/[\x00-\x08\x0E-\x1F]/g) || [])
            .length;
        if (nonPrintable / sample.length > 0.1) continue;

        results.push({
            relativePath: relativePath.replace(/\\/g, "/"),
            absolutePath,
            content,
            hash: quickHash(content),
        });
    }

    return results;
}
