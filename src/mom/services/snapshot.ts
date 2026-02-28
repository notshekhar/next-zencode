import { exec, shellEscape } from "./bashExecutor";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";

/**
 * Git Snapshot Manager - Based on OpenCode's implementation
 * Uses a hidden git repository to track file changes and create snapshots.
 */
// ... (rest of imports) * Uses GIT_DIR + GIT_WORK_TREE to track files without creating .git in user's project

export interface Patch {
    files: string[]; // List of files modified
}

// Get .zencode directory path
function getZencodeDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const dir = path.join(homeDir, ".zencode");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// Hash project path to create unique identifier
function hashProjectPath(projectDir: string): string {
    return createHash("md5")
        .update(path.resolve(projectDir))
        .digest("hex")
        .slice(0, 12);
}

/**
 * Get hidden git directory path for current project
 * Returns path like: ~/.zencode/snapshots/<project-hash>/.git
 */
function gitdir(): string {
    const projectHash = hashProjectPath(process.cwd());
    const dir = path.join(getZencodeDir(), "snapshots", projectHash, ".git");
    return dir;
}

/**
 * Capture current file state and return git commit hash
 * This creates a snapshot of all project files in the hidden git repo
 */
export async function track(): Promise<string> {
    const git = gitdir();
    const worktree = process.cwd();

    // Initialize hidden git repo if it doesn't exist
    if (!fs.existsSync(git)) {
        fs.mkdirSync(git, { recursive: true });
        try {
            await exec("git init", {
                env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
            });
            // Configure git user for this repo
            await exec('git config user.email "zencode@local"', {
                env: { GIT_DIR: git },
            });
            await exec('git config user.name "ZenCode"', {
                env: { GIT_DIR: git },
            });
        } catch (error) {
            console.error("Failed to initialize git snapshot repo:", error);
            throw error;
        }
    }

    try {
        // Stage all files in the working tree
        await exec("git add -A", {
            env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
        });

        // Check if there are any changes to commit
        const statusHelper = await exec("git status --porcelain", {
            env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
        });
        const statusResult = statusHelper.stdout;

        // Create a commit with timestamp
        const timestamp = new Date().toISOString();
        try {
            const msg = "Snapshot at " + timestamp;
            await exec(`git commit --allow-empty -m ${shellEscape(msg)}`, {
                env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
            });
        } catch (error) {
            // Commit might fail if nothing changed, that's okay
        }

        // Get the latest commit hash
        const revParse = await exec("git rev-parse HEAD", {
            env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
        });
        const hash = revParse.stdout.trim();
        return hash;
    } catch (error) {
        console.error("Failed to track snapshot:", error);
        throw error;
    }
}

/**
 * Revert files to a specific commit state
 * This restores files to their state at the given commit hash
 */
export async function revertToCommit(commitHash: string): Promise<void> {
    const git = gitdir();
    const worktree = process.cwd();

    try {
        // Checkout all files from the specified commit
        await exec(`git checkout ${commitHash} -- .`, {
            env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
        });
    } catch (error) {
        console.error("Failed to revert to commit:", error);
        throw error;
    }
}

/**
 * Restore all files from a specific tree hash
 * This is used for "unrevert" functionality
 */
export async function restore(treeHash: string): Promise<void> {
    const git = gitdir();
    const worktree = process.cwd();

    try {
        // Checkout all files from the tree hash
        await exec(`git checkout ${treeHash} -- .`, {
            env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
        });
    } catch (error) {
        console.error("Failed to restore from snapshot:", error);
        throw error;
    }
}

/**
 * Get diff between current state and a tree hash
 * Useful for showing what will be reverted
 */
export async function diff(treeHash: string): Promise<string> {
    const git = gitdir();
    const worktree = process.cwd();

    try {
        const result = await exec(`git diff ${treeHash}`, {
            env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
        });
        return result.stdout;
    } catch (error) {
        console.error("Failed to get diff:", error);
        return "";
    }
}

/**
 * Check if git is installed and available
 */
export async function isGitAvailable(): Promise<boolean> {
    try {
        await exec("git --version");
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the snapshot directory for the current project
 * Useful for debugging
 */
export function getSnapshotDir(): string {
    const projectHash = hashProjectPath(process.cwd());
    return path.join(getZencodeDir(), "snapshots", projectHash);
}
