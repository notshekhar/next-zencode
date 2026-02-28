"use client";

import { useCallback, useRef, useState } from "react";
import {
    Database,
    FileCode,
    Loader2,
    Trash2,
    ArrowLeft,
    RefreshCw,
    Zap,
    Hash,
    Clock,
    BrainCircuit,
} from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ProgressEvent } from "./types";
import { formatTimeAgo } from "./types";
import { StatCard } from "./stat-card";
import { IndexProgress } from "./index-progress";
import { SemanticSearch } from "./semantic-search";
import { BrowseChunks } from "./browse-chunks";

export default function EmbeddingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"search" | "browse">("search");

    const [isIndexing, setIsIndexing] = useState(false);
    const [progress, setProgress] = useState<ProgressEvent | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const {
        data: stats,
        isLoading: statsLoading,
        refetch: refetchStats,
    } = api.embeddings.getStats.useQuery();

    const clearMutation = api.embeddings.clearIndex.useMutation({
        onSuccess: () => {
            refetchStats();
            toast.success("Index cleared");
        },
        onError: (err) => {
            toast.error(`Failed to clear: ${err.message}`);
        },
    });

    const handleIndex = useCallback(
        (full: boolean) => {
            if (isIndexing) return;

            setIsIndexing(true);
            setProgress({
                type: "scanning",
                message: "Starting...",
                percent: 0,
            });

            fetch("/api/embeddings/index", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full }),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(body.error || `HTTP ${res.status}`);
                    }

                    const abort = new AbortController();
                    abortRef.current = abort;

                    const sse = await fetch("/api/embeddings/index", {
                        signal: abort.signal,
                    });
                    if (!sse.ok || !sse.body)
                        throw new Error(
                            "Failed to connect to progress stream",
                        );

                    const reader = sse.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const parts = buffer.split("\n\n");
                        buffer = parts.pop() || "";

                        for (const part of parts) {
                            const line = part.replace(/^data: /, "").trim();
                            if (!line) continue;
                            try {
                                const event: ProgressEvent = JSON.parse(line);
                                setProgress(event);
                                if (event.type === "done" && event.result) {
                                    toast.success(
                                        `Indexed ${event.result.filesScanned} files (${event.result.totalChunks} chunks) in ${(event.result.durationMs / 1000).toFixed(1)}s`,
                                    );
                                }
                            } catch {
                                // skip malformed
                            }
                        }
                    }
                })
                .catch((err) => {
                    if (err.name !== "AbortError") {
                        toast.error(`Indexing failed: ${err.message}`);
                        setProgress({
                            type: "error",
                            message: err.message,
                            percent: 0,
                        });
                    }
                })
                .finally(() => {
                    setIsIndexing(false);
                    abortRef.current = null;
                    refetchStats();
                });
        },
        [isIndexing, refetchStats],
    );

    const handleCancelIndex = () => {
        abortRef.current?.abort();
        setIsIndexing(false);
        setProgress(null);
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full shrink-0 -ml-2"
                >
                    <ArrowLeft className="h-10 w-10" />
                </Button>
                <div className="pt-1 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Project Embeddings
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Index your project for semantic code search
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <StatCard
                    icon={<FileCode className="h-4 w-4" />}
                    label="Files"
                    value={
                        statsLoading ? "..." : String(stats?.totalFiles ?? 0)
                    }
                />
                <StatCard
                    icon={<Hash className="h-4 w-4" />}
                    label="Chunks"
                    value={
                        statsLoading ? "..." : String(stats?.totalChunks ?? 0)
                    }
                />
                <StatCard
                    icon={<Database className="h-4 w-4" />}
                    label="Dimensions"
                    value="768"
                />
                <StatCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Last Indexed"
                    value={
                        statsLoading
                            ? "..."
                            : stats?.lastIndexedAt
                              ? formatTimeAgo(stats.lastIndexedAt)
                              : "Never"
                    }
                />
            </div>

            {/* Unavailable warning */}
            {stats?.unavailableReason && (
                <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        {stats.unavailableReason}
                    </p>
                </div>
            )}

            {/* Progress */}
            <IndexProgress
                isIndexing={isIndexing}
                progress={progress}
                onCancel={handleCancelIndex}
                onDismiss={() => setProgress(null)}
            />

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
                <Button
                    onClick={() => handleIndex(false)}
                    disabled={isIndexing}
                    className="rounded-xl gap-2"
                >
                    {isIndexing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Zap className="h-4 w-4" />
                    )}
                    {isIndexing ? "Indexing..." : "Index Project"}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => handleIndex(true)}
                    disabled={isIndexing}
                    className="rounded-xl gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Full Re-index
                </Button>
                <Button
                    variant="outline"
                    onClick={() => clearMutation.mutate()}
                    disabled={
                        clearMutation.isPending ||
                        isIndexing ||
                        stats?.totalChunks === 0
                    }
                    className="rounded-xl gap-2 text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                    Clear Index
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("search")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === "search"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="h-3.5 w-3.5" />
                        Semantic Search
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("browse")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === "browse"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5" />
                        Browse Chunks
                    </div>
                </button>
            </div>

            {/* Tab content */}
            {activeTab === "search" && <SemanticSearch />}
            {activeTab === "browse" && (
                <BrowseChunks
                    fileList={stats?.fileList ?? []}
                    totalFiles={stats?.totalFiles ?? 0}
                />
            )}
        </div>
    );
}
