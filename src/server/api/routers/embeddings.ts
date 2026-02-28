import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

// Every embeddings module is lazy-loaded so Turbopack never has to
// resolve @huggingface/transformers (or the bun:sqlite import in
// store.ts) at startup — only when a route is actually called.
async function lazyStore() {
    return import("@/mom/embeddings/store");
}
async function lazyConfig() {
    return import("@/mom/embeddings/config");
}
async function lazyIndexer() {
    return import("@/mom/embeddings/indexer");
}

function getCwd(): string {
    return process.cwd();
}

export const embeddingsRouter = createTRPCRouter({
    getStats: publicProcedure.query(async () => {
        const cwd = getCwd();
        const { getStats, isVecAvailable } = await lazyStore();
        const { getEmbeddingUnavailableReason } = await lazyConfig();
        const stats = getStats(cwd);
        const unavailable = getEmbeddingUnavailableReason();
        return {
            ...stats,
            projectPath: cwd,
            unavailableReason: unavailable,
            vecIndexEnabled: isVecAvailable(),
        };
    }),

    index: publicProcedure
        .input(
            z
                .object({
                    fullReindex: z.boolean().optional().default(false),
                })
                .optional(),
        )
        .mutation(async ({ input }) => {
            const cwd = getCwd();
            const doFull = input?.fullReindex ?? false;
            const { indexProject, reindexProject } = await lazyIndexer();
            if (doFull) {
                return reindexProject(cwd);
            }
            return indexProject(cwd);
        }),

    search: publicProcedure
        .input(
            z.object({
                query: z.string().min(1),
                limit: z.number().min(1).max(100).optional().default(20),
            }),
        )
        .mutation(async ({ input }) => {
            const cwd = getCwd();
            const { generateEmbedding } = await lazyConfig();
            const { semanticSearch } = await lazyStore();
            const queryVector = await generateEmbedding(input.query);
            return semanticSearch(cwd, queryVector, input.limit);
        }),

    getChunks: publicProcedure
        .input(
            z
                .object({
                    limit: z.number().min(1).max(200).optional().default(50),
                    offset: z.number().min(0).optional().default(0),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            const cwd = getCwd();
            const { getChunks } = await lazyStore();
            const limit = input?.limit ?? 50;
            const offset = input?.offset ?? 0;
            return getChunks(cwd, limit, offset);
        }),

    clearIndex: publicProcedure.mutation(async () => {
        const cwd = getCwd();
        const { clearProjectEmbeddings } = await lazyStore();
        clearProjectEmbeddings(cwd);
        return { success: true };
    }),
});
