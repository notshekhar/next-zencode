"use client";

import { useState, useCallback } from "react";
import { Plug, Check, ExternalLink, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function ConnectButton() {
    const [open, setOpen] = useState(false);
    const { data, isLoading, refetch } = api.apiKeys.list.useQuery(undefined, {
        enabled: open,
    });
    const setKeyMutation = api.apiKeys.setKey.useMutation({
        onSuccess: () => refetch(),
    });
    const removeKeyMutation = api.apiKeys.removeKey.useMutation({
        onSuccess: () => refetch(),
    });

    const connectedCount = data?.providers.filter((p) => p.connected).length ?? 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Plug className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Connect</span>
                            {connectedCount > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                                    {connectedCount}
                                </span>
                            )}
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Connect API providers</TooltipContent>
            </Tooltip>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Connect Providers</DialogTitle>
                    <DialogDescription>
                        Add your API keys to enable AI providers.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 mt-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        data?.providers.map((provider) => (
                            <ProviderCard
                                key={provider.id}
                                provider={provider}
                                onSetKey={(apiKey) =>
                                    setKeyMutation.mutate({
                                        provider: provider.id as "google" | "openai" | "anthropic" | "ollama",
                                        apiKey,
                                    })
                                }
                                onRemoveKey={() =>
                                    removeKeyMutation.mutate({
                                        provider: provider.id as "google" | "openai" | "anthropic" | "ollama",
                                    })
                                }
                                isSaving={setKeyMutation.isPending}
                            />
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ProviderCard({
    provider,
    onSetKey,
    onRemoveKey,
    isSaving,
}: {
    provider: {
        id: string;
        name: string;
        description: string;
        urlHint: string;
        connected: boolean;
        available: boolean;
        comingSoon: boolean;
        apiKey?: string;
    };
    onSetKey: (key: string) => void;
    onRemoveKey: () => void;
    isSaving: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);

    const handleSave = useCallback(() => {
        if (apiKey.trim()) {
            onSetKey(apiKey.trim());
            setApiKey("");
            setEditing(false);
        }
    }, [apiKey, onSetKey]);

    const handleEdit = () => {
        setApiKey(provider.apiKey || "");
        setEditing(true);
    };

    // Extract URL from urlHint
    const urlMatch = provider.urlHint.match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0] : undefined;

    return (
        <div
            className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
                provider.comingSoon
                    ? "opacity-50 pointer-events-none"
                    : provider.connected
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted-foreground"
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{provider.name}</span>
                    {provider.comingSoon && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            SOON
                        </span>
                    )}
                    {provider.connected && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                    {provider.connected && !editing && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveKey()}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                {provider.description}
            </p>
            
            {provider.connected && !editing && provider.apiKey && (
                <div className="text-[10px] text-muted-foreground font-mono bg-background opacity-20 px-1.5 py-0.5 rounded w-fit">
                    {provider.apiKey.slice(0, 3)}...{provider.apiKey.slice(-4)}
                </div>
            )}

            {!provider.connected || editing ? (
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <Input
                            type={showKey ? "text" : "password"}
                            placeholder="Enter API key..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            className="h-8 text-xs pr-8"
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowKey(!showKey)}
                        >
                            {showKey ? (
                                <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                                <Eye className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                    <div className="flex justify-end gap-2">
                        {editing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                    setEditing(false);
                                    setApiKey("");
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleSave}
                            disabled={!apiKey.trim() || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs w-fit"
                    onClick={handleEdit}
                >
                    Update key
                </Button>
            )}
        </div>
    );
}
