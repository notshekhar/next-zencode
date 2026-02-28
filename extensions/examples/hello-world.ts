/**
 * Hello World Extension — minimal example.
 *
 * Demonstrates:
 * - Registering a custom tool
 * - Subscribing to lifecycle events
 * - Using the extension API
 *
 * To use: copy this file to .zencode/extensions/hello-world.ts
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";
import { z } from "zod";

const helloWorld: ExtensionFactory = (api) => {
    api.log("Hello World extension loaded!");

    // Register a simple tool the LLM can call
    api.registerTool({
        name: "hello",
        description:
            "Say hello to someone. Use this when the user asks you to greet someone.",
        parameters: z.object({
            name: z.string().describe("The name to greet"),
            language: z
                .enum(["en", "es", "fr", "de", "ja", "hi"])
                .default("en")
                .describe("Language for the greeting"),
        }),
        scheduling: "read",
        modes: ["build", "plan"],
        execute: async (params) => {
            const greetings: Record<string, string> = {
                en: `Hello, ${params.name}! 👋`,
                es: `¡Hola, ${params.name}! 👋`,
                fr: `Bonjour, ${params.name}! 👋`,
                de: `Hallo, ${params.name}! 👋`,
                ja: `こんにちは、${params.name}！👋`,
                hi: `नमस्ते, ${params.name}! 👋`,
            };
            return {
                greeting: greetings[params.language] ?? greetings.en,
                timestamp: new Date().toISOString(),
            };
        },
    });

    // Log when agent starts and ends
    api.on("agent_start", async (event) => {
        api.log("Agent started for thread " + event.threadId + " in " + event.mode + " mode");
    });

    api.on("agent_end", async (event) => {
        api.log("Agent finished for thread " + event.threadId);

        // Play a sound in the frontend when the agent finishes
        api.playSound("complete");

        // Show a toast in the frontend
        api.showToast("Response complete!", "success");
    });
};

export default helloWorld;
