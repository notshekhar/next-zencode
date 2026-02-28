/**
 * OpenAI Provider Extension — adds GPT models to Zencode.
 *
 * Demonstrates:
 * - Registering a new AI provider via extension
 * - Registering multiple models under that provider
 * - Using the AI SDK's OpenAI integration
 *
 * To use:
 * 1. Install the OpenAI AI SDK: bun add @ai-sdk/openai
 * 2. Copy this file to .zencode/extensions/openai-provider.ts
 * 3. Set your OpenAI API key in Zencode settings
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";

const openaiProvider: ExtensionFactory = async (api) => {
    // Dynamically import — fails gracefully if @ai-sdk/openai isn't installed
    let openai: any;
    try {
        const mod = await import("@ai-sdk/openai");
        openai = mod.openai;
    } catch {
        api.log("@ai-sdk/openai not installed — skipping OpenAI provider", "warn");
        return;
    }

    api.registerProvider({
        id: "openai",
        name: "OpenAI",
        description: "GPT-4o, GPT-5 and other OpenAI models",
        iconUrl: "https://models.dev/logos/openai.svg",
        apiKeyEnvVar: "OPENAI_API_KEY",
        apiKeyUrl: "https://platform.openai.com/api-keys",
        createModel: (modelId, apiKey) => {
            if (apiKey && !process.env.OPENAI_API_KEY) {
                process.env.OPENAI_API_KEY = apiKey;
            }
            return openai(modelId);
        },
    });

    api.registerModel({
        id: "gpt-4o",
        name: "GPT-4o",
        providerModelId: "gpt-4o",
        providerId: "openai",
        description: "OpenAI's most capable multimodal model",
        contextWindow: 128000,
        limitAttachments: false,
    });

    api.registerModel({
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        providerModelId: "gpt-4o-mini",
        providerId: "openai",
        description: "Fast and affordable small model",
        contextWindow: 128000,
        limitAttachments: false,
    });

    api.registerModel({
        id: "o3-mini",
        name: "o3-mini",
        providerModelId: "o3-mini",
        providerId: "openai",
        description: "Reasoning model for complex tasks",
        contextWindow: 200000,
        limitAttachments: false,
    });

    api.log("OpenAI provider registered with 3 models");
};

export default openaiProvider;
