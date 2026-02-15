"use client";

import { memo, useMemo } from "react";
import { Zap } from "lucide-react";
import {
    ToolWrapper,
    DefaultOutputView,
    type ToolPartState,
} from "./tool-wrapper";

export const ActivateSkillTool = memo(function ActivateSkillTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        return part.input?.skillName || "Activating skill...";
    }, [part.input]);

    return (
        <ToolWrapper
            part={part}
            icon={Zap}
            label="Activate Skill"
            inputSummary={inputSummary}
        >
            <DefaultOutputView part={part} />
        </ToolWrapper>
    );
});
