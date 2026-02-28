"use client";

import { Loader2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { ProgressEvent } from "./types";

export function IndexProgress({
    isIndexing,
    progress,
    onCancel,
    onDismiss,
}: {
    isIndexing: boolean;
    progress: ProgressEvent | null;
    onCancel: () => void;
    onDismiss: () => void;
}) {
    return (
        <>
            {/* Active progress */}
            <AnimatePresence>
                {isIndexing && progress && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 overflow-hidden"
                    >
                        <div className="rounded-2xl border bg-muted p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-sm font-medium">
                                        {progress.type === "scanning" &&
                                            "Scanning files..."}
                                        {progress.type === "processing" &&
                                            "Chunking files..."}
                                        {progress.type === "embedding" &&
                                            "Generating embeddings..."}
                                        {progress.type === "error" &&
                                            "Error occurred"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-muted-foreground">
                                        {progress.percent ?? 0}%
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-full"
                                        onClick={onCancel}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="h-2 rounded-full bg-background overflow-hidden mb-3">
                                <motion.div
                                    className="h-full rounded-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${progress.percent ?? 0}%`,
                                    }}
                                    transition={{
                                        duration: 0.3,
                                        ease: "easeOut",
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate max-w-[60%] font-mono">
                                    {progress.currentFile ?? progress.message}
                                </span>
                                <div className="flex items-center gap-4 shrink-0">
                                    {progress.totalFiles !== undefined &&
                                        progress.fileIndex !== undefined && (
                                            <span>
                                                File {progress.fileIndex}/
                                                {progress.totalFiles}
                                            </span>
                                        )}
                                    {progress.totalChunks !== undefined &&
                                        progress.chunkIndex !== undefined && (
                                            <span>
                                                Chunk {progress.chunkIndex}/
                                                {progress.totalChunks}
                                            </span>
                                        )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Done summary */}
            <AnimatePresence>
                {!isIndexing &&
                    progress?.type === "done" &&
                    progress.result && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8 overflow-hidden"
                        >
                            <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                            {progress.message}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-full"
                                        onClick={onDismiss}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {progress.result.errors.length > 0 && (
                                    <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                                        {progress.result.errors.length} file(s)
                                        had errors
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
            </AnimatePresence>
        </>
    );
}
