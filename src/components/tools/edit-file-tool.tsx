"use client";

import { memo, useMemo } from "react";
import { FilePen, AlertTriangle } from "lucide-react";
import { ToolWrapper, type ToolPartState } from "./tool-wrapper";
import { DiffView } from "./diff-view";

export const EditFileTool = memo(function EditFileTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        return part.input?.path || "Editing file...";
    }, [part.input]);

    const data = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return null;
        return part.output;
    }, [part.output, part.state]);

    return (
        <ToolWrapper
            part={part}
            icon={FilePen}
            label="Edit File"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {data && (
                <div className="flex flex-col gap-2">
                    {/* Status info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {data.replacements !== undefined && (
                            <span>
                                {data.replacements} replacement
                                {data.replacements !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    {/* Diff */}
                    {data.diff && <DiffView diff={data.diff} />}

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
