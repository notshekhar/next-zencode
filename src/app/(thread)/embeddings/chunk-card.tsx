"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChunkCard({
    filePath,
    startLine,
    endLine,
    content,
    language,
    similarity,
}: {
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    language: string;
    similarity?: number;
}) {
    const [expanded, setExpanded] = useState(false);

    const displayContent = content.replace(
        /^File:.*?\(lines \d+-\d+\)\n\n/,
        "",
    );
    const preview = displayContent.slice(0, 200);
    const hasMore = displayContent.length > 200;

    return (
        <div className="rounded-xl border bg-background hover:bg-muted transition-colors">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                        {expanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-medium truncate">
                                    {filePath}
                                </span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    L{startLine}–{endLine}
                                </span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    {language}
                                </span>
                            </div>
                            {!expanded && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 font-mono whitespace-pre-wrap">
                                    {preview}
                                    {hasMore && "..."}
                                </p>
                            )}
                        </div>
                    </div>
                    {similarity !== undefined && (
                        <div className="shrink-0">
                            <div
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                                    similarity > 0.7
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400"
                                        : similarity > 0.5
                                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-400"
                                          : "bg-muted text-muted-foreground"
                                }`}
                            >
                                {(similarity * 100).toFixed(1)}%
                            </div>
                        </div>
                    )}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-0">
                            <pre className="text-xs font-mono bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {displayContent}
                            </pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
