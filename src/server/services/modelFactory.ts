import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";
import { configService, type ProviderType } from "./configService";
import { getOllamaModels } from "./ollama.service";

import { DetailedModel } from "../shared/types";

const MODELS: DetailedModel[] = [
    {
        id: "gemini-3-flash",
        name: "Gemini 3 Flash",
        providerModelId: "gemini-3-flash-preview",
        provider: {
            id: "google",
            limitAttachments: true,
            limit: { context: 1000000 },
        },
        description: "Next-gen flash model from Google",
        iconUrl: "https://models.dev/logos/google.svg",
        isDefault: true,
    },
    {
        id: "gemini-3-pro",
        name: "Gemini 3 Pro",
        providerModelId: "gemini-3-pro-preview",
        provider: {
            id: "google",
            limitAttachments: true,
            limit: { context: 1000000 },
        },
        description: "Fast and efficient model from Google",
        iconUrl: "https://models.dev/logos/google.svg",
    },
    {
        id: "groq/gpt-oss-120b",
        name: "GPT OSS 120B",
        providerModelId: "openai/gpt-oss-120b",
        provider: {
            id: "groq",
            limitAttachments: false,
            limit: { context: 128000 },
        },
        description: "Open Source 120B model on Groq",
        iconUrl: "https://models.dev/logos/groq.svg",
    },
];

export async function getModel(modelId?: string): Promise<LanguageModel> {
    const ollamaUrl = configService.getProviderApiKey("ollama") || "http://localhost:11434";
    const ollamaModels = await getOllamaModels(ollamaUrl);
    const allModels = [...MODELS, ...ollamaModels];

    const model = modelId ? allModels.find((m) => m.id === modelId) : undefined;

    let selectedModel: DetailedModel;

    if (model) {
        selectedModel = model;
    } else {
        // Fallback to active provider's first model if no ID or ID not found
        const activeProvider = configService.getActiveProvider();
        selectedModel =
            allModels.find((m) => m.provider.id === activeProvider) || MODELS[0];
    }

    const providerId = selectedModel.provider.id as ProviderType;
    const apiKey = configService.getProviderApiKey(providerId);

    if (apiKey) {
        setProviderEnvKey(providerId, apiKey);
    }

    return createModelForProvider(selectedModel);
}

function setProviderEnvKey(provider: ProviderType, apiKey: string): void {
    const envKeyMap: Record<ProviderType, string> = {
        google: "GOOGLE_GENERATIVE_AI_API_KEY",
        openai: "OPENAI_API_KEY",
        anthropic: "ANTHROPIC_API_KEY",
        groq: "GROQ_API_KEY",
        ollama: "OLLAMA_BASE_URL",
    };

    const envKey = envKeyMap[provider];
    if (envKey && !process.env[envKey]) {
        process.env[envKey] = apiKey;
    }
}

function createModelForProvider(model: DetailedModel): LanguageModel {
    const provider = model.provider.id as ProviderType;
    const targetModelId = model.providerModelId;

    switch (provider) {
        case "google":
            return google(targetModelId);

        case "groq":
            return groq(targetModelId);

        case "openai":
            throw new Error("OpenAI provider not yet implemented");

        case "anthropic":
            throw new Error("Anthropic provider not yet implemented");

        case "ollama":
            const ollamaUrl = configService.getProviderApiKey("ollama") || "http://localhost:11434";
            const ollama = createOllama({ baseURL: ollamaUrl + "/api" });
            return ollama(targetModelId);

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export function isModelConfigured(): boolean {
    const provider = configService.getActiveProvider();
    if (provider === "ollama") return true;
    return configService.isProviderConfigured(provider);
}

export async function getModelInfo(modelId?: string): Promise<{
    provider: ProviderType;
    model: string;
    configured: boolean;
}> {
    const ollamaUrl = configService.getProviderApiKey("ollama") || "http://localhost:11434";
    const ollamaModels = await getOllamaModels(ollamaUrl);
    const allModels = [...MODELS, ...ollamaModels];
    
    const model = modelId ? allModels.find((m) => m.id === modelId) : undefined;
    const activeProvider = configService.getActiveProvider();

    const selectedModel =
        model ||
        allModels.find((m) => m.provider.id === activeProvider) ||
        MODELS[0];

    return {
        provider: selectedModel.provider.id as ProviderType,
        model: selectedModel.id,
        configured: selectedModel.provider.id === "ollama" ? true : configService.isProviderConfigured(
            selectedModel.provider.id as ProviderType,
        ),
    };
}

export async function getAllVisibleModels(): Promise<DetailedModel[]> {
    const ollamaUrl = configService.getProviderApiKey("ollama") || "http://localhost:11434";
    const ollamaModels = await getOllamaModels(ollamaUrl);
    // Prioritize configured models or active ones?
    // For now, just append Ollama models to the list
    return [...MODELS, ...ollamaModels];
}
