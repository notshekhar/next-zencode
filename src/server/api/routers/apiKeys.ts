import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
    configService,
    PROVIDER_INFO,
    type ProviderType,
} from "@/mom/services/configService";
import { getRegisteredProviders } from "@/mom/services/modelFactory";

export const apiKeysRouter = createTRPCRouter({
    list: publicProcedure.query(() => {
        const registeredProviders = getRegisteredProviders();
        const registeredIds = new Set(registeredProviders.map((p) => p.id));

        const providers: Array<{
            id: string;
            name: string;
            description: string;
            urlHint: string;
            connected: boolean;
            available: boolean;
            comingSoon: boolean;
            apiKey?: string;
        }> = [];

        for (const id of Object.keys(PROVIDER_INFO) as ProviderType[]) {
            const info = PROVIDER_INFO[id];
            const isRegistered = registeredIds.has(id);
            providers.push({
                id,
                name: info.name,
                description: info.description,
                urlHint: info.urlHint,
                connected: configService.isProviderConfigured(id),
                available: isRegistered,
                comingSoon: !isRegistered,
                apiKey: configService.getProviderApiKey(id),
            });
        }

        for (const rp of registeredProviders) {
            if (PROVIDER_INFO[rp.id as ProviderType]) continue;

            const apiKey = configService.getProviderApiKey(rp.id as ProviderType);
            providers.push({
                id: rp.id,
                name: rp.name,
                description: rp.description || "Added by extension",
                urlHint: "",
                connected: !!apiKey,
                available: true,
                comingSoon: false,
                apiKey,
            });
        }

        return { providers };
    }),

    setKey: publicProcedure
        .input(
            z.object({
                provider: z.string().min(1),
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

    removeKey: publicProcedure
        .input(
            z.object({
                provider: z.string().min(1),
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
