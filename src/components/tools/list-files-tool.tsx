"use client";

import { memo, useMemo } from "react";
import { FolderOpen, File, Folder } from "lucide-react";
import { ToolWrapper, type ToolPartState } from "./tool-wrapper";

export const ListFilesTool = memo(function ListFilesTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        return (
            part.input?.dirPath ||
            part.input?.path ||
            part.input?.directory ||
            "Listing files..."
        );
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
            icon={FolderOpen}
            label="List Files"
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
                        {count} item{count !== 1 ? "s" : ""}
                    </span>
                    {files.map(
                        (file: { name: string; type: string }, i: number) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono text-muted-foreground"
                            >
                                {file.type === "directory" ? (
                                    <Folder className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                ) : (
                                    <File className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span>{file.name}</span>
                            </div>
                        ),
                    )}
                </div>
            )}
        </ToolWrapper>
    );
});
