import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { skillService } from "../../services/skillService";

export const skillsRouter = createTRPCRouter({
    list: publicProcedure.query(() => {
        return skillService.getAllSkills();
    }),

    create: publicProcedure
        .input(
            z.object({
                name: z.string(),
                description: z.string(),
                content: z.string(),
                scope: z.enum(["global", "project"]),
                triggers: z.array(z.string()).optional(),
            }),
        )
        .mutation(({ input }) => {
            try {
                const skill = skillService.createSkill(
                    input.name,
                    input.description,
                    input.content,
                    input.scope,
                    input.triggers,
                );
                return skill;
            } catch (err) {
                throw new Error("Failed to create skill");
            }
        }),

    listGlobal: publicProcedure.query(() => {
        return skillService.getGlobalSkills();
    }),

    listProject: publicProcedure.query(() => {
        return skillService.getProjectSkills();
    }),

    getPaths: publicProcedure.query(() => {
        return {
            global: skillService.getGlobalSkillsDirPath(),
            project: skillService.getProjectSkillsDirPath(),
        };
    }),

    get: publicProcedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => {
            const skill = skillService.getSkill(input.name);
            if (!skill) {
                throw new Error("Skill not found");
            }
            return skill;
        }),

    delete: publicProcedure
        .input(
            z.object({
                name: z.string(),
                scope: z.enum(["global", "project"]).optional(),
            }),
        )
        .mutation(({ input }) => {
            const deleted = skillService.deleteSkill(input.name, input.scope);
            if (!deleted) {
                throw new Error("Skill not found or could not be deleted");
            }
            return { success: true };
        }),
});
