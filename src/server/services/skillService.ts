import * as fs from "fs";
import * as path from "path";
import { getProjectRoot } from "../utils/cwd";

export interface Skill {
    name: string;
    description: string;
    content: string;
    source: "global" | "project";
    filePath: string;
    location: string;
    triggers?: string[];
}

export interface SkillMetadata {
    name: string;
    description: string;
    triggers?: string[];
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?/;
const IGNORED_DIRECTORIES = new Set([".git", "node_modules"]);

function normalizeSkillName(input: string): string {
    return input
        .trim()
        .replace(/[:\\/<>*?"|]/g, "-")
        .replace(/\s+/g, "-")
        .toLowerCase();
}

function cleanFrontmatterValue(value: string): string {
    const trimmed = value.trim();
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

function parseTriggers(
    lines: string[],
    startIndex: number,
): { values: string[]; nextIndex: number } {
    const line = lines[startIndex] ?? "";
    const inline = line.match(/^\s*triggers:\s*(.*)$/i);
    if (!inline) {
        return { values: [], nextIndex: startIndex };
    }

    const rawValue = inline[1]?.trim() ?? "";
    const values: string[] = [];

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
        const inner = rawValue.slice(1, -1);
        values.push(
            ...inner
                .split(",")
                .map((value) => cleanFrontmatterValue(value))
                .filter(Boolean),
        );
        return {
            values: values.map((v) => v.toLowerCase()),
            nextIndex: startIndex,
        };
    }

    if (rawValue.length > 0) {
        values.push(
            ...rawValue
                .split(",")
                .map((value) => cleanFrontmatterValue(value))
                .filter(Boolean),
        );
        return {
            values: values.map((v) => v.toLowerCase()),
            nextIndex: startIndex,
        };
    }

    let index = startIndex + 1;
    while (index < lines.length) {
        const currentLine = lines[index] ?? "";
        const listMatch = currentLine.match(/^\s*-\s*(.+)$/);
        if (!listMatch) {
            break;
        }
        const value = cleanFrontmatterValue(listMatch[1] ?? "");
        if (value) {
            values.push(value.toLowerCase());
        }
        index++;
    }

    return { values, nextIndex: index - 1 };
}

function parseFrontmatter(
    content: string,
    fallbackName: string,
): { metadata: SkillMetadata; body: string } {
    const match = content.match(FRONTMATTER_REGEX);
    if (!match) {
        const headingMatch = content.match(/^#\s+(.+)$/m);
        const heading = headingMatch?.[1]?.trim() || fallbackName;
        const normalized = normalizeSkillName(heading || fallbackName);
        return {
            metadata: {
                name: normalized || normalizeSkillName(fallbackName),
                description: heading || fallbackName,
            },
            body: content.trim(),
        };
    }

    const frontmatter = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    const lines = frontmatter.split(/\r?\n/);

    let name = "";
    let description = "";
    let triggers: string[] | undefined;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";

        const nameMatch = line.match(/^\s*name:\s*(.*)$/i);
        if (nameMatch) {
            name = cleanFrontmatterValue(nameMatch[1] ?? "");
            continue;
        }

        const descriptionMatch = line.match(/^\s*description:\s*(.*)$/i);
        if (descriptionMatch) {
            const initialValue = cleanFrontmatterValue(
                descriptionMatch[1] ?? "",
            );
            const descriptionParts = [initialValue];
            while (i + 1 < lines.length) {
                const continuation = lines[i + 1] ?? "";
                if (!/^[ \t]+\S/.test(continuation)) {
                    break;
                }
                descriptionParts.push(cleanFrontmatterValue(continuation));
                i++;
            }
            description = descriptionParts.filter(Boolean).join(" ").trim();
            continue;
        }

        if (/^\s*triggers:/i.test(line)) {
            const parsed = parseTriggers(lines, i);
            i = parsed.nextIndex;
            if (parsed.values.length > 0) {
                triggers = parsed.values;
            }
        }
    }

    const resolvedName = normalizeSkillName(name || fallbackName);
    const resolvedDescription = description || fallbackName;

    return {
        metadata: {
            name: resolvedName || normalizeSkillName(fallbackName),
            description: resolvedDescription,
            triggers,
        },
        body,
    };
}

function isPathInside(parent: string, candidate: string): boolean {
    const relative = path.relative(
        path.resolve(parent),
        path.resolve(candidate),
    );
    return (
        relative === "" ||
        (!relative.startsWith("..") && !path.isAbsolute(relative))
    );
}

class SkillService {
    private primaryGlobalSkillsDir: string;
    private cache: Map<string, Skill[]> = new Map();
    private lastScanTime: Map<string, number> = new Map();
    private static readonly CACHE_TTL = 5000;

    constructor() {
        this.primaryGlobalSkillsDir = this.getLegacyGlobalSkillsDir();
        this.ensureDirectoryExists(this.primaryGlobalSkillsDir);
    }

    private getHomeDir(): string {
        return process.env.HOME || process.env.USERPROFILE || "~";
    }

    private getCodexHomeDir(): string {
        return process.env.CODEX_HOME || path.join(this.getHomeDir(), ".codex");
    }

    private getConfigDir(): string {
        const homeDir = this.getHomeDir();
        const configBase =
            process.platform === "darwin" || process.platform === "linux"
                ? path.join(homeDir, ".config")
                : path.join(homeDir, "AppData", "Roaming");
        return path.join(configBase, "zencode");
    }

    private getLegacyGlobalSkillsDir(): string {
        return path.join(this.getConfigDir(), "skills");
    }

    private getProjectSkillsDir(projectDir?: string): string {
        const cwd = projectDir || getProjectRoot();
        return path.join(cwd, ".zencode", "skills");
    }

    private getGlobalSkillRoots(): string[] {
        return [
            this.getLegacyGlobalSkillsDir(),
            path.join(this.getCodexHomeDir(), "skills"),
            path.join(this.getHomeDir(), ".agents", "skills"),
        ];
    }

    private getProjectSkillRoots(projectDir?: string): string[] {
        const cwd = projectDir || getProjectRoot();
        return [
            path.join(cwd, "skills"),
            path.join(cwd, ".opencode", "skills"),
            path.join(cwd, ".cursor", "skills"),
            path.join(cwd, ".claude", "skills"),
            path.join(cwd, ".codex", "skills"),
            path.join(cwd, ".gemini", "skills"),
            path.join(cwd, ".zencode", "skills"),
            path.join(cwd, ".agents", "skills"),
        ];
    }

    private ensureDirectoryExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private isCacheValid(key: string): boolean {
        const lastScan = this.lastScanTime.get(key);
        if (!lastScan) return false;
        return Date.now() - lastScan < SkillService.CACHE_TTL;
    }

    private collectSkillFiles(rootDir: string): string[] {
        if (!fs.existsSync(rootDir)) {
            return [];
        }

        let stats: fs.Stats;
        try {
            stats = fs.statSync(rootDir);
        } catch {
            return [];
        }

        if (!stats.isDirectory()) {
            return [];
        }

        const candidates = new Set<string>();

        const rootSkill = path.join(rootDir, "SKILL.md");
        if (fs.existsSync(rootSkill) && fs.statSync(rootSkill).isFile()) {
            candidates.add(rootSkill);
        }

        const walkForSkillMd = (dirPath: string, depth: number): void => {
            if (depth > 4) {
                return;
            }

            let entries: fs.Dirent[] = [];
            try {
                entries = fs.readdirSync(dirPath, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (IGNORED_DIRECTORIES.has(entry.name)) {
                    continue;
                }

                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    const skillPath = path.join(fullPath, "SKILL.md");
                    if (
                        fs.existsSync(skillPath) &&
                        fs.statSync(skillPath).isFile()
                    ) {
                        candidates.add(skillPath);
                    }
                    walkForSkillMd(fullPath, depth + 1);
                    continue;
                }

                if (!entry.isFile() || depth !== 0) {
                    continue;
                }

                if (entry.name.endsWith(".md")) {
                    const lowerName = entry.name.toLowerCase();
                    if (
                        lowerName === "readme.md" ||
                        lowerName === "agents.md"
                    ) {
                        continue;
                    }
                    candidates.add(fullPath);
                }
            }
        };

        walkForSkillMd(rootDir, 0);

        return Array.from(candidates).sort((a, b) => a.localeCompare(b));
    }

    private getSkillFallbackName(filePath: string): string {
        const fileName = path.basename(filePath);
        if (fileName.toUpperCase() === "SKILL.MD") {
            return path.basename(path.dirname(filePath));
        }
        return path.basename(filePath, path.extname(filePath));
    }

    private loadSkillFromFile(
        filePath: string,
        source: "global" | "project",
    ): Skill | null {
        try {
            const rawContent = fs.readFileSync(filePath, "utf-8");
            const fallbackName = this.getSkillFallbackName(filePath);
            const { metadata, body } = parseFrontmatter(
                rawContent,
                fallbackName,
            );

            if (!metadata.name || !metadata.description) {
                return null;
            }

            const normalizedName = normalizeSkillName(
                metadata.name || fallbackName,
            );
            if (!normalizedName) {
                return null;
            }

            const normalizedPath = path.resolve(filePath);

            return {
                name: normalizedName,
                description: metadata.description.trim(),
                content: body || rawContent.trim(),
                source,
                filePath: normalizedPath,
                location: normalizedPath,
                triggers: metadata.triggers?.filter(Boolean),
            };
        } catch {
            return null;
        }
    }

    private scanRoots(roots: string[], source: "global" | "project"): Skill[] {
        const skillMap = new Map<string, Skill>();

        for (const root of roots) {
            const files = this.collectSkillFiles(root);
            for (const filePath of files) {
                const skill = this.loadSkillFromFile(filePath, source);
                if (skill) {
                    skillMap.set(skill.name, skill);
                }
            }
        }

        return Array.from(skillMap.values());
    }

    getAllSkills(projectDir?: string): Skill[] {
        const cwd = projectDir || getProjectRoot();
        const cacheKey = `all:${cwd}`;

        if (this.isCacheValid(cacheKey) && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const combined = new Map<string, Skill>();
        const globalSkills = this.scanRoots(
            this.getGlobalSkillRoots(),
            "global",
        );
        for (const skill of globalSkills) {
            combined.set(skill.name, skill);
        }

        const projectSkills = this.scanRoots(
            this.getProjectSkillRoots(cwd),
            "project",
        );
        for (const skill of projectSkills) {
            combined.set(skill.name, skill);
        }

        const allSkills = Array.from(combined.values());
        this.cache.set(cacheKey, allSkills);
        this.lastScanTime.set(cacheKey, Date.now());

        return allSkills;
    }

    getGlobalSkills(): Skill[] {
        const cacheKey = "global";

        if (this.isCacheValid(cacheKey) && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const skills = this.scanRoots(this.getGlobalSkillRoots(), "global");
        this.cache.set(cacheKey, skills);
        this.lastScanTime.set(cacheKey, Date.now());

        return skills;
    }

    getProjectSkills(projectDir?: string): Skill[] {
        const cwd = projectDir || getProjectRoot();
        const cacheKey = `project:${cwd}`;

        if (this.isCacheValid(cacheKey) && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const skills = this.scanRoots(
            this.getProjectSkillRoots(cwd),
            "project",
        );
        this.cache.set(cacheKey, skills);
        this.lastScanTime.set(cacheKey, Date.now());

        return skills;
    }

    getSkill(name: string, projectDir?: string): Skill | null {
        const normalizedName = normalizeSkillName(name);
        const skills = this.getAllSkills(projectDir);
        return skills.find((skill) => skill.name === normalizedName) || null;
    }

    getSkillNames(projectDir?: string): string[] {
        return this.getAllSkills(projectDir).map((skill) => skill.name);
    }

    findSkillsByTrigger(text: string, projectDir?: string): Skill[] {
        const skills = this.getAllSkills(projectDir);
        const lowerText = text.toLowerCase();

        return skills.filter((skill) =>
            skill.triggers?.some((trigger) =>
                lowerText.includes(trigger.toLowerCase()),
            ),
        );
    }

    isPathInSkillResources(
        candidatePath: string,
        projectDir?: string,
    ): boolean {
        const resolved = path.resolve(candidatePath);
        const skills = this.getAllSkills(projectDir);
        for (const skill of skills) {
            const skillDir = path.dirname(skill.filePath);
            if (isPathInside(skillDir, resolved)) {
                return true;
            }
        }
        return false;
    }

    getSkillResourceTree(
        skillName: string,
        projectDir?: string,
        maxEntries = 120,
    ): string {
        const skill = this.getSkill(skillName, projectDir);
        if (!skill) {
            return "";
        }

        const rootDir = path.dirname(skill.filePath);
        if (!fs.existsSync(rootDir)) {
            return "";
        }

        const lines: string[] = [];
        let count = 0;
        const maxDepth = 4;

        const walk = (dir: string, prefix: string, depth: number): void => {
            if (count >= maxEntries || depth > maxDepth) {
                return;
            }

            let entries: fs.Dirent[] = [];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }

            const visibleEntries = entries
                .filter((entry) => !IGNORED_DIRECTORIES.has(entry.name))
                .sort((a, b) => a.name.localeCompare(b.name));

            for (let i = 0; i < visibleEntries.length; i++) {
                if (count >= maxEntries) {
                    return;
                }

                const entry = visibleEntries[i]!;
                const isLast = i === visibleEntries.length - 1;
                const label = `${entry.name}${entry.isDirectory() ? "/" : ""}`;
                lines.push(`${prefix}${isLast ? "\\-- " : "|-- "}${label}`);
                count++;

                if (entry.isDirectory()) {
                    const nextPrefix = `${prefix}${isLast ? "    " : "|   "}`;
                    walk(path.join(dir, entry.name), nextPrefix, depth + 1);
                }
            }
        };

        lines.push(path.basename(rootDir) + "/");
        walk(rootDir, "", 0);

        if (count >= maxEntries) {
            lines.push("... (truncated)");
        }

        return lines.join("\n");
    }

    createSkill(
        name: string,
        description: string,
        content: string,
        scope: "global" | "project",
        triggers?: string[],
        projectDir?: string,
    ): Skill {
        const dir =
            scope === "global"
                ? this.primaryGlobalSkillsDir
                : this.getProjectSkillsDir(projectDir);

        this.ensureDirectoryExists(dir);

        const normalizedName = normalizeSkillName(name);
        const skillDir = path.join(dir, normalizedName);
        this.ensureDirectoryExists(skillDir);

        const filePath = path.join(skillDir, "SKILL.md");

        let fileContent = "---\n";
        fileContent += `name: ${normalizedName}\n`;
        fileContent += `description: ${description.trim()}\n`;
        if (triggers && triggers.length > 0) {
            fileContent += "triggers:\n";
            for (const trigger of triggers) {
                const trimmed = trigger.trim();
                if (trimmed) {
                    fileContent += `  - ${trimmed}\n`;
                }
            }
        }
        fileContent += "---\n\n";
        fileContent += content.trim() + "\n";

        fs.writeFileSync(filePath, fileContent, "utf-8");
        this.invalidateCache();

        return {
            name: normalizedName,
            description: description.trim(),
            content: content.trim(),
            source: scope,
            filePath,
            location: filePath,
            triggers: triggers
                ?.map((trigger) => trigger.toLowerCase())
                .filter(Boolean),
        };
    }

    deleteSkill(
        name: string,
        scope?: "global" | "project",
        projectDir?: string,
    ): boolean {
        const skill = this.getSkill(name, projectDir);

        if (!skill) {
            return false;
        }

        if (scope && skill.source !== scope) {
            return false;
        }

        try {
            fs.unlinkSync(skill.filePath);

            const parentDir = path.dirname(skill.filePath);
            const remainingEntries = fs.readdirSync(parentDir);
            if (
                remainingEntries.length === 0 &&
                path.basename(skill.filePath).toUpperCase() === "SKILL.MD"
            ) {
                fs.rmdirSync(parentDir);
            }

            this.invalidateCache();
            return true;
        } catch {
            return false;
        }
    }

    invalidateCache(): void {
        this.cache.clear();
        this.lastScanTime.clear();
    }

    getSkillTemplate(name: string, description: string): string {
        const normalizedName = normalizeSkillName(name);
        return `---
name: ${normalizedName}
description: ${description}
triggers:
  - example trigger
---

# ${normalizedName}

Add your skill instructions here.
`;
    }

    getGlobalSkillsDirPath(): string {
        return this.primaryGlobalSkillsDir;
    }

    getProjectSkillsDirPath(projectDir?: string): string {
        return this.getProjectSkillsDir(projectDir);
    }
}

export const skillService = new SkillService();
