"use client";

import { memo, useMemo } from "react";
import { Zap } from "lucide-react";
import {
    ToolWrapper,
    DefaultOutputView,
    type ToolPartState,
} from "./tool-wrapper";

export const UseSkillTool = memo(function UseSkillTool({
    part,
}: {
    part: ToolPartState;
}) {
    const skillName = useMemo(() => {
        return part.input?.name || "Loading skill...";
    }, [part.input]);

    const isSuccess = part.state === "output-available" && part.output?.success;

    return (
        <ToolWrapper
            part={part}
            icon={Zap}
            label="Use Skill"
            inputSummary={skillName}
        >
            {isSuccess ? (
                <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                            Skill &quot;{skillName}&quot; Loaded
                        </span>
                    </div>
                    {part.output.message && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {part.output.message}
                        </p>
                    )}
                </div>
            ) : (
                <DefaultOutputView part={part} />
            )}
        </ToolWrapper>
    );
});
