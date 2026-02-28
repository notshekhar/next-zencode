/**
 * OpenRouter Provider Extension — access 200+ models through one API key.
 *
 * Demonstrates:
 * - Using OpenAI-compatible APIs with custom base URLs
 * - Registering many models from a single provider
 *
 * OpenRouter gives you access to models from OpenAI, Anthropic, Google,
 * Meta, Mistral, and many more — all through one API key.
 *
 * To use:
 * 1. Install the OpenAI AI SDK: bun add @ai-sdk/openai
 * 2. Copy this file to .zencode/extensions/openrouter-provider.ts
 * 3. Get an API key from https://openrouter.ai/keys
 * 4. Set your OpenRouter key as the "openrouter" provider key in settings
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";

const openrouterProvider: ExtensionFactory = async (api) => {
    let createOpenAI: any;
    try {
        const mod = await import("@ai-sdk/openai");
        createOpenAI = mod.createOpenAI;
    } catch {
        api.log("@ai-sdk/openai not installed — skipping OpenRouter provider", "warn");
        return;
    }

    api.registerProvider({
        id: "openrouter",
        name: "OpenRouter",
        description: "Access 200+ models through one API key",
        iconUrl: "https://openrouter.ai/favicon.ico",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        apiKeyUrl: "https://openrouter.ai/keys",
        createModel: (modelId, apiKey) => {
            const openrouter = createOpenAI({
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: apiKey || process.env.OPENROUTER_API_KEY || "",
            });
            return openrouter(modelId);
        },
    });

    api.registerModel({
        id: "openrouter/claude-4-sonnet",
        name: "Claude 4 Sonnet (OpenRouter)",
        providerModelId: "anthropic/claude-sonnet-4-20250514",
        providerId: "openrouter",
        description: "Claude 4 Sonnet via OpenRouter",
        contextWindow: 200000,
    });

    api.registerModel({
        id: "openrouter/gpt-4o",
        name: "GPT-4o (OpenRouter)",
        providerModelId: "openai/gpt-4o",
        providerId: "openrouter",
        description: "GPT-4o via OpenRouter",
        contextWindow: 128000,
    });

    api.registerModel({
        id: "openrouter/deepseek-r1",
        name: "DeepSeek R1 (OpenRouter)",
        providerModelId: "deepseek/deepseek-r1",
        providerId: "openrouter",
        description: "DeepSeek's reasoning model via OpenRouter",
        contextWindow: 128000,
    });

    api.registerModel({
        id: "openrouter/llama-4-maverick",
        name: "Llama 4 Maverick (OpenRouter)",
        providerModelId: "meta-llama/llama-4-maverick",
        providerId: "openrouter",
        description: "Meta's Llama 4 Maverick via OpenRouter",
        contextWindow: 1000000,
    });

    api.log("OpenRouter provider registered with 4 models");
};

export default openrouterProvider;
