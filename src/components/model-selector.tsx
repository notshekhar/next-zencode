"use client";

import { useAtom, useSetAtom } from "jotai";
import {
    selectedModelAtom,
    modelsAtom,
    modelsLoadingAtom,
    modelsErrorAtom,
    modelsInitializedAtom,
} from "@/store";
import { useEffect } from "react";
import { api } from "@/trpc/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ModelSelector({ disabled }: { disabled?: boolean }) {
    const [selectedModelId, setSelectedModelId] = useAtom(selectedModelAtom);
    const setModels = useSetAtom(modelsAtom);
    const setModelsLoading = useSetAtom(modelsLoadingAtom);
    const setModelsError = useSetAtom(modelsErrorAtom);
    const setModelsInitialized = useSetAtom(modelsInitializedAtom);

    const { data, isLoading, error } = api.models.list.useQuery();

    useEffect(() => {
        setModelsLoading(isLoading);
        if (data?.models) {
            setModels(data.models);
            setModelsInitialized(true);

            // Set default model if none selected
            if (!selectedModelId && data.models.length > 0) {
                setSelectedModelId(data.models[0].id);
            }
        }
        if (error) {
            setModelsError(error);
        }
    }, [
        data,
        isLoading,
        error,
        setModels,
        setModelsLoading,
        setModelsError,
        setModelsInitialized,
        selectedModelId,
        setSelectedModelId,
    ]);

    const models = data?.models || [];
    const selectedModel = models.find((m) => m.id === selectedModelId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 h-8 px-2">
                <Skeleton className="size-3.5 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <ChevronDown className="size-3 text-muted-foreground/30 shrink-0" />
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="gap-2 h-8 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        {selectedModel?.iconUrl ? (
                            <img
                                src={selectedModel.iconUrl}
                                alt=""
                                className="size-3.5 shrink-0 grayscale brightness-110 contrast-125 dark:invert dark:grayscale-0 dark:brightness-100 dark:contrast-100"
                            />
                        ) : (
                            <Sparkles className="size-3.5 text-primary shrink-0" />
                        )}
                        <span className="text-xs font-medium truncate">
                            {selectedModel?.name || "Select Model"}
                        </span>
                    </div>
                    <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] p-1">
                {models.map((model) => (
                    <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 cursor-pointer rounded-md"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {model.iconUrl ? (
                                <img
                                    src={model.iconUrl}
                                    alt=""
                                    className="size-4 shrink-0 grayscale dark:invert dark:grayscale-0"
                                />
                            ) : (
                                <Sparkles className="size-4 text-primary shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium">
                                    {model.name}
                                </span>
                                {model.description && (
                                    <span className="text-[10px] text-muted-foreground truncate">
                                        {model.description}
                                    </span>
                                )}
                            </div>
                        </div>
                        {selectedModelId === model.id && (
                            <Check className="size-3.5 text-primary shrink-0" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
