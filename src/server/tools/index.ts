export { bash } from "./bash";
export { readFile } from "./readFile";
export { writeFile } from "./writeFile";
export { editFile } from "./editFile";
export { listFiles } from "./listFiles";
export { searchFiles } from "./searchFiles";
export { grepSearch } from "./grepSearch";
export { taskManager } from "./taskManager";
export { bashPlanMode } from "./bashPlanMode";
export { createUseSkillTool } from "./activateSkill";
export { createListSkillsTool } from "./listSkills";

// Export all tools as a single object
import { bash } from "./bash";
import { readFile } from "./readFile";
import { writeFile } from "./writeFile";
import { editFile } from "./editFile";
import { listFiles } from "./listFiles";
import { searchFiles } from "./searchFiles";
import { grepSearch } from "./grepSearch";
import { taskManager } from "./taskManager";
import { bashPlanMode } from "./bashPlanMode";
import { createUseSkillTool } from "./activateSkill";
import { createListSkillsTool } from "./listSkills";
import type { AgentMode } from "../shared/types";

export interface ToolContext {
    projectDir?: string;
}

function buildBuildModeTools(context?: ToolContext) {
    return {
        bash,
        readFile,
        writeFile,
        editFile,
        listFiles,
        searchFiles,
        grepSearch,
        taskManager,
        useSkill: createUseSkillTool(context?.projectDir),
        listSkills: createListSkillsTool(context?.projectDir),
    };
}

function buildPlanModeTools(context?: ToolContext) {
    return {
        bash: bashPlanMode,
        readFile,
        listFiles,
        searchFiles,
        grepSearch,
        taskManager,
        useSkill: createUseSkillTool(context?.projectDir),
        listSkills: createListSkillsTool(context?.projectDir),
    };
}

// Backwards-compatible default export for non-server flows.
export const tools = buildBuildModeTools();
export const planModeTools = buildPlanModeTools();

// Get tools based on mode
export function getToolsForMode(mode: AgentMode, context?: ToolContext) {
    return mode === "plan"
        ? buildPlanModeTools(context)
        : buildBuildModeTools(context);
}
