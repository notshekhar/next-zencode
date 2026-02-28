"use client";

import { memo, useMemo, useRef, useEffect } from "react";
import { FilePen, AlertTriangle } from "lucide-react";
import { ToolWrapper, type ToolPartState } from "./tool-wrapper";
import { DiffView } from "./diff-view";

function StreamingCodeView({ content }: { content: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lineCount = content.split("\n").length;

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [content]);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{lineCount} lines</span>
            </div>
            <div
                ref={scrollRef}
                className="max-h-[400px] overflow-y-auto overflow-x-auto rounded-lg bg-muted/50 border border-border"
            >
                <pre className="p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground">
                    {content}
                    <span className="inline-block w-[2px] h-[14px] bg-foreground/70 animate-pulse align-text-bottom ml-px" />
                </pre>
            </div>
        </div>
    );
}

export const WriteFileTool = memo(function WriteFileTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        return part.input?.path || "Writing file...";
    }, [part.input]);

    const isInputPhase =
        part.state === "input-streaming" || part.state === "input-available";
    const isPreliminary =
        part.state === "output-available" && part.output?.streaming;
    const isFinal =
        part.state === "output-available" && !part.output?.streaming;

    const streamingText = isInputPhase
        ? part.input?.content
        : isPreliminary
          ? part.output?.content
          : undefined;

    const data = isFinal ? part.output : null;

    return (
        <ToolWrapper
            part={part}
            icon={FilePen}
            label="Write File"
            inputSummary={inputSummary}
            streamingContent={
                streamingText ? (
                    <StreamingCodeView content={streamingText} />
                ) : undefined
            }
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {data && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {data.isNew !== undefined && (
                            <span
                                className={data.isNew ? "text-emerald-500" : ""}
                            >
                                {data.isNew ? "New file" : "Updated"}
                            </span>
                        )}
                        {data.bytes !== undefined && (
                            <span>{formatBytes(data.bytes)}</span>
                        )}
                    </div>

                    {data.diff && <DiffView diff={data.diff} />}

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
