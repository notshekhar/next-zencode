/**
 * Web Search Extension — adds a web search tool.
 *
 * Demonstrates:
 * - Registering a tool with network access
 * - Async tool execution
 * - Returning structured results
 *
 * This is a skeleton — replace the search implementation with your
 * preferred search API (SerpAPI, Brave Search, Tavily, etc.).
 *
 * To use: copy this file to .zencode/extensions/web-search.ts
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";
import { z } from "zod";

const webSearch: ExtensionFactory = (api) => {
    api.log("Web search extension loaded");

    api.registerTool({
        name: "webSearch",
        description:
            "Search the web for real-time information. Use when you need up-to-date data, documentation, or facts not available in the codebase.",
        parameters: z.object({
            query: z.string().describe("The search query"),
            maxResults: z
                .number()
                .default(5)
                .describe("Maximum number of results to return"),
        }),
        scheduling: "read",
        modes: ["build", "plan"],
        execute: async (params) => {
            // Replace this with your actual search API integration:
            //
            // Example with Tavily:
            //   const response = await fetch("https://api.tavily.com/search", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({
            //       api_key: process.env.TAVILY_API_KEY,
            //       query: params.query,
            //       max_results: params.maxResults,
            //     }),
            //   });
            //   return await response.json();

            return {
                query: params.query,
                results: [],
                note: "Web search not configured. Set up your preferred search API in this extension.",
            };
        },
    });
};

export default webSearch;
