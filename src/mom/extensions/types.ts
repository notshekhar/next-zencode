/**
 * Extension system types for Zencode.
 *
 * Extensions are TypeScript modules that can:
 * - Subscribe to agent lifecycle events (before/after LLM calls, tool execution, etc.)
 * - Register custom LLM-callable tools
 * - Inject dynamic context before each turn
 * - Register custom model providers
 * - Modify system prompts
 *
 * Inspired by pi.dev's extension architecture, adapted for the web-based Next.js context.
 */

import type { z } from "zod";
import type { LanguageModel } from "ai";
import type { AgentMode, DetailedModel } from "../shared/types";
import type { FrontendEvent } from "../frontend-events";

// ============================================================================
// Tool Registration
// ============================================================================

export interface ExtensionToolDefinition<
    TInput extends z.ZodTypeAny = z.ZodTypeAny,
> {
    name: string;
    description: string;
    parameters: TInput;
    execute: (
        params: z.infer<TInput>,
        ctx: ToolExecutionContext,
    ) => Promise<unknown>;
    /** "read" tools run in parallel (up to 6), "write" tools are serialized */
    scheduling?: "read" | "write";
    /** Which agent modes this tool is available in. Defaults to ["build"]. */
    modes?: AgentMode[];
}

export interface ToolExecutionContext {
    cwd: string;
    abortSignal?: AbortSignal;
}

// ============================================================================
// Extension Events
// ============================================================================

export interface BeforeAgentStartEvent {
    type: "before_agent_start";
    prompt: string;
    systemPrompt: string;
    mode: AgentMode;
    threadId: string;
}

export interface BeforeAgentStartResult {
    /** Prepend or replace system prompt text */
    systemPrompt?: string;
    /** Additional context to inject */
    additionalContext?: string;
}

export interface AgentStartEvent {
    type: "agent_start";
    threadId: string;
    mode: AgentMode;
}

export interface AgentEndEvent {
    type: "agent_end";
    threadId: string;
}

export interface ContextEvent {
    type: "context";
    threadId: string;
    mode: AgentMode;
    /** The current system prompt — handlers can return modifications */
    systemPrompt: string;
}

export interface ContextEventResult {
    /** Additional context to append to the system prompt */
    additionalContext?: string;
    /** Replace system prompt entirely */
    systemPrompt?: string;
}

export interface ToolCallEvent {
    type: "tool_call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    threadId: string;
}

export interface ToolCallEventResult {
    /** Block the tool call */
    block?: boolean;
    /** Reason for blocking */
    reason?: string;
}

export interface ToolResultEvent {
    type: "tool_result";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
    isError: boolean;
    threadId: string;
}

export interface ToolResultEventResult {
    /** Override the result */
    result?: unknown;
}

export interface SessionStartEvent {
    type: "session_start";
    threadId: string;
}

export interface SessionEndEvent {
    type: "session_end";
    threadId: string;
}

/** Union of all events */
export type ExtensionEvent =
    | BeforeAgentStartEvent
    | AgentStartEvent
    | AgentEndEvent
    | ContextEvent
    | ToolCallEvent
    | ToolResultEvent
    | SessionStartEvent
    | SessionEndEvent;

/** Map of event types to their result types */
export interface ExtensionEventResultMap {
    before_agent_start: BeforeAgentStartResult;
    agent_start: void;
    agent_end: void;
    context: ContextEventResult;
    tool_call: ToolCallEventResult;
    tool_result: ToolResultEventResult;
    session_start: void;
    session_end: void;
}

export type ExtensionEventType = ExtensionEvent["type"];

type EventOfType<T extends ExtensionEventType> = Extract<
    ExtensionEvent,
    { type: T }
>;

export type ExtensionHandler<T extends ExtensionEventType> = (
    event: EventOfType<T>,
) => Promise<ExtensionEventResultMap[T] | void> | ExtensionEventResultMap[T] | void;

// ============================================================================
// Extension API (passed to extension factory)
// ============================================================================

/**
 * The API surface available to extensions during initialization.
 * Extensions call methods on this object to register tools, hooks, and providers.
 */
export interface ExtensionAPI {
    /** Subscribe to an agent lifecycle event */
    on<T extends ExtensionEventType>(event: T, handler: ExtensionHandler<T>): void;

    /** Register a tool that the LLM can call */
    registerTool<TInput extends z.ZodTypeAny>(
        tool: ExtensionToolDefinition<TInput>,
    ): void;

    /** Get the current working directory */
    getCwd(): string;

    /** Log a message (visible in server logs) */
    log(message: string, level?: "info" | "warn" | "error"): void;

    // ─── AI Provider Registration ──────────────────────────────────────

    /** Register an AI model provider (e.g. OpenAI, Anthropic, custom LLM) */
    registerProvider(config: ExtensionProviderConfig): void;

    /** Register a model under an existing provider */
    registerModel(config: ExtensionModelConfig): void;

    // ─── Frontend Interaction ────────────────────────────────────────────

    /** Send an event to the frontend UI (play sounds, show toasts, etc.) */
    emitFrontendEvent(event: FrontendEvent): void;

    /** Play a sound in the frontend */
    playSound(sound: "success" | "error" | "notification" | "complete" | string): void;

    /** Show a toast notification in the frontend */
    showToast(message: string, variant?: "default" | "success" | "error" | "warning" | "info"): void;

    /** Show a browser notification */
    showNotification(title: string, body?: string): void;

    /** Trigger an animation in the frontend */
    triggerAnimation(animation: "confetti" | "shake" | "pulse" | "bounce" | string): void;
}

// ============================================================================
// Provider Registration
// ============================================================================

/**
 * Configuration for registering a model provider via extension.
 * Extensions can add entirely new AI providers (OpenAI, Anthropic, custom, etc.)
 */
export interface ExtensionProviderConfig {
    /** Unique provider ID (e.g. "openai", "anthropic", "my-custom-llm") */
    id: string;
    /** Display name */
    name: string;
    /** Description shown in UI */
    description?: string;
    /** Icon URL for the provider */
    iconUrl?: string;
    /** Environment variable name for the API key */
    apiKeyEnvVar?: string;
    /** URL hint for where to get an API key */
    apiKeyUrl?: string;
    /**
     * Factory function that creates a LanguageModel from the AI SDK
     * given a model ID and optional API key.
     */
    createModel: (modelId: string, apiKey?: string) => LanguageModel;
}

/**
 * Configuration for registering a specific model under a provider.
 */
export interface ExtensionModelConfig {
    /** Unique model ID (e.g. "gpt-4o", "claude-4-sonnet") */
    id: string;
    /** Display name */
    name: string;
    /** The model ID to pass to the provider's createModel() */
    providerModelId: string;
    /** Provider ID this model belongs to */
    providerId: string;
    /** Description */
    description?: string;
    /** Context window size in tokens */
    contextWindow?: number;
    /** Whether the provider limits attachments */
    limitAttachments?: boolean;
    /** Whether this should be the default model */
    isDefault?: boolean;
}

// ============================================================================
// Extension Factory & Metadata
// ============================================================================

/** Extension factory function — the default export of every extension module */
export type ExtensionFactory = (api: ExtensionAPI) => void | Promise<void>;

/** Extension manifest in package.json under the "zencode" key */
export interface ExtensionManifest {
    name: string;
    version?: string;
    description?: string;
    /** Entry point paths relative to package root */
    extensions?: string[];
}

// ============================================================================
// Loaded Extension (internal)
// ============================================================================

export interface LoadedExtension {
    /** Original path this extension was loaded from */
    path: string;
    /** Resolved absolute path */
    resolvedPath: string;
    /** Display name (from manifest or directory name) */
    name: string;
    /** Description */
    description?: string;
    /** Event handlers registered by this extension */
    handlers: Map<string, Array<(...args: unknown[]) => Promise<unknown>>>;
    /** Tools registered by this extension */
    tools: Map<string, ExtensionToolDefinition>;
    /** AI providers registered by this extension */
    providers: Map<string, ExtensionProviderConfig>;
    /** AI models registered by this extension */
    models: ExtensionModelConfig[];
    /** Whether the extension is enabled */
    enabled: boolean;
    /** Whether this extension is bundled with zencode (from extensions/examples/) */
    bundled?: boolean;
    /** Errors during load */
    loadError?: string;
}

export interface LoadExtensionsResult {
    extensions: LoadedExtension[];
    errors: Array<{ path: string; error: string }>;
}
