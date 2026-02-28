import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
    initExtensions,
    reloadExtensions,
    getLoadedExtensions,
    isExtensionsInitialized,
    extensionRunner,
} from "@/mom/extensions";
import { configService } from "@/mom/services/configService";

async function ensureInitialized() {
    if (!isExtensionsInitialized()) {
        const extensionPaths = configService.getExtensionPaths();
        await initExtensions(process.cwd(), extensionPaths);
    }
}

export const extensionsRouter = createTRPCRouter({
    list: publicProcedure.query(async () => {
        await ensureInitialized();
        return extensionRunner.getSummary();
    }),

    reload: publicProcedure.mutation(async () => {
        const paths = configService.getExtensionPaths();
        const result = await reloadExtensions(process.cwd(), paths);
        return {
            loaded: result.loaded,
            errors: result.errors,
            extensions: extensionRunner.getSummary(),
        };
    }),

    enable: publicProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
            await ensureInitialized();
            const success = extensionRunner.enableExtension(input.name);
            if (!success) {
                throw new Error("Extension \"" + input.name + "\" not found");
            }
            configService.removeDisabledExtension(input.name);
            return { success: true };
        }),

    disable: publicProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
            await ensureInitialized();
            const success = extensionRunner.disableExtension(input.name);
            if (!success) {
                throw new Error("Extension \"" + input.name + "\" not found");
            }
            configService.addDisabledExtension(input.name);
            return { success: true };
        }),

    status: publicProcedure.query(async () => {
        await ensureInitialized();
        return {
            initialized: true,
            count: getLoadedExtensions().length,
            enabled: getLoadedExtensions().filter((e) => e.enabled).length,
        };
    }),

    paths: publicProcedure.query(() => {
        return {
            paths: configService.getExtensionPaths(),
            disabled: configService.getDisabledExtensions(),
        };
    }),

    addPath: publicProcedure
        .input(z.object({ path: z.string().min(1) }))
        .mutation(async ({ input }) => {
            configService.addExtensionPath(input.path);
            const paths = configService.getExtensionPaths();
            const result = await reloadExtensions(process.cwd(), paths);
            return {
                success: true,
                paths: configService.getExtensionPaths(),
                extensions: extensionRunner.getSummary(),
                loaded: result.loaded,
                errors: result.errors,
            };
        }),

    removePath: publicProcedure
        .input(z.object({ path: z.string().min(1) }))
        .mutation(async ({ input }) => {
            configService.removeExtensionPath(input.path);
            const paths = configService.getExtensionPaths();
            const result = await reloadExtensions(process.cwd(), paths);
            return {
                success: true,
                paths: configService.getExtensionPaths(),
                extensions: extensionRunner.getSummary(),
                loaded: result.loaded,
                errors: result.errors,
            };
        }),
});
