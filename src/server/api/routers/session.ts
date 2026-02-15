import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
    createSession,
    getSession,
    getAllSessions,
    deleteSession,
    deleteAllProjectSessions,
    getUIMessages,
    getMessageTimeline,
    deleteFromMessage,
    updateSessionRevert,
    getMessageSnapshot,
    searchSessions,
} from "../../db/database"; // Check import path
import * as Snapshot from "../../services/snapshot";

export const sessionRouter = createTRPCRouter({
    list: publicProcedure.query(() => {
        const sessions = getAllSessions(20);
        return sessions.map((s) => ({
            id: s.id,
            name: s.name,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            cwd: s.cwd,
        }));
    }),

    search: publicProcedure
        .input(z.object({ query: z.string() }))
        .query(({ input }) => {
            const sessions = searchSessions(input.query);
            return sessions.map((s) => ({
                id: s.id,
                name: s.name,
                createdAt: s.created_at,
                updatedAt: s.updated_at,
                cwd: s.cwd,
            }));
        }),

    create: publicProcedure
        .input(z.object({ name: z.string().optional() }))
        .mutation(({ input }) => {
            const session = createSession(input.name);
            return {
                id: session.id,
                name: session.name,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
                cwd: session.cwd,
            };
        }),

    clearProject: publicProcedure.mutation(() => {
        const count = deleteAllProjectSessions();
        return { success: true, count };
    }),

    get: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input }) => {
            const session = getSession(input.id);
            if (!session) {
                throw new Error("Session not found");
            }
            return {
                id: session.id,
                name: session.name,
                createdAt: session.created_at,
                updatedAt: session.updated_at,
                cwd: session.cwd,
            };
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => {
            const session = getSession(input.id);
            if (!session) {
                throw new Error("Session not found");
            }
            deleteSession(input.id);
            return { success: true };
        }),

    getMessages: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input }) => {
            const session = getSession(input.id);
            if (!session) {
                throw new Error("Session not found");
            }
            const messages = getUIMessages(input.id);
            return messages;
        }),

    getTimeline: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input }) => {
            const session = getSession(input.id);
            if (!session) {
                throw new Error("Session not found");
            }
            const entries = getMessageTimeline(input.id);
            return entries;
        }),

    revert: publicProcedure
        .input(
            z.object({
                id: z.string(),
                messageId: z.union([z.string(), z.number()]),
            }),
        )
        .mutation(async ({ input }) => {
            const rawMessageId = input.messageId;
            const messageId =
                typeof rawMessageId === "number"
                    ? rawMessageId
                    : Number(rawMessageId);

            const session = getSession(input.id);
            if (!session) {
                throw new Error("Session not found");
            }

            const targetSnapshot = getMessageSnapshot(input.id, messageId!);
            if (!targetSnapshot) {
                throw new Error("No snapshot available for this message");
            }

            try {
                const currentSnapshot = await Snapshot.track();
                const diff = await Snapshot.diff(currentSnapshot);

                await Snapshot.revertToCommit(targetSnapshot);

                updateSessionRevert(input.id, {
                    messageID: String(messageId),
                    snapshot: currentSnapshot,
                    diff: diff || undefined,
                });

                deleteFromMessage(input.id, messageId!);

                const messages = getUIMessages(input.id);
                return { success: true, messages };
            } catch (error) {
                console.error("[Revert Error]", error);
                throw new Error("Failed to revert files");
            }
        }),
});
