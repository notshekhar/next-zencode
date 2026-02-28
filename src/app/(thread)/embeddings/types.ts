export interface ProgressEvent {
    type: "scanning" | "processing" | "embedding" | "done" | "error";
    message: string;
    fileIndex?: number;
    totalFiles?: number;
    chunkIndex?: number;
    totalChunks?: number;
    currentFile?: string;
    percent?: number;
    result?: IndexResult;
}

export interface IndexResult {
    totalFiles: number;
    totalChunks: number;
    filesScanned: number;
    filesSkipped: number;
    filesDeleted: number;
    durationMs: number;
    errors: Array<{ file: string; error: string }>;
}

export function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
