import { exec, shellEscape } from "./bashExecutor";
import * as path from "path";
import { getProjectRoot } from "../utils/cwd";

/**
 * Git Worktree Manager for tracking file changes across AI operations
 * Each message in the timeline gets its own git commit/worktree reference
 */
export class GitWorktreeManager {
    private baseDir: string;
    private isGitRepo: boolean = false;

    constructor(baseDir: string = getProjectRoot()) {
        this.baseDir = baseDir;
    }

    /**
     * Initialize git repository if it doesn't exist
     */
    async init(): Promise<boolean> {
        try {
            // Check if already a git repo
            await exec("git rev-parse --git-dir", { cwd: this.baseDir });
            this.isGitRepo = true;
            return true;
        } catch {
            // Initialize new git repo
            try {
                await exec("git init", { cwd: this.baseDir });
                // Configure git user for commits
                await exec('git config user.email "zencode@local"', {
                    cwd: this.baseDir,
                });
                await exec('git config user.name "ZenCode"', {
                    cwd: this.baseDir,
                });
                this.isGitRepo = true;
                return true;
            } catch (error) {
                console.error("Failed to initialize git:", error);
                return false;
            }
        }
    }

    /**
     * Create a commit for the current state
     * Returns the commit hash
     */
    async createCommit(
        messageId: string,
        messageContent: string,
    ): Promise<string | null> {
        if (!this.isGitRepo) {
            await this.init();
        }

        try {
            // Stage all changes
            await exec("git add -A", { cwd: this.baseDir });

            // Check if there are changes to commit
            const statusHelper = await exec("git status --porcelain", {
                cwd: this.baseDir,
            });
            const status = statusHelper.stdout;

            if (!status.trim()) {
                // No changes, get current HEAD
                try {
                    const headHelper = await exec("git rev-parse HEAD", {
                        cwd: this.baseDir,
                    });
                    return headHelper.stdout.trim();
                } catch {
                    // No commits yet, create empty initial commit
                    await exec('git commit --allow-empty -m "Initial commit"', {
                        cwd: this.baseDir,
                    });
                    const headHelper = await exec("git rev-parse HEAD", {
                        cwd: this.baseDir,
                    });
                    return headHelper.stdout.trim();
                }
            }

            // Create commit with message metadata
            const commitMsg = `zencode:${messageId}\n\n${messageContent.slice(0, 100)}${messageContent.length > 100 ? "..." : ""}`;
            await exec(`git commit -m ${shellEscape(commitMsg)}`, {
                cwd: this.baseDir,
            });

            // Get the commit hash
            const hashHelper = await exec("git rev-parse HEAD", {
                cwd: this.baseDir,
            });
            return hashHelper.stdout.trim();
        } catch (error) {
            console.error("Failed to create commit:", error);
            return null;
        }
    }

    /**
     * Revert all changes after a specific commit
     * This performs a hard reset to that commit
     */
    async revertToCommit(commitHash: string): Promise<boolean> {
        if (!this.isGitRepo) return false;

        try {
            // Hard reset to the commit
            await exec(`git reset --hard ${commitHash}`, { cwd: this.baseDir });
            return true;
        } catch (error) {
            console.error("Failed to revert to commit:", error);
            return false;
        }
    }

    /**
     * Get the diff between current state and a commit
     */
    async getDiff(commitHash: string): Promise<string> {
        if (!this.isGitRepo) return "";

        try {
            const diffHelper = await exec(`git diff ${commitHash}..HEAD`, {
                cwd: this.baseDir,
            });
            return diffHelper.stdout;
        } catch {
            return "";
        }
    }

    /**
     * Get list of files changed in a commit
     */
    async getChangedFiles(commitHash: string): Promise<string[]> {
        if (!this.isGitRepo) return [];

        try {
            const filesHelper = await exec(
                `git diff-tree --no-commit-id --name-only -r ${commitHash}`,
                { cwd: this.baseDir },
            );
            const files = filesHelper.stdout;
            return files.split("\n").filter((f) => f.trim());
        } catch {
            return [];
        }
    }

    /**
     * Check if directory is a git repo
     */
    isInitialized(): boolean {
        return this.isGitRepo;
    }

    /**
     * Get current commit hash
     */
    async getCurrentCommit(): Promise<string | null> {
        if (!this.isGitRepo) return null;

        try {
            const hashHelper = await exec("git rev-parse HEAD", {
                cwd: this.baseDir,
            });
            return hashHelper.stdout.trim();
        } catch {
            return null;
        }
    }
}

// Singleton instance
let manager: GitWorktreeManager | null = null;

export function getGitManager(): GitWorktreeManager {
    if (!manager) {
        manager = new GitWorktreeManager();
    }
    return manager;
}

export function resetGitManager(): void {
    manager = null;
}
