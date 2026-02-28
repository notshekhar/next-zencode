import { tool } from "ai";
import { z } from "zod";
import { withToolScheduling } from "../services/toolExecutionScheduler";
import { searchCodebaseContext } from "../services/codebaseContext";

export const searchCodebase = tool({
    description:
        "Semantically search the indexed codebase using natural language. " +
        "Returns the most relevant code chunks ranked by similarity to the query. " +
        "Use this when you need to find code related to a concept, feature, or pattern " +
        "that may not be findable with simple text grep.",
    inputSchema: z.object({
        query: z
            .string()
            .describe(
                "Natural language description of what you're looking for (e.g. 'authentication middleware', 'database connection setup')",
            ),
        limit: z
            .number()
            .min(1)
            .max(20)
            .optional()
            .default(10)
            .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, limit }) =>
        withToolScheduling("read", async () => {
            try {
                const projectPath = process.cwd();
                const ctx = await searchCodebaseContext(
                    query,
                    projectPath,
                    limit,
                );

                return {
                    success: true,
                    query,
                    results: ctx.results.map((r) => ({
                        filePath: r.filePath,
                        startLine: r.startLine,
                        endLine: r.endLine,
                        content: r.content,
                        language: r.language,
                        similarity: r.similarity,
                    })),
                    count: ctx.results.length,
                };
            } catch (error) {
                return {
                    success: false,
                    query,
                    results: [],
                    count: 0,
                    error:
                        error instanceof Error ? error.message : String(error),
                };
            }
        }),
});
