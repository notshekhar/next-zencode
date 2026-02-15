import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { configService, type ProviderType } from "./configService";

import { DetailedModel } from "../shared/types";

const MODEL_CONFIGS: Record<ProviderType, DetailedModel> = {
    google: {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        provider: {
            id: "google",
            attachment: true,
            limit: { context: 1000000 },
        },
        description: "Fast and efficient model from Google",
        iconUrl: "https://models.dev/logos/google.svg",
    },
    openai: {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: {
            id: "openai",
            attachment: true,
            limit: { context: 128000 },
        },
        description: "Most capable model from OpenAI",
        iconUrl: "https://models.dev/logos/openai.svg",
    },
    anthropic: {
        id: "claude-opus-4.5",
        name: "Claude Opus 4.5",
        provider: {
            id: "anthropic",
            attachment: true,
            limit: { context: 200000 },
        },
        description: "High-intelligence model from Anthropic",
        iconUrl: "https://models.dev/logos/anthropic.svg",
    },
    ollama: {
        id: "llama3.2",
        name: "Llama 3.2",
        provider: {
            id: "ollama",
            attachment: false,
            limit: { context: 32000 },
        },
        description: "Local model running via Ollama",
        iconUrl: "https://models.dev/logos/llama.svg",
    },
};

export function getModel(): LanguageModel {
    const provider = configService.getActiveProvider();
    const apiKey = configService.getProviderApiKey(provider);

    if (apiKey) {
        setProviderEnvKey(provider, apiKey);
    }

    return createModelForProvider(provider);
}

function setProviderEnvKey(provider: ProviderType, apiKey: string): void {
    const envKeyMap: Record<ProviderType, string> = {
        google: "GOOGLE_GENERATIVE_AI_API_KEY",
        openai: "OPENAI_API_KEY",
        anthropic: "ANTHROPIC_API_KEY",
        ollama: "OLLAMA_BASE_URL",
    };

    const envKey = envKeyMap[provider];
    if (envKey && !process.env[envKey]) {
        process.env[envKey] = apiKey;
    }
}

function createModelForProvider(provider: ProviderType): LanguageModel {
    const config = MODEL_CONFIGS[provider];

    switch (provider) {
        case "google":
            return google(config.id);

        case "openai":
            throw new Error("OpenAI provider not yet implemented");

        case "anthropic":
            throw new Error("Anthropic provider not yet implemented");

        case "ollama":
            throw new Error("Ollama provider not yet implemented");

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export function isModelConfigured(): boolean {
    const provider = configService.getActiveProvider();
    return configService.isProviderConfigured(provider);
}

export function getModelInfo(): {
    provider: ProviderType;
    model: string;
    configured: boolean;
} {
    const provider = configService.getActiveProvider();
    const config = MODEL_CONFIGS[provider];

    return {
        provider,
        model: config.id,
        configured: configService.isProviderConfigured(provider),
    };
}

export function getAllVisibleModels(): DetailedModel[] {
    return Object.values(MODEL_CONFIGS);
}
