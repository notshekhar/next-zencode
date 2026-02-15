"use client";

import { memo, useMemo } from "react";
import { Terminal } from "lucide-react";
import { ToolWrapper, truncate, type ToolPartState } from "./tool-wrapper";

export const BashTool = memo(function BashTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        const cmd = part.input?.command;
        return cmd ? truncate(cmd, 80) : "Running command...";
    }, [part.input]);

    const data = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return null;
        return part.output?.data || part.output;
    }, [part.output, part.state]);

    return (
        <ToolWrapper
            part={part}
            icon={Terminal}
            label="Terminal"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {data && (
                <div className="flex flex-col gap-2">
                    {/* Exit code badge */}
                    {data.exitCode !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                            <span
                                className={
                                    data.exitCode === 0
                                        ? "text-emerald-500"
                                        : "text-red-400"
                                }
                            >
                                exit {data.exitCode}
                            </span>
                        </div>
                    )}

                    {/* stdout */}
                    {data.stdout && (
                        <pre className="text-xs text-muted-foreground bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-border">
                            {data.stdout}
                        </pre>
                    )}

                    {/* stderr */}
                    {data.stderr && (
                        <pre className="text-xs text-red-400 bg-red-500/10 rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-red-500/20">
                            {data.stderr}
                        </pre>
                    )}
                </div>
            )}
        </ToolWrapper>
    );
});
