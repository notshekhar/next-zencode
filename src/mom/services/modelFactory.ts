import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModel } from "ai";
import { configService, type ProviderType } from "./configService";
import { getOllamaModels } from "./ollama.service";
import type { DetailedModel } from "../shared/types";
import type {
    ExtensionProviderConfig,
    ExtensionModelConfig,
} from "../extensions/types";

// ─── Provider Registry ───────────────────────────────────────────────────────

interface RegisteredProvider {
    config: ExtensionProviderConfig;
    source: "builtin" | "extension";
}

const providerRegistry = new Map<string, RegisteredProvider>();
const extensionModels: ExtensionModelConfig[] = [];

/**
 * Register a provider. Extensions call this to add new AI connectors.
 * Builtin providers are registered at module load time.
 */
export function registerProvider(
    config: ExtensionProviderConfig,
    source: "builtin" | "extension" = "extension",
): void {
    providerRegistry.set(config.id, { config, source });
}

/**
 * Unregister a provider.
 */
export function unregisterProvider(id: string): void {
    const entry = providerRegistry.get(id);
    if (entry && entry.source === "extension") {
        providerRegistry.delete(id);
    }
}

/**
 * Register a model under an existing provider.
 */
export function registerModel(config: ExtensionModelConfig): void {
    const existing = extensionModels.findIndex((m) => m.id === config.id);
    if (existing >= 0) {
        extensionModels[existing] = config;
    } else {
        extensionModels.push(config);
    }
}

/**
 * Get all registered providers.
 */
export function getRegisteredProviders(): Array<{
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    source: "builtin" | "extension";
}> {
    return Array.from(providerRegistry.values()).map((p) => ({
        id: p.config.id,
        name: p.config.name,
        description: p.config.description,
        iconUrl: p.config.iconUrl,
        source: p.source,
    }));
}

// ─── Builtin Providers ───────────────────────────────────────────────────────

registerProvider(
    {
        id: "google",
        name: "Google (Gemini)",
        description: "Google's Gemini AI models",
        iconUrl: "https://models.dev/logos/google.svg",
        apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
        apiKeyUrl: "https://aistudio.google.com/apikey",
        createModel: (modelId, apiKey) => {
            if (apiKey) setEnvIfMissing("GOOGLE_GENERATIVE_AI_API_KEY", apiKey);
            return google(modelId);
        },
    },
    "builtin",
);

registerProvider(
    {
        id: "groq",
        name: "Groq",
        description: "Ultra-fast Llama 3 models",
        iconUrl: "https://models.dev/logos/groq.svg",
        apiKeyEnvVar: "GROQ_API_KEY",
        apiKeyUrl: "https://console.groq.com/keys",
        createModel: (modelId, apiKey) => {
            if (apiKey) setEnvIfMissing("GROQ_API_KEY", apiKey);
            return groq(modelId);
        },
    },
    "builtin",
);

registerProvider(
    {
        id: "ollama",
        name: "Ollama (Local)",
        description: "Run models locally with Ollama",
        iconUrl: "https://ollama.ai/public/ollama.png",
        apiKeyUrl: "https://ollama.ai",
        createModel: (modelId, apiKey) => {
            const baseURL = (apiKey || "http://localhost:11434") + "/api";
            const ollama = createOllama({ baseURL });
            return ollama(modelId);
        },
    },
    "builtin",
);

// ─── Builtin Models ──────────────────────────────────────────────────────────

const BUILTIN_MODELS: DetailedModel[] = [
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setEnvIfMissing(key: string, value: string): void {
    if (!process.env[key]) {
        process.env[key] = value;
    }
}

function extensionModelToDetailed(m: ExtensionModelConfig): DetailedModel {
    const provider = providerRegistry.get(m.providerId);
    return {
        id: m.id,
        name: m.name,
        providerModelId: m.providerModelId,
        provider: {
            id: m.providerId,
            limitAttachments: m.limitAttachments ?? false,
            limit: { context: m.contextWindow ?? 128000 },
        },
        description: m.description,
        iconUrl: provider?.config.iconUrl,
        isDefault: m.isDefault,
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getModel(modelId?: string): Promise<LanguageModel> {
    const allModels = await getAllVisibleModels();

    const model = modelId
        ? allModels.find((m) => m.id === modelId)
        : undefined;

    let selectedModel: DetailedModel;

    if (model) {
        selectedModel = model;
    } else {
        const activeProvider = configService.getActiveProvider();
        selectedModel =
            allModels.find((m) => m.provider.id === activeProvider) ||
            BUILTIN_MODELS[0];
    }

    return createModelForProvider(selectedModel);
}

function createModelForProvider(model: DetailedModel): LanguageModel {
    const providerId = model.provider.id;
    const apiKey = configService.getProviderApiKey(providerId as ProviderType);

    const registered = providerRegistry.get(providerId);
    if (registered) {
        return registered.config.createModel(model.providerModelId, apiKey);
    }

    throw new Error("Unknown provider: " + providerId + ". Install an extension that registers this provider.");
}

export function isModelConfigured(): boolean {
    const provider = configService.getActiveProvider();
    if (provider === "ollama") return true;

    if (providerRegistry.has(provider)) {
        return configService.isProviderConfigured(provider);
    }

    return configService.isProviderConfigured(provider);
}

export async function getModelInfo(modelId?: string): Promise<{
    provider: string;
    model: string;
    configured: boolean;
}> {
    const allModels = await getAllVisibleModels();

    const model = modelId
        ? allModels.find((m) => m.id === modelId)
        : undefined;
    const activeProvider = configService.getActiveProvider();

    const selectedModel =
        model ||
        allModels.find((m) => m.provider.id === activeProvider) ||
        BUILTIN_MODELS[0];

    return {
        provider: selectedModel.provider.id,
        model: selectedModel.id,
        configured:
            selectedModel.provider.id === "ollama"
                ? true
                : configService.isProviderConfigured(
                      selectedModel.provider.id as ProviderType,
                  ),
    };
}

export async function getAllVisibleModels(): Promise<DetailedModel[]> {
    const ollamaUrl =
        configService.getProviderApiKey("ollama") || "http://localhost:11434";
    const ollamaModels = await getOllamaModels(ollamaUrl);

    const extModels = extensionModels.map(extensionModelToDetailed);

    return [...BUILTIN_MODELS, ...ollamaModels, ...extModels];
}
