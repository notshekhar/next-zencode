"use client";

import { useState } from "react";
import { Plug, Check, ExternalLink, Eye, EyeOff, Loader2, Trash2, ArrowLeft, Key, ShieldCheck } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { toast } from "sonner";

export default function ApiKeysPage() {
    const router = useRouter();
    const { data, isLoading, refetch } = api.apiKeys.list.useQuery();
    
    const setKeyMutation = api.apiKeys.setKey.useMutation({
        onSuccess: () => {
            refetch();
            toast.success("API key saved successfully");
        },
        onError: (err) => {
            toast.error(`Failed to save key: ${err.message}`);
        }
    });
    
    const removeKeyMutation = api.apiKeys.removeKey.useMutation({
        onSuccess: () => {
            refetch();
            toast.success("API key removed");
        },
        onError: (err) => {
            toast.error(`Failed to remove key: ${err.message}`);
        }
    });

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="flex items-start gap-4 mb-8">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="rounded-full shrink-0 -ml-2"
                >
                    <ArrowLeft className="h-10 w-10" />
                </Button>
                <div className="pt-1">
                    <h1 className="text-3xl font-bold tracking-tight">API Settings</h1>
                </div>
            </div>

            <div className="grid gap-8">
                <section>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        <Key className="h-4 w-4" />
                        Available Providers
                    </div>
                    
                    <div className="grid gap-4 grid-cols-1">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-48 rounded-2xl border bg-muted/20 animate-pulse" />
                            ))
                        ) : (
                            data?.providers.map((provider) => (
                                <ProviderCard
                                    key={provider.id}
                                    provider={provider}
                                    onSetKey={(apiKey) =>
                                        setKeyMutation.mutate({
                                            provider: provider.id as any,
                                            apiKey,
                                        })
                                    }
                                    onRemoveKey={() =>
                                        removeKeyMutation.mutate({
                                            provider: provider.id as any,
                                        })
                                    }
                                    isSaving={setKeyMutation.isPending}
                                />
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border bg-zinc-50 dark:bg-zinc-900 dark:opacity-50 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-secondary rounded-lg shrink-0">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Your Privacy & Security</h3>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                Your API keys are stored locally on your machine and are never sent to our servers. 
                                We only use them to communicate directly with the AI providers from your browser or 
                                local server. We recommend using keys with usage limits for added security.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
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

    const handleSave = () => {
        if (apiKey.trim()) {
            onSetKey(apiKey.trim());
            setApiKey("");
            setEditing(false);
        }
    };

    const handleEdit = () => {
        setApiKey(provider.apiKey || "");
        setEditing(true);
    };

    const urlMatch = provider.urlHint.match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0] : undefined;

    return (
        <motion.div
            layout
            className={`group relative flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                provider.comingSoon
                    ? "opacity-60 pointer-events-none grayscale"
                    : provider.connected
                      ? "border-primary opacity-100 bg-secondary shadow-sm"
                      : "border-border hover:border-zinc-400 dark:hover:border-zinc-500 bg-background"
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold">{provider.name}</h3>
                        {provider.comingSoon ? (
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Coming Soon
                            </span>
                        ) : provider.connected ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-secondary px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                <Check className="h-2.5 w-2.5" />
                                Connected
                            </div>
                        ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mr-8">
                        {provider.description}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {url && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </Button>
                    )}
                    {provider.connected && !editing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive"
                            onClick={() => onRemoveKey()}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-2">
                {!provider.connected || editing ? (
                    <div className="flex flex-col gap-3">
                        <div className="relative group/input">
                            <Input
                                type={showKey ? "text" : "password"}
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                className="h-10 text-sm pr-10 rounded-xl bg-background border-zinc-200 dark:border-zinc-800 transition-all focus:ring-2 focus:ring-primary"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowKey(!showKey)}
                            >
                                {showKey ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            {editing && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setEditing(false);
                                        setApiKey("");
                                    }}
                                    className="flex-1 rounded-xl h-9 text-sm"
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button
                                onClick={handleSave}
                                disabled={!apiKey.trim() || isSaving}
                                className={`rounded-xl h-9 text-sm font-medium ${editing ? 'flex-1' : 'w-full'}`}
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    provider.connected ? "Update Key" : "Connect Provider"
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-3 bg-zinc-100 dark:bg-zinc-800 p-2 pl-4 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group/key">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Key</span>
                            <code className="text-xs font-mono opacity-60">
                                {provider.apiKey?.slice(0, 8)}••••••••{provider.apiKey?.slice(-4)}
                            </code>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-semibold px-4"
                            onClick={handleEdit}
                        >
                            Modify
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
