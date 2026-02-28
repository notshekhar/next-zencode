"use client";

import { useState } from "react";
import { Database, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ChunkCard } from "./chunk-card";

const PAGE_SIZE = 30;

export function BrowseChunks({
    fileList,
    totalFiles,
}: {
    fileList: Array<{ filePath: string; chunkCount: number }>;
    totalFiles: number;
}) {
    const [page, setPage] = useState(0);
    const offset = page * PAGE_SIZE;

    const { data, isLoading } = api.embeddings.getChunks.useQuery({
        limit: PAGE_SIZE,
        offset,
    });

    const chunks = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div>
            {/* File list */}
            {fileList.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Indexed Files ({totalFiles})
                    </h3>
                    <div className="grid gap-1.5 max-h-64 overflow-y-auto rounded-xl border p-3 bg-muted">
                        {fileList.map((f) => (
                            <div
                                key={f.filePath}
                                className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-background transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate font-mono text-xs">
                                        {f.filePath}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 ml-3">
                                    {f.chunkCount} chunks
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chunk list */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    All Chunks
                </h3>
                {total > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {total} total
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : chunks.length > 0 ? (
                <>
                    <div className="space-y-3">
                        {chunks.map((chunk) => (
                            <ChunkCard
                                key={chunk.id}
                                filePath={chunk.filePath}
                                startLine={chunk.startLine}
                                endLine={chunk.endLine}
                                content={chunk.content}
                                language={chunk.language}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page === 0}
                            onClick={() => setPage(0)}
                            className="rounded-lg h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <ChevronLeft className="h-4 w-4 -ml-2.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                            className="rounded-lg h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1 px-2">
                            {generatePageNumbers(page, totalPages).map(
                                (p, i) =>
                                    p === "..." ? (
                                        <span
                                            key={`dots-${i}`}
                                            className="text-xs text-muted-foreground px-1"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() =>
                                                setPage(p as number)
                                            }
                                            className={`h-8 min-w-8 px-2 text-xs font-medium rounded-lg transition-colors ${
                                                p === page
                                                    ? "bg-primary text-primary-foreground"
                                                    : "hover:bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            {(p as number) + 1}
                                        </button>
                                    ),
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(page + 1)}
                            className="rounded-lg h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(totalPages - 1)}
                            className="rounded-lg h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4 -ml-2.5" />
                        </Button>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-2">
                        Showing {offset + 1}–{Math.min(offset + chunks.length, total)} of {total}
                    </p>
                </>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p>No chunks indexed yet</p>
                    <p className="text-xs mt-1 opacity-60">
                        Click &quot;Index Project&quot; to get started
                    </p>
                </div>
            )}
        </div>
    );
}

function generatePageNumbers(
    current: number,
    total: number,
): Array<number | "..."> {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i);
    }

    const pages: Array<number | "..."> = [];

    pages.push(0);

    if (current > 2) pages.push("...");

    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (current < total - 3) pages.push("...");

    pages.push(total - 1);

    return pages;
}
