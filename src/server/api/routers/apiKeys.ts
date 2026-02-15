import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
    configService,
    PROVIDER_INFO,
    AVAILABLE_PROVIDERS,
    COMING_SOON_PROVIDERS,
    type ProviderType,
} from "../../services/configService";

export const apiKeysRouter = createTRPCRouter({
    /** Get all providers with their connection status */
    list: publicProcedure.query(() => {
        const providers = (
            Object.keys(PROVIDER_INFO) as ProviderType[]
        ).map((id) => ({
            id,
            name: PROVIDER_INFO[id].name,
            description: PROVIDER_INFO[id].description,
            urlHint: PROVIDER_INFO[id].urlHint,
            connected: configService.isProviderConfigured(id),
            available: AVAILABLE_PROVIDERS.includes(id),
            comingSoon: COMING_SOON_PROVIDERS.includes(id),
            apiKey: configService.getProviderApiKey(id),
        }));
        return { providers };
    }),

    /** Set API key for a provider */
    setKey: publicProcedure
        .input(
            z.object({
                provider: z.enum([
                    "google",
                    "openai",
                    "anthropic",
                    "ollama",
                    "groq",
                ]),
                apiKey: z.string().min(1),
            }),
        )
        .mutation(({ input }) => {
            configService.setProviderApiKey(
                input.provider as ProviderType,
                input.apiKey,
            );
            return { success: true };
        }),

    /** Remove API key for a provider */
    removeKey: publicProcedure
        .input(
            z.object({
                provider: z.enum([
                    "google",
                    "openai",
                    "anthropic",
                    "ollama",
                    "groq",
                ]),
            }),
        )
        .mutation(({ input }) => {
            const config = configService.load();
            const provider = input.provider as ProviderType;
            if (config.providers[provider]) {
                delete config.providers[provider]!.apiKey;
                config.providers[provider]!.enabled = false;
                configService.save(config);
            }
            return { success: true };
        }),
});
