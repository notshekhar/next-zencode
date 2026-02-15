"use client";

import { memo } from "react";
import { BashTool } from "./tools/bash-tool";
import { ReadFileTool } from "./tools/read-file-tool";
import { WriteFileTool } from "./tools/write-file-tool";
import { EditFileTool } from "./tools/edit-file-tool";
import { ListFilesTool } from "./tools/list-files-tool";
import { SearchFilesTool } from "./tools/search-files-tool";
import { GrepSearchTool } from "./tools/grep-search-tool";
import { TaskManagerTool } from "./tools/task-manager-tool";
import { ActivateSkillTool } from "./tools/activate-skill-tool";
import { DefaultTool } from "./tools/default-tool";

function getToolNameFromType(type: string): string {
    return type.replace(/^tool-/, "");
}

interface ToolInvocationPartProps {
    part: {
        type: string;
        toolCallId: string;
        toolName?: string;
        state: string;
        input?: any;
        output?: any;
        errorText?: string;
    };
}

const TOOL_COMPONENTS: Record<string, React.ComponentType<{ part: any }>> = {
    bash: BashTool,
    readFile: ReadFileTool,
    writeFile: WriteFileTool,
    editFile: EditFileTool,
    listFiles: ListFilesTool,
    searchFiles: SearchFilesTool,
    grepSearch: GrepSearchTool,
    taskManager: TaskManagerTool,
    activateSkill: ActivateSkillTool,
};

export const ToolInvocationPart = memo(
    function ToolInvocationPart({ part }: ToolInvocationPartProps) {
        const toolName = part.toolName || getToolNameFromType(part.type);
        const Component = TOOL_COMPONENTS[toolName];

        if (Component) {
            return <Component part={part} />;
        }

        return <DefaultTool part={part} toolName={toolName} />;
    },
    (prev, next) => {
        return (
            prev.part.toolCallId === next.part.toolCallId &&
            prev.part.state === next.part.state &&
            prev.part.output === next.part.output &&
            prev.part.errorText === next.part.errorText
        );
    },
);
