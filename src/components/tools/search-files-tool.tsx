"use client";

import { memo, useMemo } from "react";
import { FileSearch, File } from "lucide-react";
import { ToolWrapper, truncate, type ToolPartState } from "./tool-wrapper";

export const SearchFilesTool = memo(function SearchFilesTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        const pattern = part.input?.pattern;
        const dir = part.input?.directory;
        if (pattern && dir && dir !== ".") {
            return `"${truncate(pattern, 30)}" in ${dir}`;
        }
        return pattern ? `"${truncate(pattern, 40)}"` : "Searching files...";
    }, [part.input]);

    const files = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return [];
        return part.output?.files || [];
    }, [part.output, part.state]);

    const count =
        part.state === "output-available" ? (part.output?.count ?? 0) : 0;

    return (
        <ToolWrapper
            part={part}
            icon={FileSearch}
            label="Search Files"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {files.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground mb-1">
                        {count} file{count !== 1 ? "s" : ""} found
                    </span>
                    {files.map((file: string, i: number) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono text-muted-foreground"
                        >
                            <File className="h-3.5 w-3.5 shrink-0" />
                            <span>{file}</span>
                        </div>
                    ))}
                </div>
            )}
            {part.state === "output-available" && files.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                    No files found
                </span>
            )}
        </ToolWrapper>
    );
});
