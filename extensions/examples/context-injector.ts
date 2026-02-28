/**
 * Context Injector Extension — dynamic context injection example.
 *
 * Demonstrates:
 * - Injecting dynamic context before each LLM call
 * - Modifying the system prompt at runtime
 * - Reading project files to provide extra context
 *
 * This extension reads a .zencode/context.md file (if present) and
 * injects its contents into the system prompt, enabling project-specific
 * instructions without modifying the core agent.
 *
 * To use: copy this file to .zencode/extensions/context-injector.ts
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";
import * as fs from "fs";
import * as path from "path";

const contextInjector: ExtensionFactory = (api) => {
    const cwd = api.getCwd();
    const contextFile = path.join(cwd, ".zencode", "context.md");

    api.log("Context injector loaded");

    api.on("context", async (event) => {
        if (!fs.existsSync(contextFile)) return;

        try {
            const content = fs.readFileSync(contextFile, "utf-8").trim();
            if (content.length > 0) {
                return {
                    additionalContext: `<project_context>\n${content}\n</project_context>`,
                };
            }
        } catch {
            // File unreadable — skip silently
        }
    });
};

export default contextInjector;
