"use client";

import { memo, useMemo, useState, useEffect, useRef } from "react";
import { FileText, AlertTriangle } from "lucide-react";
import {
    ToolWrapper,
    truncateOutput,
    type ToolPartState,
} from "./tool-wrapper";
import { Highlight } from "../pre-block";
import { useTheme } from "next-themes";
import { safe } from "ts-safe";
import { JSX } from "react";

// Map file extensions to shiki languages
function getLangFromPath(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
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
        kt: "kotlin",
        swift: "swift",
        cs: "csharp",
        cpp: "cpp",
        c: "c",
        h: "c",
        hpp: "cpp",
        html: "html",
        css: "css",
        scss: "scss",
        less: "less",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        md: "markdown",
        mdx: "mdx",
        xml: "xml",
        svg: "xml",
        sql: "sql",
        sh: "bash",
        bash: "bash",
        zsh: "bash",
        dockerfile: "dockerfile",
        makefile: "makefile",
        graphql: "graphql",
        prisma: "prisma",
        vue: "vue",
        svelte: "svelte",
        astro: "astro",
        mjs: "javascript",
        cjs: "javascript",
        mts: "typescript",
    };
    return map[ext] || "text";
}

export const ReadFileTool = memo(function ReadFileTool({
    part,
}: {
    part: ToolPartState;
}) {
    const { theme } = useTheme();
    const [highlighted, setHighlighted] = useState<JSX.Element | null>(null);
    const contentRef = useRef<string | null>(null);

    const inputSummary = useMemo(() => {
        return part.input?.path || "Reading file...";
    }, [part.input]);

    const data = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return null;
        return part.output;
    }, [part.output, part.state]);

    const lang = useMemo(() => {
        const filePath = part.input?.path || "";
        return getLangFromPath(filePath);
    }, [part.input]);

    const content = data?.content ? truncateOutput(data.content) : null;

    // Highlight content with shiki
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
                .ifOk((component) => {
                    setHighlighted(component);
                });
        }, 200);

        return () => clearTimeout(timer);
    }, [content, lang, theme]);

    return (
        <ToolWrapper
            part={part}
            icon={FileText}
            label="Read File"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {data && (
                <div className="flex flex-col gap-2">
                    {/* File info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {data.lines !== undefined && (
                            <span>{data.lines} lines</span>
                        )}
                        {data.size !== undefined && (
                            <span>{formatBytes(data.size)}</span>
                        )}
                        {data.truncated && (
                            <span className="text-yellow-500">
                                (showing lines {(data.offset ?? 0) + 1}–
                                {(data.offset ?? 0) + (data.limit ?? 0)})
                            </span>
                        )}
                    </div>

                    {/* Syntax-highlighted content */}
                    {content && (
                        <div className="text-sm rounded-2xl overflow-hidden bg-muted border border-border">
                            {highlighted ?? (
                                <pre className="p-4 overflow-x-auto">
                                    <code className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                                        {content}
                                    </code>
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Diagnostics */}
                    {data.diagnostics && (
                        <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 rounded-md p-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <pre className="whitespace-pre-wrap font-mono">
                                {data.diagnostics}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </ToolWrapper>
    );
});

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
