import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { lspManager } from "../../services/lsp/index";

export const lspRouter = createTRPCRouter({
    status: publicProcedure.query(async () => {
        try {
            await lspManager.ensureScanned(process.cwd());
            const active = lspManager.getActiveLSPs();
            const errors = Object.fromEntries(lspManager.getConnectionErrors());
            return { active, errors };
        } catch (error) {
            console.error("[LSP Error]", error);
            throw new Error("Failed to get LSP status");
        }
    }),

    scan: publicProcedure.mutation(async () => {
        try {
            await lspManager.scanProject(process.cwd());
            const active = lspManager.getActiveLSPs();
            return { success: true, active };
        } catch (error) {
            console.error("[LSP Error]", error);
            throw new Error("Failed to scan project");
        }
    }),
});
