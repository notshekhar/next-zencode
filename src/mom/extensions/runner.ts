/**
 * Extension runner — executes lifecycle hooks and manages extension state at runtime.
 *
 * The runner is the bridge between the chat service and loaded extensions.
 * It fires events, collects results, and merges extension-provided tools
 * into the active tool set.
 */

import { tool } from "ai";
import { withToolScheduling } from "../services/toolExecutionScheduler";
import type { AgentMode } from "../shared/types";
import type {
    ExtensionEventType,
    ExtensionEventResultMap,
    ExtensionEvent,
    ExtensionToolDefinition,
    LoadedExtension,
    ToolExecutionContext,
} from "./types";

type EventOfType<T extends ExtensionEventType> = Extract<
    ExtensionEvent,
    { type: T }
>;

export class ExtensionRunner {
    private extensions: LoadedExtension[] = [];

    setExtensions(extensions: LoadedExtension[]): void {
        this.extensions = extensions;
    }

    getExtensions(): LoadedExtension[] {
        return this.extensions;
    }

    getEnabledExtensions(): LoadedExtension[] {
        return this.extensions.filter((ext) => ext.enabled);
    }

    enableExtension(name: string): boolean {
        const ext = this.extensions.find((e) => e.name === name);
        if (ext) {
            ext.enabled = true;
            return true;
        }
        return false;
    }

    disableExtension(name: string): boolean {
        const ext = this.extensions.find((e) => e.name === name);
        if (ext) {
            ext.enabled = false;
            return true;
        }
        return false;
    }

    /**
     * Fire an event to all enabled extensions.
     * Collects and merges results from all handlers.
     */
    async fireEvent<T extends ExtensionEventType>(
        event: EventOfType<T>,
    ): Promise<ExtensionEventResultMap[T][]> {
        const results: ExtensionEventResultMap[T][] = [];

        for (const ext of this.getEnabledExtensions()) {
            const handlers = ext.handlers.get(event.type);
            if (!handlers || handlers.length === 0) continue;

            for (const handler of handlers) {
                try {
                    const result = await handler(event);
                    if (result !== undefined && result !== null) {
                        results.push(result as ExtensionEventResultMap[T]);
                    }
                } catch (err) {
                    console.error(
                        "[ext:" + ext.name + "] Error in " + event.type + " handler:",
                        err instanceof Error ? err.message : err,
                    );
                }
            }
        }

        return results;
    }

    /**
     * Merge results from the "context" event into a single system prompt modification.
     */
    mergeContextResults(
        originalPrompt: string,
        results: Array<{ additionalContext?: string; systemPrompt?: string } | void>,
    ): string {
        let prompt = originalPrompt;
        const additionalContextParts: string[] = [];

        for (const result of results) {
            if (!result) continue;
            if (result.systemPrompt) {
                prompt = result.systemPrompt;
            }
            if (result.additionalContext) {
                additionalContextParts.push(result.additionalContext);
            }
        }

        if (additionalContextParts.length > 0) {
            prompt += "\n\n" + additionalContextParts.join("\n\n");
        }

        return prompt;
    }

    /**
     * Check if any extension wants to block a tool call.
     */
    async checkToolCallBlocked(
        toolCallId: string,
        toolName: string,
        args: Record<string, unknown>,
        threadId: string,
    ): Promise<{ blocked: boolean; reason?: string }> {
        const results = await this.fireEvent({
            type: "tool_call",
            toolCallId,
            toolName,
            args,
            threadId,
        });

        for (const result of results) {
            if (result && typeof result === "object" && "block" in result && result.block) {
                return {
                    blocked: true,
                    reason: "reason" in result ? (result.reason as string) : undefined,
                };
            }
        }

        return { blocked: false };
    }

    /**
     * Collect all tools registered by enabled extensions, filtered by mode.
     * Returns them wrapped as Vercel AI SDK tool() objects.
     */
    getExtensionTools(
        mode: AgentMode,
        cwd: string,
    ): Record<string, any> {
        const extensionTools: Record<string, any> = {};

        for (const ext of this.getEnabledExtensions()) {
            for (const [toolName, toolDef] of ext.tools) {
                const modes = toolDef.modes ?? ["build"];
                if (!modes.includes(mode)) continue;

                extensionTools[toolName] = wrapExtensionTool(toolDef, cwd);
            }
        }

        return extensionTools;
    }

    /**
     * Get a summary of all loaded extensions for display purposes.
     */
    getSummary(): Array<{
        name: string;
        path: string;
        enabled: boolean;
        toolCount: number;
        eventCount: number;
        providerCount: number;
        modelCount: number;
        bundled: boolean;
        description?: string;
        loadError?: string;
    }> {
        return this.extensions.map((ext) => ({
            name: ext.name,
            path: ext.path,
            enabled: ext.enabled,
            toolCount: ext.tools.size,
            eventCount: ext.handlers.size,
            providerCount: ext.providers.size,
            modelCount: ext.models.length,
            bundled: ext.bundled ?? false,
            description: ext.description,
            loadError: ext.loadError,
        }));
    }
}

/**
 * Wrap an extension tool definition into a Vercel AI SDK tool() object.
 */
function wrapExtensionTool(
    def: ExtensionToolDefinition,
    cwd: string,
) {
    const scheduling = def.scheduling ?? "read";

    return tool({
        description: def.description,
        inputSchema: def.parameters as any,
        execute: async (params: any) =>
            withToolScheduling(scheduling, async () => {
                const ctx: ToolExecutionContext = { cwd };
                try {
                    return await def.execute(params, ctx);
                } catch (error) {
                    return {
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            }),
    });
}

/** Singleton runner instance */
export const extensionRunner = new ExtensionRunner();
