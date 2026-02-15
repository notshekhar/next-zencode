import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { fileSearchService } from "../../services/fileSearchService";

export const filesRouter = createTRPCRouter({
    search: publicProcedure
        .input(
            z.object({
                q: z.string(),
                limit: z.number().optional().default(10),
            }),
        )
        .query(({ input }) => {
            const results = fileSearchService.search(
                input.q,
                process.cwd(),
                input.limit,
            );
            return results;
        }),

    invalidateCache: publicProcedure.mutation(() => {
        fileSearchService.invalidateCache();
        return { success: true };
    }),
});
