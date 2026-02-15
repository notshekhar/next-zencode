"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

interface DiffViewProps {
    diff: string;
}

export const DiffView = memo(function DiffView({ diff }: DiffViewProps) {
    const lines = useMemo(() => parseDiffLines(diff), [diff]);

    if (!diff || lines.length === 0) return null;

    return (
        <div className="rounded-md border border-border overflow-hidden font-mono text-xs">
            {lines.map((line, i) => (
                <div
                    key={i}
                    className={cn(
                        "px-3 py-0.5 whitespace-pre-wrap break-all",
                        line.type === "added" &&
                            "bg-emerald-500/15 text-emerald-400",
                        line.type === "removed" && "bg-red-500/15 text-red-400",
                        line.type === "header" &&
                            "bg-muted text-muted-foreground font-semibold border-b border-border",
                        line.type === "context" && "text-muted-foreground",
                        line.type === "info" && "text-muted-foreground italic",
                    )}
                >
                    {line.content}
                </div>
            ))}
        </div>
    );
});

interface DiffLine {
    type: "added" | "removed" | "header" | "context" | "info";
    content: string;
}

function parseDiffLines(diff: string): DiffLine[] {
    return diff.split("\n").map((raw) => {
        const trimmed = raw.trimStart();

        // File headers
        if (raw.startsWith("---") || raw.startsWith("+++")) {
            return { type: "header" as const, content: raw };
        }

        // Hunk headers
        if (raw.startsWith("@@")) {
            return { type: "header" as const, content: raw };
        }

        // Lines with line numbers like "  3 + content" or "  3 - content"
        // The format from the backend is: "  N + line" or "  N - line"
        const lineMatch = raw.match(/^\s*\d+\s+([+-])\s/);
        if (lineMatch) {
            if (lineMatch[1] === "+") {
                return { type: "added" as const, content: raw };
            }
            return { type: "removed" as const, content: raw };
        }

        // Plain + or - at start
        if (
            trimmed.startsWith("+ ") ||
            trimmed.startsWith("+\t") ||
            trimmed === "+"
        ) {
            return { type: "added" as const, content: raw };
        }
        if (
            trimmed.startsWith("- ") ||
            trimmed.startsWith("-\t") ||
            trimmed === "-"
        ) {
            return { type: "removed" as const, content: raw };
        }

        // Info lines (like "... +5 more lines")
        if (trimmed.startsWith("...")) {
            return { type: "info" as const, content: raw };
        }

        return { type: "context" as const, content: raw };
    });
}
