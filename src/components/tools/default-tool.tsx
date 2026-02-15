"use client";

import { memo } from "react";
import { Terminal } from "lucide-react";
import {
    ToolWrapper,
    DefaultOutputView,
    type ToolPartState,
} from "./tool-wrapper";

export const DefaultTool = memo(function DefaultTool({
    part,
    toolName,
}: {
    part: ToolPartState;
    toolName: string;
}) {
    return (
        <ToolWrapper
            part={part}
            icon={Terminal}
            label={toolName}
            inputSummary="Executing..."
        >
            <DefaultOutputView part={part} />
        </ToolWrapper>
    );
});
