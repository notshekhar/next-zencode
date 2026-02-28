import { tool } from "ai";
import { z } from "zod";
import * as path from "path";
import { skillService } from "../services/skillService";
import { withToolScheduling } from "../services/toolExecutionScheduler";

interface UseSkillResult {
    success: boolean;
    message: string;
    llmContent?: string;
    error?: string;
}

function buildInputSchema(availableSkillNames: string[]) {
    const description = availableSkillNames.length > 0
        ? `The name of the skill to use. Available: ${availableSkillNames.join(", ")}`
        : "The name of the skill to use.";

    return z.object({
        name: z.string().describe(description),
    });
}

export function createUseSkillTool(projectDir?: string) {
    const availableSkills = skillService.getAllSkills(projectDir);
    const availableSkillNames = availableSkills.map((skill) => skill.name);
    const availableHint =
        availableSkillNames.length > 0
            ? ` Available: ${availableSkillNames.map((name) => `"${name}"`).join(", ")}.`
            : "";

    return tool({
        description: `Load a specialized skill by name and return its instructions. Use this after discovering skills via listSkills.${availableHint}`,
        inputSchema: buildInputSchema(availableSkillNames),
        execute: async ({ name }): Promise<UseSkillResult> =>
            withToolScheduling("read", async () => {
                const skill = skillService.getSkill(name, projectDir);
                if (!skill) {
                    const available = skillService.getSkillNames(projectDir);
                    const message =
                        available.length > 0
                            ? `Skill "${name}" not found. Available skills: ${available.join(", ")}`
                            : `Skill "${name}" not found. No skills are currently available.`;

                    return {
                        success: false,
                        message,
                        error: message,
                    };
                }

                const resources = skillService.getSkillResourceTree(
                    skill.name,
                    projectDir,
                );
                const skillDir = path.dirname(skill.location);
                const llmContent = `<skill name="${skill.name}">
  <instructions>
${skill.content}
  </instructions>

  <available_resources>
${resources || "(none)"}
  </available_resources>
</skill>`;

                return {
                    success: true,
                    message: `Skill "${skill.name}" loaded from ${skillDir}`,
                    llmContent,
                };
            }),
    });
}
