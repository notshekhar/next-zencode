import { tool } from "ai";
import { z } from "zod";
import { skillService } from "../services/skillService";
import { withToolScheduling } from "../services/toolExecutionScheduler";

export function createListSkillsTool(projectDir?: string) {
    return tool({
        description: "List all available specialized skills that can be activated to help with specific tasks.",
        inputSchema: z.object({}),
        execute: async () =>
            withToolScheduling("read", async () => {
                const skills = skillService.getAllSkills(projectDir);
                
                if (skills.length === 0) {
                    return {
                        success: true,
                        message: "No specialized skills are currently available.",
                        skills: []
                    };
                }

                const skillList = skills.map(skill => ({
                    name: skill.name,
                    description: skill.description,
                    source: skill.source
                }));

                return {
                    success: true,
                    message: `Found ${skills.length} available skills.`,
                    skills: skillList
                };
            }),
    });
}
