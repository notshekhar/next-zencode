# Zencode Extensions

Zencode has a fully extensible plugin system inspired by [pi.dev](https://pi.dev). Extensions are TypeScript modules that hook into **mom** (the agent-core layer) and can add custom tools, lifecycle hooks, inject context, and even trigger frontend UI events like sounds and toasts.

## Architecture

```
mom (agent-core)  →  server (API layer)  →  frontend (UI)
 ↑                                              ↑
 Extensions hook here                    Frontend events arrive here
```

Everything lives in `src/mom/` — the heart of Zencode. Extensions interact with mom directly. The server is a thin tRPC layer. The frontend consumes the API and listens for frontend events emitted by extensions.

## Quick Start

1. Create a `.zencode/extensions/` directory in your project
2. Add a TypeScript file that default-exports a factory function
3. Restart Zencode — your extension is automatically discovered and loaded

```typescript
// .zencode/extensions/my-extension.ts
import type { ExtensionFactory } from "../../src/mom/extensions/types";
import { z } from "zod";

const myExtension: ExtensionFactory = (api) => {
    api.log("My extension loaded!");

    api.registerTool({
        name: "myTool",
        description: "Does something useful",
        parameters: z.object({
            input: z.string(),
        }),
        execute: async (params) => {
            return { result: "Processed: " + params.input };
        },
    });

    // Play a sound when the agent finishes
    api.on("agent_end", async () => {
        api.playSound("complete");
    });
};

export default myExtension;
```

## Extension Locations

Extensions are discovered from these locations (in order):

| Location | Scope |
|----------|-------|
| `<project>/.zencode/extensions/` | Project-local |
| `~/.config/zencode/extensions/` | Global (all projects) |
| Paths in config | Explicitly configured |

## What Extensions Can Do

### Register AI Providers & Models

The most powerful extension capability — add entirely new AI connectors:

```typescript
import type { ExtensionFactory } from "../../src/mom/extensions/types";

const myProvider: ExtensionFactory = async (api) => {
    const { createOpenAI } = await import("@ai-sdk/openai");

    api.registerProvider({
        id: "my-llm",
        name: "My Custom LLM",
        description: "Custom inference endpoint",
        apiKeyEnvVar: "MY_LLM_API_KEY",
        createModel: (modelId, apiKey) => {
            const client = createOpenAI({
                baseURL: "https://my-llm.example.com/v1",
                apiKey: apiKey || "",
            });
            return client(modelId);
        },
    });

    api.registerModel({
        id: "my-model-large",
        name: "My Model Large",
        providerModelId: "my-model-large-v2",
        providerId: "my-llm",
        description: "Large reasoning model",
        contextWindow: 128000,
    });
};

export default myProvider;
```

This is how you can add OpenAI, Anthropic, OpenRouter, or any OpenAI-compatible API. The builtin providers (Google, Groq, Ollama) are registered the same way internally — extensions are first-class citizens.

See `extensions/examples/` for ready-made provider extensions:
- **openai-provider.ts** — GPT-4o, GPT-4o-mini, o3-mini
- **anthropic-provider.ts** — Claude 4 Sonnet, Opus, Haiku
- **openrouter-provider.ts** — 200+ models through one API key

### Register Custom Tools

Add new tools the LLM can call:

```typescript
api.registerTool({
    name: "fetchDocs",
    description: "Fetch documentation from a URL",
    parameters: z.object({
        url: z.string().url(),
    }),
    scheduling: "read",        // "read" (parallel) or "write" (serialized)
    modes: ["build", "plan"],  // Which agent modes this tool is available in
    execute: async (params, ctx) => {
        const response = await fetch(params.url);
        return { content: await response.text() };
    },
});
```

### Subscribe to Lifecycle Events

Hook into the agent's lifecycle:

```typescript
// Before the LLM call — modify system prompt or inject context
api.on("context", async (event) => {
    return {
        additionalContext: "Extra context injected by my extension",
    };
});

// Before agent starts processing
api.on("before_agent_start", async (event) => {
    api.log(`Processing: ${event.prompt.slice(0, 50)}...`);
    return {
        additionalContext: "You have access to the myTool extension.",
    };
});

// After agent finishes
api.on("agent_end", async (event) => {
    api.log(`Agent finished for thread ${event.threadId}`);
});

// Intercept tool calls (can block them)
api.on("tool_call", async (event) => {
    if (event.toolName === "bash" && isUnsafe(event.args.command)) {
        return { block: true, reason: "Command blocked by policy" };
    }
});

// Observe tool results
api.on("tool_result", async (event) => {
    if (event.isError) {
        api.log(`Tool ${event.toolName} failed`, "warn");
    }
});

// Session lifecycle
api.on("session_start", async (event) => {
    api.log(`New session: ${event.threadId}`);
});
```

## Available Events

| Event | When | Can Return |
|-------|------|-----------|
| `before_agent_start` | Before the agent processes a message | `{ systemPrompt?, additionalContext? }` |
| `context` | Before each LLM call | `{ systemPrompt?, additionalContext? }` |
| `agent_start` | Agent begins processing | — |
| `agent_end` | Agent finishes processing | — |
| `tool_call` | Before a tool executes | `{ block?, reason? }` |
| `tool_result` | After a tool executes | `{ result? }` |
| `session_start` | New session created | — |
| `session_end` | Session ends | — |

## Extension API

The `api` object passed to your factory function:

```typescript
interface ExtensionAPI {
    // Agent lifecycle
    on(event, handler)            // Subscribe to lifecycle events
    registerTool(tool)            // Register an LLM-callable tool
    getCwd()                      // Get current working directory
    log(message, level?)          // Log to server console

    // AI Provider registration
    registerProvider(config)      // Register a new AI provider (OpenAI, Anthropic, custom, etc.)
    registerModel(config)         // Register a model under an existing provider

    // Frontend interaction (events streamed to the UI)
    emitFrontendEvent(event)      // Send any frontend event
    playSound(sound)              // Play a sound ("success" | "error" | "notification" | "complete")
    showToast(message, variant?)  // Show a toast notification
    showNotification(title, body?)// Show a browser notification
    triggerAnimation(animation)   // Trigger a UI animation ("confetti" | "shake" | "pulse")
}
```

## Frontend Events

Extensions can send events to the frontend UI. These flow through mom's `frontendEventBus`:

```typescript
// Play a sound when agent finishes
api.on("agent_end", async () => {
    api.playSound("complete");
    api.showToast("Done!", "success");
});

// Show confetti when a tool succeeds
api.on("tool_result", async (event) => {
    if (!event.isError && event.toolName === "writeFile") {
        api.triggerAnimation("confetti");
    }
});

// Send any custom event
api.emitFrontendEvent({
    type: "custom",
    name: "my-extension-event",
    data: { foo: "bar" },
});
```

### Available Frontend Events

| Event | Description |
|-------|-------------|
| `play_sound` | Play an audio cue (success, error, notification, complete, or custom) |
| `show_toast` | Show a toast notification (default, success, error, warning, info) |
| `show_notification` | Show a browser notification |
| `update_badge` | Update a badge/counter in the UI |
| `trigger_animation` | Trigger a visual animation (confetti, shake, pulse, bounce) |
| `custom` | Send any custom event with arbitrary data |

## Tool Definition

```typescript
interface ExtensionToolDefinition {
    name: string;              // Tool name (used in LLM tool calls)
    description: string;       // Description shown to the LLM
    parameters: ZodSchema;     // Zod schema for parameters
    execute: (params, ctx) => Promise<unknown>;  // Execution function
    scheduling?: "read" | "write";  // Concurrency mode (default: "read")
    modes?: AgentMode[];       // ["build"], ["plan"], or ["build", "plan"]
}
```

## Package Extensions

For more complex extensions, use a directory with `package.json`:

```
.zencode/extensions/my-package/
├── package.json
├── index.ts
└── lib/
    └── helpers.ts
```

```json
// package.json
{
    "name": "my-zencode-extension",
    "zencode": {
        "name": "my-extension",
        "description": "A useful extension",
        "extensions": ["index.ts"]
    }
}
```

## Managing Extensions

### Via tRPC API

```typescript
// List loaded extensions
const extensions = await trpc.extensions.list.query();

// Reload all extensions
await trpc.extensions.reload.mutate();

// Enable/disable an extension
await trpc.extensions.enable.mutate({ name: "my-extension" });
await trpc.extensions.disable.mutate({ name: "my-extension" });

// Check extension system status
const status = await trpc.extensions.status.query();
```

## Examples

See the `extensions/examples/` directory for complete examples:

- **hello-world.ts** — Minimal extension with a tool and event handlers
- **context-injector.ts** — Injects project-specific context from a file
- **web-search.ts** — Adds a web search tool (skeleton)
- **tool-guard.ts** — Blocks dangerous bash commands
- **memory.ts** — Persistent key-value memory across sessions
- **openai-provider.ts** — Adds OpenAI GPT models (GPT-4o, o3-mini)
- **anthropic-provider.ts** — Adds Anthropic Claude models (Sonnet, Opus, Haiku)
- **openrouter-provider.ts** — Access 200+ models via OpenRouter

## Tips

- Extensions are loaded once at startup and cached. Use the reload API to pick up changes.
- Extension tools override builtins if they share the same name — use this to customize default behavior.
- Use `scheduling: "read"` for tools that don't modify state (allows parallel execution).
- The `context` event fires before every LLM call — keep handlers fast.
- Check `extensions/examples/` for working code you can copy and modify.
