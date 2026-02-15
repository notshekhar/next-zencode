import type { UIMessage } from "ai";

export type GitFileStatus =
    | "added"
    | "modified"
    | "deleted"
    | "renamed"
    | "copied"
    | "type-changed"
    | "unmerged"
    | "unknown";

export interface GitChangedFile {
    path: string;
    status: GitFileStatus;
    previousPath?: string;
    gitStatus: string;
}

export interface GitChangeStats {
    fileCount: number;
    insertionCount: number;
    deletionCount: number;
    changeCount: number;
}

export interface GitFileChangedData {
    available: boolean;
    baseCommit: string | null;
    headCommit: string | null;
    files: GitChangedFile[];
    stats: GitChangeStats;
    generatedAt: string;
    reason?: string;
}

export type ZencodeUIDataParts = Record<"file-changed", GitFileChangedData>;

export type ZencodeUIMessage = UIMessage<unknown, ZencodeUIDataParts>;

export type FileChangedDataPart = {
    type: "data-file-changed";
    data: GitFileChangedData;
    id?: string;
};

export function isFileChangedDataPart(part: {
    type: string;
}): part is FileChangedDataPart {
    return part.type === "data-file-changed";
}
