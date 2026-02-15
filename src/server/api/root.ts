import { createTRPCRouter } from "./trpc";
import { modelsRouter } from "./routers/models";
import { sessionRouter } from "./routers/session";
import { filesRouter } from "./routers/files";
import { skillsRouter } from "./routers/skills";
import { permissionsRouter } from "./routers/permissions";
import { lspRouter } from "./routers/lsp";
import { upgradeRouter } from "./routers/upgrade";
import { healthRouter } from "./routers/health";

export const appRouter = createTRPCRouter({
    health: healthRouter,
    models: modelsRouter,
    session: sessionRouter,
    files: filesRouter,
    skills: skillsRouter,
    permissions: permissionsRouter,
    lsp: lspRouter,
    upgrade: upgradeRouter,
});

export type AppRouter = typeof appRouter;
