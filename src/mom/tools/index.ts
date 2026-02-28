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
export { searchCodebase } from "./searchCodebase";

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
import { searchCodebase } from "./searchCodebase";
import { extensionRunner } from "../extensions";
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
        searchCodebase,
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
        searchCodebase,
        taskManager,
        useSkill: createUseSkillTool(context?.projectDir),
        listSkills: createListSkillsTool(context?.projectDir),
    };
}

// Backwards-compatible default export for non-server flows.
export const tools = buildBuildModeTools();
export const planModeTools = buildPlanModeTools();

/**
 * Get tools for the given mode, with extension-registered tools merged in.
 * Extension tools are layered on top — they can add new tools or override builtins.
 */
export function getToolsForMode(mode: AgentMode, context?: ToolContext) {
    const builtinTools =
        mode === "plan"
            ? buildPlanModeTools(context)
            : buildBuildModeTools(context);

    const cwd = context?.projectDir ?? process.cwd();
    const extTools = extensionRunner.getExtensionTools(mode, cwd);

    return { ...builtinTools, ...extTools };
}
