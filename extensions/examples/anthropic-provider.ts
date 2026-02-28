/**
 * Anthropic Provider Extension — adds Claude models to Zencode.
 *
 * Demonstrates:
 * - Registering a new AI provider
 * - Registering the full Claude model lineup
 *
 * To use:
 * 1. Install the Anthropic AI SDK: bun add @ai-sdk/anthropic
 * 2. Copy this file to .zencode/extensions/anthropic-provider.ts
 * 3. Set your Anthropic API key in Zencode settings
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";

const anthropicProvider: ExtensionFactory = async (api) => {
    let anthropic: any;
    try {
        const mod = await import("@ai-sdk/anthropic");
        anthropic = mod.anthropic;
    } catch {
        api.log("@ai-sdk/anthropic not installed — skipping Anthropic provider", "warn");
        return;
    }

    api.registerProvider({
        id: "anthropic",
        name: "Anthropic (Claude)",
        description: "Claude 4 Sonnet, Opus, and Haiku models",
        iconUrl: "https://models.dev/logos/anthropic.svg",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        apiKeyUrl: "https://console.anthropic.com/",
        createModel: (modelId, apiKey) => {
            if (apiKey && !process.env.ANTHROPIC_API_KEY) {
                process.env.ANTHROPIC_API_KEY = apiKey;
            }
            return anthropic(modelId);
        },
    });

    api.registerModel({
        id: "claude-4-sonnet",
        name: "Claude 4 Sonnet",
        providerModelId: "claude-sonnet-4-20250514",
        providerId: "anthropic",
        description: "Best balance of speed and intelligence",
        contextWindow: 200000,
        limitAttachments: false,
    });

    api.registerModel({
        id: "claude-4-opus",
        name: "Claude 4.6 Opus",
        providerModelId: "claude-opus-4-20250918",
        providerId: "anthropic",
        description: "Most capable model for complex reasoning",
        contextWindow: 200000,
        limitAttachments: false,
    });

    api.registerModel({
        id: "claude-4-haiku",
        name: "Claude 3.5 Haiku",
        providerModelId: "claude-3-5-haiku-20241022",
        providerId: "anthropic",
        description: "Fastest and most affordable Claude model",
        contextWindow: 200000,
        limitAttachments: false,
    });

    api.log("Anthropic provider registered with 3 models");
};

export default anthropicProvider;
