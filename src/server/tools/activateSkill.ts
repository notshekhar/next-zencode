import { tool } from "ai";
import { z } from "zod";
import * as path from "path";
import { skillService } from "../services/skillService";
import { withToolScheduling } from "../services/toolExecutionScheduler";

interface ActivateSkillResult {
    success: boolean;
    message: string;
    llmContent?: string;
    error?: string;
}

function buildInputSchema(availableSkillNames: string[]) {
    if (availableSkillNames.length === 0) {
        return z.object({
            name: z.string().describe("No skills are currently available."),
        });
    }

    return z.object({
        name: z
            .enum(availableSkillNames as [string, ...string[]])
            .describe("The name of the skill to activate."),
    });
}

export function createActivateSkillTool(projectDir?: string) {
    const availableSkills = skillService.getAllSkills(projectDir);
    const availableSkillNames = availableSkills.map((skill) => skill.name);
    const availableHint =
        availableSkillNames.length > 0
            ? ` Available: ${availableSkillNames.map((name) => `"${name}"`).join(", ")}.`
            : "";

    return tool({
        description: `Activate a specialized skill by name and return its instructions in <activated_skill> tags.${availableHint}`,
        inputSchema: buildInputSchema(availableSkillNames),
        execute: async ({ name }): Promise<ActivateSkillResult> =>
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
                const llmContent = `<activated_skill name="${skill.name}">
  <instructions>
${skill.content}
  </instructions>

  <available_resources>
${resources || "(none)"}
  </available_resources>
</activated_skill>`;

                return {
                    success: true,
                    message: `Skill "${skill.name}" activated from ${skillDir}`,
                    llmContent,
                };
            }),
    });
}
