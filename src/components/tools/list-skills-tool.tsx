"use client";

import { memo, useMemo } from "react";
import { Zap, Globe, FolderCode } from "lucide-react";
import { ToolWrapper, type ToolPartState } from "./tool-wrapper";

export const ListSkillsTool = memo(function ListSkillsTool({
    part,
}: {
    part: ToolPartState;
}) {
    const skills = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return [];
        return part.output?.skills || [];
    }, [part.output, part.state]);

    return (
        <ToolWrapper
            part={part}
            icon={Zap}
            label="List Skills"
            inputSummary="Listing available agent skills"
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {skills.length > 0 && (
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">
                        {skills.length} skill{skills.length !== 1 ? "s" : ""} found
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                        {skills.map((skill: { name: string; description: string; source: string }, i: number) => (
                            <div
                                key={i}
                                className="flex flex-col gap-1 p-2 rounded-lg border border-border bg-muted transition-colors hover:bg-muted"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        {skill.name}
                                    </span>
                                    {skill.source === "global" ? (
                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                        <FolderCode className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground line-clamp-2">
                                    {skill.description}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {part.state === "output-available" && skills.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 italic text-center">
                    No specialized skills are currently available.
                </div>
            )}
        </ToolWrapper>
    );
});
