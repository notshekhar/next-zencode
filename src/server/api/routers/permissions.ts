import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { configService } from "../../services/configService";

export const permissionsRouter = createTRPCRouter({
    allow: publicProcedure
        .input(z.object({ command: z.string() }))
        .mutation(({ input }) => {
            const baseCommand = input.command.trim().split(/\s+/)[0] || "";

            if (!baseCommand) {
                throw new Error("Invalid command");
            }

            try {
                configService.addAllowedCommand(baseCommand);
                return { success: true, command: baseCommand };
            } catch (error) {
                console.error("[Permissions Error]", error);
                throw new Error("Failed to save permission");
            }
        }),

    list: publicProcedure.query(() => {
        try {
            const commands = configService.getAllowedCommands();
            return { commands };
        } catch (error) {
            console.error("[Permissions Error]", error);
            throw new Error("Failed to get permissions");
        }
    }),
});
