import type { SearchResult } from "../embeddings/store";

const CONTEXT_RESULT_LIMIT = 5;
const MIN_SIMILARITY_THRESHOLD = 0.3;

async function lazyConfig() {
    return import("../embeddings/config");
}

async function lazyStore() {
    return import("../embeddings/store");
}

export interface CodebaseContextResult {
    results: SearchResult[];
    query: string;
}

/**
 * Search the project embeddings for code chunks relevant to the user's query.
 * Returns top N results above a minimum similarity threshold.
 * Gracefully returns empty results if embeddings are unavailable.
 */
export async function searchCodebaseContext(
    query: string,
    projectPath: string,
    limit: number = CONTEXT_RESULT_LIMIT,
): Promise<CodebaseContextResult> {
    try {
        const { getEmbeddingUnavailableReason, generateEmbedding } =
            await lazyConfig();

        if (getEmbeddingUnavailableReason()) {
            return { results: [], query };
        }

        const { semanticSearch, getStats } = await lazyStore();

        const stats = getStats(projectPath);
        if (stats.totalChunks === 0) {
            return { results: [], query };
        }

        const queryVector = await generateEmbedding(query);
        const results = semanticSearch(projectPath, queryVector, limit);

        const filtered = results.filter(
            (r) => r.similarity >= MIN_SIMILARITY_THRESHOLD,
        );

        return { results: filtered, query };
    } catch {
        return { results: [], query };
    }
}

/**
 * Format search results into a context block that can be appended to the
 * system prompt so the model sees relevant code snippets automatically.
 */
export function formatCodebaseContext(ctx: CodebaseContextResult): string {
    if (ctx.results.length === 0) return "";

    const chunks = ctx.results
        .map((r) => {
            return `--- ${r.filePath} (lines ${r.startLine}–${r.endLine}) [${r.language}] ---
\`\`\`${r.language}
${r.content}
\`\`\``;
        })
        .join("\n\n");

    return `# Codebase Context (auto-retrieved)

The following code snippets were automatically retrieved from the project index based on the user's latest message. Use them as context to give more accurate, grounded answers. You do NOT need to re-read these files unless you need additional surrounding context.

${chunks}`;
}
