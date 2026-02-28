
import { DetailedModel } from "../shared/types";

export interface OllamaModelResponse {
    models: {
        name: string;
        model: string;
        modified_at: string;
        size: number;
        digest: string;
        details: {
            parent_model: string;
            format: string;
            family: string;
            families: string[];
            parameter_size: string;
            quantization_level: string;
        };
    }[];
}

export async function getOllamaModels(baseUrl: string = "http://localhost:11434"): Promise<DetailedModel[]> {
    try {
        // Ensure baseUrl has no trailing slash for consistency
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        const response = await fetch(`${cleanBaseUrl}/api/tags`);
        
        if (!response.ok) {
            console.warn(`Failed to fetch Ollama models: ${response.statusText}`);
            return [];
        }

        const data = (await response.json()) as OllamaModelResponse;
        
        return data.models.map((model) => ({
            id: `ollama/${model.name}`,
            name: model.name,
            providerModelId: model.model,
            provider: {
                id: "ollama",
                limitAttachments: false, // Ollama models (like LLaVA) can support images, but generic safe default
                limit: { context: 4096 }, // Default, though many support more
            },
            description: `Ollama model: ${model.name} (${model.details.parameter_size})`,
            iconUrl: "https://ollama.com/public/ollama.png", // Using a generic Ollama icon or similar
        }));
    } catch {
        return [];
    }
}
