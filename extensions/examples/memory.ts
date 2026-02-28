/**
 * Memory Extension — persistent memory across sessions.
 *
 * Demonstrates:
 * - Persisting data to disk from an extension
 * - Injecting remembered context into the system prompt
 * - Providing a tool for the LLM to save/recall memories
 *
 * Stores key-value memories in .zencode/memory.json.
 *
 * To use: copy this file to .zencode/extensions/memory.ts
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

interface MemoryStore {
    memories: Record<string, { value: string; createdAt: string; updatedAt: string }>;
}

function loadMemories(filePath: string): MemoryStore {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
    } catch {
        // Corrupt file — start fresh
    }
    return { memories: {} };
}

function saveMemories(filePath: string, store: MemoryStore): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

const memory: ExtensionFactory = (api) => {
    const cwd = api.getCwd();
    const memoryFile = path.join(cwd, ".zencode", "memory.json");

    api.log("Memory extension loaded");

    api.registerTool({
        name: "memory",
        description:
            "Save, recall, list, or delete persistent memories that persist across sessions. " +
            "Use 'save' to remember important context. Use 'recall' to look up a specific memory. " +
            "Use 'list' to see all saved memories. Use 'delete' to forget a memory.",
        parameters: z.object({
            action: z.enum(["save", "recall", "list", "delete"]),
            key: z.string().optional().describe("Memory key (required for save/recall/delete)"),
            value: z.string().optional().describe("Memory value (required for save)"),
        }),
        scheduling: "write",
        modes: ["build", "plan"],
        execute: async (params) => {
            const store = loadMemories(memoryFile);
            const now = new Date().toISOString();

            switch (params.action) {
                case "save": {
                    if (!params.key || !params.value) {
                        return { error: "Both 'key' and 'value' are required for save" };
                    }
                    const existing = store.memories[params.key];
                    store.memories[params.key] = {
                        value: params.value,
                        createdAt: existing?.createdAt ?? now,
                        updatedAt: now,
                    };
                    saveMemories(memoryFile, store);
                    return { saved: params.key, value: params.value };
                }

                case "recall": {
                    if (!params.key) {
                        return { error: "'key' is required for recall" };
                    }
                    const mem = store.memories[params.key];
                    return mem
                        ? { key: params.key, ...mem }
                        : { error: `No memory found for key "${params.key}"` };
                }

                case "list": {
                    const keys = Object.keys(store.memories);
                    return {
                        count: keys.length,
                        memories: keys.map((k) => ({
                            key: k,
                            preview: store.memories[k]!.value.slice(0, 100),
                            updatedAt: store.memories[k]!.updatedAt,
                        })),
                    };
                }

                case "delete": {
                    if (!params.key) {
                        return { error: "'key' is required for delete" };
                    }
                    if (store.memories[params.key]) {
                        delete store.memories[params.key];
                        saveMemories(memoryFile, store);
                        return { deleted: params.key };
                    }
                    return { error: `No memory found for key "${params.key}"` };
                }
            }
        },
    });

    // Inject saved memories into context
    api.on("context", async () => {
        const store = loadMemories(memoryFile);
        const keys = Object.keys(store.memories);

        if (keys.length === 0) return;

        const memoryText = keys
            .map((k) => `- **${k}**: ${store.memories[k]!.value}`)
            .join("\n");

        return {
            additionalContext: `<persistent_memories>\nThe following memories have been saved from previous sessions:\n${memoryText}\n</persistent_memories>`,
        };
    });
};

export default memory;
