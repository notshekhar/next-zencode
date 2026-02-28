"use client";

import { api } from "../trpc/react";
import { useAtomValue } from "jotai";
import { selectedModelAtom, modelsAtom } from "@/store";
import { Sparkles } from "lucide-react";

export function StatusHealth() {
    const health = api.health.check.useQuery();
    const lsp = api.lsp.status.useQuery();

    const selectedModelId = useAtomValue(selectedModelAtom);
    const models = useAtomValue(modelsAtom);
    const selectedModel = models.find((m) => m.id === selectedModelId);

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 py-1 text-[10px] font-mono flex items-center gap-4 text-zinc-600 dark:text-zinc-400 z-40 shrink-0">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            health.data?.status === "ok"
                                ? "bg-green-500"
                                : "bg-red-500"
                        }`}
                    />
                    {selectedModel?.iconUrl && (
                        <img
                            src={selectedModel.iconUrl}
                            alt=""
                            className="absolute -top-1 -right-3 size-2.5 grayscale dark:invert dark:grayscale-0"
                        />
                    )}
                </div>
                <span>Server: {health.data?.status ?? "Checking..."}</span>
            </div>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

            <div>
                LSP:{" "}
                {lsp.data?.active.length
                    ? lsp.data.active.join(", ")
                    : "None active"}
                {lsp.data?.errors &&
                    Object.keys(lsp.data.errors).length > 0 && (
                        <span className="text-red-500 ml-2">
                            Errors: {Object.keys(lsp.data.errors).join(", ")}
                        </span>
                    )}
            </div>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

            <div>
                Project: {health.data?.projectName ?? "Loading..."}
                <span className="text-zinc-400 ml-1 opacity-70">
                    ({health.data?.projectPath ?? "..."})
                </span>
            </div>
        </div>
    );
}
