/**
 * Task Manager Tool for AI SDK (In-Memory)
 *
 * Allows the AI to manage a task list for its current session.
 * State is maintained in-memory and returned as JSON.
 */

import { tool } from "ai";
import { z } from "zod";
import { withToolScheduling } from "../services/toolExecutionScheduler";
import {
    getTasks,
    addTask,
    updateTask,
    clearTasks,
} from "../services/sessionState";

export const taskManager = tool({
    description:
        "Manage your session task list. Always returns the current full state of tasks.",
    inputSchema: z.object({
        action: z
            .enum(["add", "update", "list", "clear"])
            .describe("The action to perform"),
        task: z.string().optional().describe("The task description"),
        id: z.string().optional().describe("The task ID"),
        status: z
            .enum(["pending", "in_progress", "completed"])
            .optional()
            .describe("The status"),
    }),

    execute: async ({ action, task, id, status }) =>
        withToolScheduling("write", async () => {
            switch (action) {
                case "add":
                    if (task) {
                        addTask(task);
                    }
                    break;

                case "update":
                    if (id) {
                        updateTask(id, task, status as any);
                    }
                    break;

                case "clear":
                    clearTasks();
                    break;

                case "list":
                default:
                    break;
            }

            return { tasks: getTasks() };
        }),
});
