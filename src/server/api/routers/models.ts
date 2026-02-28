import {
    getAllVisibleModels,
    getRegisteredProviders,
} from "@/mom/services/modelFactory";
import {
    initExtensions,
    isExtensionsInitialized,
} from "@/mom/extensions";
import { configService } from "@/mom/services/configService";
import { createTRPCRouter, publicProcedure } from "../trpc";

async function ensureInitialized() {
    if (!isExtensionsInitialized()) {
        const extensionPaths = configService.getExtensionPaths();
        await initExtensions(process.cwd(), extensionPaths);
    }
}

export const modelsRouter = createTRPCRouter({
    list: publicProcedure.query(async () => {
        await ensureInitialized();
        const models = await getAllVisibleModels();
        return { models };
    }),

    providers: publicProcedure.query(async () => {
        await ensureInitialized();
        return { providers: getRegisteredProviders() };
    }),
});
