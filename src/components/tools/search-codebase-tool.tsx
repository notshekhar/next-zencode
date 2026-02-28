"use client";

import { memo, useMemo, useState, useEffect, useRef } from "react";
import { Braces, FileCode2 } from "lucide-react";
import { ToolWrapper, truncate, type ToolPartState } from "./tool-wrapper";
import { Highlight } from "../pre-block";
import { useTheme } from "next-themes";
import { safe } from "ts-safe";
import { JSX } from "react";

interface ChunkResult {
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    language: string;
    similarity: number;
}

function getLangFromExt(language: string): string {
    const map: Record<string, string> = {
        ts: "typescript",
        tsx: "tsx",
        js: "javascript",
        jsx: "jsx",
        py: "python",
        rb: "ruby",
        go: "go",
        rs: "rust",
        java: "java",
        css: "css",
        html: "html",
        json: "json",
        yaml: "yaml",
        sql: "sql",
        sh: "bash",
        md: "markdown",
    };
    return map[language] || language || "text";
}

function similarityColor(score: number): string {
    if (score >= 0.8) return "text-emerald-400";
    if (score >= 0.6) return "text-sky-400";
    if (score >= 0.4) return "text-amber-400";
    return "text-muted-foreground";
}

function similarityBg(score: number): string {
    if (score >= 0.8) return "bg-emerald-500/10";
    if (score >= 0.6) return "bg-sky-500/10";
    if (score >= 0.4) return "bg-amber-500/10";
    return "bg-muted";
}

const HighlightedChunk = memo(function HighlightedChunk({
    content,
    language,
}: {
    content: string;
    language: string;
}) {
    const { theme } = useTheme();
    const [highlighted, setHighlighted] = useState<JSX.Element | null>(null);
    const contentRef = useRef<string | null>(null);

    const lang = getLangFromExt(language);

    useEffect(() => {
        if (!content || content === contentRef.current) return;
        contentRef.current = content;

        const timer = setTimeout(() => {
            safe()
                .map(() =>
                    Highlight(
                        content,
                        lang,
                        theme === "dark" ? "dark-plus" : "github-light",
                    ),
                )
                .ifOk((component) => setHighlighted(component));
        }, 100);

        return () => clearTimeout(timer);
    }, [content, lang, theme]);

    return (
        <div className="rounded-lg overflow-hidden bg-muted border border-border">
            {highlighted ?? (
                <pre className="p-3 overflow-x-auto">
                    <code className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                        {content}
                    </code>
                </pre>
            )}
        </div>
    );
});

export const SearchCodebaseTool = memo(function SearchCodebaseTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        const query = part.input?.query;
        return query ? `"${truncate(query, 40)}"` : "Searching codebase...";
    }, [part.input]);

    const results: ChunkResult[] = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return [];
        return part.output?.results || [];
    }, [part.output, part.state]);

    const count =
        part.state === "output-available" ? (part.output?.count ?? 0) : 0;

    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    return (
        <ToolWrapper
            part={part}
            icon={Braces}
            label="Codebase Search"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}

            {!part.output?.success && part.output?.error && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.output.error}
                </pre>
            )}

            {results.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                        {count} result{count !== 1 ? "s" : ""}
                    </span>

                    <div className="flex flex-col gap-1">
                        {results.map((r, i) => {
                            const pct = (r.similarity * 100).toFixed(0);
                            const isOpen = expandedIdx === i;
                            const fileName =
                                r.filePath.split("/").pop() || r.filePath;

                            return (
                                <div
                                    key={i}
                                    className="rounded-lg border border-border overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedIdx(isOpen ? null : i)
                                        }
                                        className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
                                    >
                                        <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span
                                            className="text-xs font-mono text-blue-400 truncate"
                                            title={r.filePath}
                                        >
                                            {fileName}
                                        </span>
                                        <span className="text-xs text-muted-foreground/60 font-mono shrink-0">
                                            :{r.startLine}–{r.endLine}
                                        </span>
                                        <span className="flex-1" />
                                        <span
                                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${similarityColor(r.similarity)} ${similarityBg(r.similarity)}`}
                                        >
                                            {pct}%
                                        </span>
                                    </button>

                                    {isOpen && (
                                        <div className="px-2 pb-2">
                                            <div className="text-[10px] text-muted-foreground/50 font-mono px-1 mb-1 truncate">
                                                {r.filePath}
                                            </div>
                                            <HighlightedChunk
                                                content={r.content}
                                                language={r.language}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {part.state === "output-available" &&
                part.output?.success &&
                results.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                        No matching code found. The project may not be indexed
                        yet.
                    </span>
                )}
        </ToolWrapper>
    );
});
