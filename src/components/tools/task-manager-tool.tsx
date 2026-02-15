"use client";

import { memo, useMemo } from "react";
import { ListChecks, Circle, CircleDot, CircleCheck } from "lucide-react";
import { ToolWrapper, type ToolPartState } from "./tool-wrapper";

const statusConfig = {
    pending: { icon: Circle, color: "text-muted-foreground", label: "Pending" },
    in_progress: {
        icon: CircleDot,
        color: "text-blue-400",
        label: "In Progress",
    },
    completed: { icon: CircleCheck, color: "text-emerald-500", label: "Done" },
} as const;

export const TaskManagerTool = memo(function TaskManagerTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        const action = part.input?.action;
        const task = part.input?.task;
        if (action === "add" && task)
            return `Add: ${task.length > 40 ? task.slice(0, 40) + "…" : task}`;
        if (action === "update") return `Update #${part.input?.id || ""}`;
        if (action === "clear") return "Clear all";
        if (action === "list") return "View tasks";
        return "Managing tasks...";
    }, [part.input]);

    const tasks = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return [];
        return part.output?.tasks || [];
    }, [part.output, part.state]);

    return (
        <ToolWrapper
            part={part}
            icon={ListChecks}
            label="Tasks"
            inputSummary={inputSummary}
            alwaysExpanded
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {tasks.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    {tasks.map(
                        (task: {
                            id: string;
                            task: string;
                            status: string;
                        }) => {
                            const cfg =
                                statusConfig[
                                    task.status as keyof typeof statusConfig
                                ] || statusConfig.pending;
                            const Icon = cfg.icon;
                            return (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                                >
                                    <Icon
                                        className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`}
                                    />
                                    <span
                                        className={
                                            task.status === "completed"
                                                ? "line-through text-muted-foreground"
                                                : "text-foreground"
                                        }
                                    >
                                        {task.task}
                                    </span>
                                </div>
                            );
                        },
                    )}
                </div>
            )}
            {part.state === "output-available" && tasks.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                    No tasks
                </span>
            )}
        </ToolWrapper>
    );
});
