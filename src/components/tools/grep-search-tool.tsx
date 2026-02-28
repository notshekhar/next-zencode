"use client";

import { memo, useMemo } from "react";
import { Search } from "lucide-react";
import { ToolWrapper, truncate, type ToolPartState } from "./tool-wrapper";

export const GrepSearchTool = memo(function GrepSearchTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        const pattern = part.input?.pattern;
        const filePattern = part.input?.filePattern;
        if (pattern && filePattern && filePattern !== "*") {
            return `"${truncate(pattern, 30)}" in ${filePattern}`;
        }
        return pattern ? `"${truncate(pattern, 40)}"` : "Searching...";
    }, [part.input]);

    const matches = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return [];
        return part.output?.matches || [];
    }, [part.output, part.state]);

    const count =
        part.state === "output-available" ? (part.output?.count ?? 0) : 0;

    return (
        <ToolWrapper
            part={part}
            icon={Search}
            label="Grep Search"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {matches.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground mb-1">
                        {count} match{count !== 1 ? "es" : ""}
                    </span>
                    <div className="rounded-md border border-border overflow-hidden font-mono text-xs">
                        {matches.map((match: string, i: number) => {
                            const parsed = parseGrepMatch(match);
                            return (
                                <div
                                    key={i}
                                    className="flex gap-2 px-3 py-0.5 border-b border-border last:border-b-0 text-muted-foreground"
                                >
                                    <span
                                        className="text-blue-400 shrink-0 min-w-0 truncate max-w-[200px]"
                                        title={parsed.file}
                                    >
                                        {parsed.fileName}
                                    </span>
                                    {parsed.line && (
                                        <span className="text-yellow-500 shrink-0">
                                            :{parsed.line}
                                        </span>
                                    )}
                                    <span className="truncate">
                                        {parsed.content}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {part.state === "output-available" && matches.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                    No matches found
                </span>
            )}
        </ToolWrapper>
    );
});

function parseGrepMatch(match: string): {
    file: string;
    fileName: string;
    line: string;
    content: string;
} {
    // Format: /absolute/path/to/file:lineNumber:content
    const firstColon = match.indexOf(":");
    if (firstColon === -1)
        return { file: match, fileName: match, line: "", content: "" };

    const file = match.substring(0, firstColon);
    const rest = match.substring(firstColon + 1);
    const secondColon = rest.indexOf(":");
    const fileName = file.split("/").pop() || file;

    if (secondColon === -1) return { file, fileName, line: "", content: rest };

    const line = rest.substring(0, secondColon);
    const content = rest.substring(secondColon + 1);
    return { file, fileName, line, content };
}
