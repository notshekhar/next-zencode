import { exec } from "./bashExecutor";
import type {
    GitChangedFile,
    GitChangeStats,
    GitFileChangedData,
    GitFileStatus,
} from "../shared/chatData";

const EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function mapGitStatus(statusCode: string): GitFileStatus {
    switch (statusCode) {
        case "A":
            return "added";
        case "M":
            return "modified";
        case "D":
            return "deleted";
        case "R":
            return "renamed";
        case "C":
            return "copied";
        case "T":
            return "type-changed";
        case "U":
            return "unmerged";
        default:
            return "unknown";
    }
}

function emptyStats(fileCount = 0): GitChangeStats {
    return {
        fileCount,
        insertionCount: 0,
        deletionCount: 0,
        changeCount: 0,
    };
}

function parseNameStatus(output: string): GitChangedFile[] {
    const lines = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const files: GitChangedFile[] = [];

    for (const line of lines) {
        const columns = line.split("\t");
        const statusToken = columns[0];
        if (!statusToken) continue;

        const statusCode = statusToken[0] ?? "";
        const status = mapGitStatus(statusCode);

        if (status === "renamed" || status === "copied") {
            const previousPath = columns[1];
            const path = columns[2];
            if (!path) continue;
            files.push({
                path,
                previousPath,
                status,
                gitStatus: statusToken,
            });
            continue;
        }

        const path = columns[1];
        if (!path) continue;
        files.push({
            path,
            status,
            gitStatus: statusToken,
        });
    }

    return files;
}

function parseShortStat(
    output: string,
    fallbackFileCount: number,
): GitChangeStats {
    const text = output.trim();

    const fileCount = Number(
        text.match(/(\d+)\s+files?\s+changed/i)?.[1] ?? fallbackFileCount,
    );
    const insertionCount = Number(
        text.match(/(\d+)\s+insertions?\(\+\)/i)?.[1] ?? 0,
    );
    const deletionCount = Number(
        text.match(/(\d+)\s+deletions?\(-\)/i)?.[1] ?? 0,
    );

    return {
        fileCount: Number.isFinite(fileCount) ? fileCount : fallbackFileCount,
        insertionCount: Number.isFinite(insertionCount) ? insertionCount : 0,
        deletionCount: Number.isFinite(deletionCount) ? deletionCount : 0,
        changeCount:
            (Number.isFinite(insertionCount) ? insertionCount : 0) +
            (Number.isFinite(deletionCount) ? deletionCount : 0),
    };
}

function unavailable(reason: string): GitFileChangedData {
    return {
        available: false,
        baseCommit: null,
        headCommit: null,
        files: [],
        stats: emptyStats(0),
        generatedAt: new Date().toISOString(),
        reason,
    };
}

import { getProjectRoot } from "../utils/cwd";

export async function getLatestCommitFileChanges(
    cwd = getProjectRoot(),
): Promise<GitFileChangedData> {
    try {
        await exec("git rev-parse --is-inside-work-tree", { cwd });
    } catch {
        return unavailable("not-a-git-repository");
    }

    let headCommit: string;
    try {
        const headHelper = await exec("git rev-parse --verify HEAD", { cwd });
        headCommit = headHelper.stdout.trim();
    } catch {
        return unavailable("no-commits");
    }

    if (!headCommit) {
        return unavailable("no-commits");
    }

    let baseCommit: string | null = null;
    try {
        const resolvedBaseHelper = await exec("git rev-parse --verify HEAD~1", {
            cwd,
        });
        const resolvedBase = resolvedBaseHelper.stdout.trim();
        if (resolvedBase) {
            baseCommit = resolvedBase;
        }
    } catch {
        baseCommit = null;
    }

    const baseRef = baseCommit ?? EMPTY_TREE_HASH;

    try {
        const [nameStatusHelper, shortStatHelper] = await Promise.all([
            exec(
                `git diff --name-status --find-renames ${baseRef} ${headCommit}`,
                {
                    cwd,
                },
            ),
            exec(`git diff --shortstat ${baseRef} ${headCommit}`, { cwd }),
        ]);
        const nameStatus = nameStatusHelper.stdout;
        const shortStat = shortStatHelper.stdout;

        const files = parseNameStatus(nameStatus);
        const stats = parseShortStat(shortStat, files.length);

        return {
            available: true,
            baseCommit,
            headCommit,
            files,
            stats,
            generatedAt: new Date().toISOString(),
        };
    } catch {
        return {
            ...unavailable("git-diff-failed"),
            headCommit,
            baseCommit,
        };
    }
}
