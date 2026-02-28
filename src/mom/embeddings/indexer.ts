import { scanProject, type ScannedFile } from "./scanner";
import { chunkFile, type Chunk } from "./chunker";
import { generateEmbedding } from "./config";
import {
    insertChunks,
    upsertFileHash,
    getFileHash,
    deleteFileChunks,
    deleteFileHash,
    clearProjectEmbeddings,
    getStats,
} from "./store";

export interface IndexResult {
    totalFiles: number;
    totalChunks: number;
    filesScanned: number;
    filesSkipped: number;
    filesDeleted: number;
    durationMs: number;
    errors: Array<{ file: string; error: string }>;
}

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

export async function indexProject(
    projectPath: string,
    onProgress?: (event: ProgressEvent) => void,
): Promise<IndexResult> {
    const start = Date.now();
    const errors: IndexResult["errors"] = [];

    const emit = (event: ProgressEvent) => {
        console.log(`  [zencode/indexer] ${event.message}`);
        onProgress?.(event);
    };

    emit({
        type: "scanning",
        message: "Scanning project files...",
        percent: 0,
    });

    const files = scanProject(projectPath);

    emit({
        type: "scanning",
        message: `Found ${files.length} files`,
        totalFiles: files.length,
        percent: 5,
    });

    const currentPaths = new Set(files.map((f) => f.relativePath));
    const stats = getStats(projectPath);
    const indexedPaths = new Set(stats.fileList.map((f) => f.filePath));

    let filesDeleted = 0;
    for (const oldPath of indexedPaths) {
        if (!currentPaths.has(oldPath)) {
            deleteFileChunks(projectPath, oldPath);
            deleteFileHash(projectPath, oldPath);
            filesDeleted++;
        }
    }

    const changedFiles: ScannedFile[] = [];
    let filesSkipped = 0;

    for (const file of files) {
        const storedHash = getFileHash(projectPath, file.relativePath);
        if (storedHash === file.hash) {
            filesSkipped++;
            continue;
        }
        changedFiles.push(file);
    }

    emit({
        type: "processing",
        message: `${changedFiles.length} files to index, ${filesSkipped} unchanged`,
        totalFiles: changedFiles.length,
        fileIndex: 0,
        percent: 10,
    });

    if (changedFiles.length === 0) {
        const duration = Date.now() - start;
        const result: IndexResult = {
            totalFiles: files.length,
            totalChunks: stats.totalChunks,
            filesScanned: 0,
            filesSkipped,
            filesDeleted,
            durationMs: duration,
            errors,
        };
        emit({
            type: "done",
            message: `Already up to date (${filesSkipped} files, ${stats.totalChunks} chunks)`,
            percent: 100,
            result,
        });
        return result;
    }

    let totalChunks = 0;
    let totalChunksGenerated = 0;

    // First pass: chunk all files to get total chunk count
    const fileChunks: Array<{ file: ScannedFile; chunks: Chunk[] }> = [];
    for (const file of changedFiles) {
        const chunks = chunkFile(file.relativePath, file.content);
        if (chunks.length > 0) {
            fileChunks.push({ file, chunks });
            totalChunksGenerated += chunks.length;
        }
    }

    emit({
        type: "processing",
        message: `Created ${totalChunksGenerated} chunks from ${fileChunks.length} files`,
        totalFiles: fileChunks.length,
        totalChunks: totalChunksGenerated,
        percent: 15,
    });

    // Second pass: generate embeddings with parallel batches per file
    const CONCURRENCY = 8;
    let processedChunks = 0;

    for (let fi = 0; fi < fileChunks.length; fi++) {
        const { file, chunks } = fileChunks[fi];

        emit({
            type: "embedding",
            message: `Embedding ${file.relativePath}`,
            fileIndex: fi + 1,
            totalFiles: fileChunks.length,
            chunkIndex: processedChunks,
            totalChunks: totalChunksGenerated,
            currentFile: file.relativePath,
            percent: Math.round(15 + (processedChunks / totalChunksGenerated) * 80),
        });

        try {
            deleteFileChunks(projectPath, file.relativePath);

            const chunksWithEmbeddings: Array<{
                filePath: string;
                startLine: number;
                endLine: number;
                content: string;
                language: string;
                embedding: number[];
            }> = [];

            // Process chunks in parallel batches
            for (let batchStart = 0; batchStart < chunks.length; batchStart += CONCURRENCY) {
                const batch = chunks.slice(batchStart, batchStart + CONCURRENCY);

                const results = await Promise.all(
                    batch.map(async (chunk) => {
                        const embedding = await generateEmbedding(chunk.content);
                        return {
                            filePath: chunk.filePath,
                            startLine: chunk.startLine,
                            endLine: chunk.endLine,
                            content: chunk.content,
                            language: chunk.language,
                            embedding,
                        };
                    }),
                );

                chunksWithEmbeddings.push(...results);
                processedChunks += batch.length;

                emit({
                    type: "embedding",
                    message: `${file.relativePath} — ${Math.min(batchStart + CONCURRENCY, chunks.length)}/${chunks.length} chunks`,
                    fileIndex: fi + 1,
                    totalFiles: fileChunks.length,
                    chunkIndex: processedChunks,
                    totalChunks: totalChunksGenerated,
                    currentFile: file.relativePath,
                    percent: Math.round(15 + (processedChunks / totalChunksGenerated) * 80),
                });
            }

            insertChunks(projectPath, chunksWithEmbeddings);
            upsertFileHash(projectPath, file.relativePath, file.hash);
            totalChunks += chunks.length;
        } catch (err: any) {
            const msg = String(err?.message || err);
            errors.push({ file: file.relativePath, error: msg });
            processedChunks += chunks.length;
            emit({
                type: "error",
                message: `Error: ${file.relativePath} — ${msg}`,
                fileIndex: fi + 1,
                totalFiles: fileChunks.length,
                currentFile: file.relativePath,
                percent: Math.round(15 + (processedChunks / totalChunksGenerated) * 80),
            });
        }
    }

    const duration = Date.now() - start;
    const result: IndexResult = {
        totalFiles: files.length,
        totalChunks: totalChunks + Math.max(0, stats.totalChunks - filesDeleted),
        filesScanned: changedFiles.length,
        filesSkipped,
        filesDeleted,
        durationMs: duration,
        errors,
    };

    emit({
        type: "done",
        message: `Done! ${totalChunks} chunks from ${changedFiles.length} files in ${(duration / 1000).toFixed(1)}s`,
        percent: 100,
        result,
    });

    return result;
}

export async function reindexProject(
    projectPath: string,
    onProgress?: (event: ProgressEvent) => void,
): Promise<IndexResult> {
    clearProjectEmbeddings(projectPath);
    return indexProject(projectPath, onProgress);
}

/**
 * Re-index a single file: delete its old chunks, re-chunk, embed, and store.
 * Designed to be called fire-and-forget after file writes.
 */
export async function reindexSingleFile(
    projectPath: string,
    relativePath: string,
    content: string,
): Promise<void> {
    try {
        const hasher = new Bun.CryptoHasher("sha256");
        hasher.update(content);
        const newHash = hasher.digest("hex");

        const storedHash = getFileHash(projectPath, relativePath);
        if (storedHash === newHash) return;

        const chunks = chunkFile(relativePath, content);

        deleteFileChunks(projectPath, relativePath);

        if (chunks.length === 0) {
            deleteFileHash(projectPath, relativePath);
            return;
        }

        const CONCURRENCY = 8;
        const chunksWithEmbeddings: Array<{
            filePath: string;
            startLine: number;
            endLine: number;
            content: string;
            language: string;
            embedding: number[];
        }> = [];

        for (let i = 0; i < chunks.length; i += CONCURRENCY) {
            const batch = chunks.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
                batch.map(async (chunk) => ({
                    filePath: chunk.filePath,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    content: chunk.content,
                    language: chunk.language,
                    embedding: await generateEmbedding(chunk.content),
                })),
            );
            chunksWithEmbeddings.push(...results);
        }

        insertChunks(projectPath, chunksWithEmbeddings);
        upsertFileHash(projectPath, relativePath, newHash);

        console.log(
            `  [zencode/indexer] Re-indexed ${relativePath} (${chunks.length} chunks)`,
        );
    } catch (err) {
        console.warn(
            `  [zencode/indexer] Failed to re-index ${relativePath}:`,
            err instanceof Error ? err.message : err,
        );
    }
}
