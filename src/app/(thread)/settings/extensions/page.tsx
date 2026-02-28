"use client";

import { useState } from "react";
import {
    ArrowLeft,
    Puzzle,
    FolderPlus,
    Trash2,
    RefreshCw,
    Power,
    PowerOff,
    Wrench,
    Zap,
    AlertTriangle,
    Cpu,
    Layers,
    Folder,
    Loader2,
    Check,
} from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ExtensionsPage() {
    const router = useRouter();

    const {
        data: extensions,
        isLoading: extensionsLoading,
        refetch: refetchExtensions,
    } = api.extensions.list.useQuery();

    const {
        data: pathsData,
        isLoading: pathsLoading,
        refetch: refetchPaths,
    } = api.extensions.paths.useQuery();

    const { data: status } = api.extensions.status.useQuery();

    const reloadMutation = api.extensions.reload.useMutation({
        onSuccess: (data) => {
            refetchExtensions();
            refetchPaths();
            toast.success(
                "Reloaded: " + data.loaded + " extension(s) loaded" +
                (data.errors > 0 ? ", " + data.errors + " error(s)" : ""),
            );
        },
        onError: (err) => toast.error("Reload failed: " + err.message),
    });

    const enableMutation = api.extensions.enable.useMutation({
        onSuccess: () => {
            refetchExtensions();
            toast.success("Extension enabled");
        },
        onError: (err) => toast.error(err.message),
    });

    const disableMutation = api.extensions.disable.useMutation({
        onSuccess: () => {
            refetchExtensions();
            toast.success("Extension disabled");
        },
        onError: (err) => toast.error(err.message),
    });

    const addPathMutation = api.extensions.addPath.useMutation({
        onSuccess: (data) => {
            refetchExtensions();
            refetchPaths();
            toast.success(
                "Path added — " + data.loaded + " extension(s) loaded",
            );
        },
        onError: (err) => toast.error(err.message),
    });

    const removePathMutation = api.extensions.removePath.useMutation({
        onSuccess: (data) => {
            refetchExtensions();
            refetchPaths();
            toast.success("Path removed");
        },
        onError: (err) => toast.error(err.message),
    });

    const [newPath, setNewPath] = useState("");

    const handleAddPath = () => {
        const trimmed = newPath.trim();
        if (!trimmed) return;
        addPathMutation.mutate({ path: trimmed });
        setNewPath("");
    };

    const isLoading = extensionsLoading || pathsLoading;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full shrink-0 -ml-2"
                >
                    <ArrowLeft className="h-10 w-10" />
                </Button>
                <div className="pt-1 flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Extensions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage plugins that add tools, AI providers, and
                        lifecycle hooks to Zencode.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0 mt-1"
                    onClick={() => reloadMutation.mutate()}
                    disabled={reloadMutation.isPending}
                >
                    <RefreshCw
                        className={
                            "h-3.5 w-3.5" +
                            (reloadMutation.isPending ? " animate-spin" : "")
                        }
                    />
                    Reload
                </Button>
            </div>

            <div className="grid gap-8">
                {/* Status bar */}
                {status && (
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div
                                className={
                                    "h-2 w-2 rounded-full " +
                                    (status.initialized
                                        ? "bg-green-500"
                                        : "bg-zinc-400")
                                }
                            />
                            {status.initialized
                                ? "Extension system active"
                                : "Not initialized"}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Puzzle className="h-3.5 w-3.5" />
                            {status.count} loaded
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Power className="h-3.5 w-3.5" />
                            {status.enabled} enabled
                        </div>
                    </div>
                )}

                {/* Extension Paths */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        <Folder className="h-4 w-4" />
                        Extension Paths
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                        Extensions are auto-discovered from{" "}
                        <code className="px-1.5 py-0.5 bg-muted rounded text-[11px]">
                            .zencode/extensions/
                        </code>{" "}
                        and{" "}
                        <code className="px-1.5 py-0.5 bg-muted rounded text-[11px]">
                            ~/.config/zencode/extensions/
                        </code>
                        . Add more paths below.
                    </p>

                    <div className="space-y-2">
                        {/* Default paths (non-removable) */}
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted opacity-80">
                            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                            <code className="text-xs flex-1 truncate text-muted-foreground">
                                .zencode/extensions/
                            </code>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Default
                            </span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted opacity-80">
                            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                            <code className="text-xs flex-1 truncate text-muted-foreground">
                                ~/.config/zencode/extensions/
                            </code>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Global
                            </span>
                        </div>

                        {/* Custom paths */}
                        <AnimatePresence>
                            {pathsData?.paths.map((p) => (
                                <motion.div
                                    key={p}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-background group"
                                >
                                    <FolderPlus className="h-4 w-4 text-primary shrink-0" />
                                    <code className="text-xs flex-1 truncate">
                                        {p}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive transition-all"
                                        onClick={() =>
                                            removePathMutation.mutate({
                                                path: p,
                                            })
                                        }
                                        disabled={removePathMutation.isPending}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Add new path */}
                        <div className="flex gap-2 pt-2">
                            <Input
                                placeholder="/path/to/extensions or relative/path"
                                value={newPath}
                                onChange={(e) => setNewPath(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && handleAddPath()
                                }
                                className="h-10 text-sm rounded-xl flex-1"
                            />
                            <Button
                                onClick={handleAddPath}
                                disabled={
                                    !newPath.trim() ||
                                    addPathMutation.isPending
                                }
                                className="rounded-xl h-10 px-4 gap-2"
                            >
                                {addPathMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FolderPlus className="h-4 w-4" />
                                )}
                                Add Path
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Loaded Extensions */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        <Puzzle className="h-4 w-4" />
                        Loaded Extensions
                    </div>

                    {isLoading ? (
                        <div className="grid gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-28 rounded-2xl border bg-muted animate-pulse opacity-20"
                                />
                            ))}
                        </div>
                    ) : !extensions || extensions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-8 text-center">
                            <Puzzle className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No extensions loaded yet.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Drop a <code>.ts</code> file into{" "}
                                <code>.zencode/extensions/</code> and hit
                                Reload.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <AnimatePresence>
                                {extensions.map((ext) => (
                                    <ExtensionCard
                                        key={ext.name}
                                        ext={ext}
                                        onEnable={() =>
                                            enableMutation.mutate({
                                                name: ext.name,
                                            })
                                        }
                                        onDisable={() =>
                                            disableMutation.mutate({
                                                name: ext.name,
                                            })
                                        }
                                        isToggling={
                                            enableMutation.isPending ||
                                            disableMutation.isPending
                                        }
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </section>

                {/* Info */}
                <section className="rounded-2xl border bg-zinc-50 dark:bg-zinc-900 dark:opacity-60 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-secondary rounded-lg shrink-0">
                            <Puzzle className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">
                                Writing Extensions
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                Extensions are TypeScript files that
                                default-export a factory function. They can
                                register AI tools, add new model providers
                                (OpenAI, Anthropic, etc.), hook into agent
                                lifecycle events, and even trigger frontend UI
                                actions like sounds and toasts. See the{" "}
                                <code className="px-1 py-0.5 bg-muted rounded text-[11px]">
                                    extensions/examples/
                                </code>{" "}
                                directory for templates.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function ExtensionCard({
    ext,
    onEnable,
    onDisable,
    isToggling,
}: {
    ext: {
        name: string;
        path: string;
        enabled: boolean;
        toolCount: number;
        eventCount: number;
        providerCount: number;
        modelCount: number;
        bundled: boolean;
        description?: string;
        loadError?: string;
    };
    onEnable: () => void;
    onDisable: () => void;
    isToggling: boolean;
}) {
    const hasError = !!ext.loadError;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={
                "group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-300 " +
                (hasError
                    ? "border-destructive bg-muted"
                    : ext.enabled
                      ? "border-primary bg-secondary shadow-sm"
                      : "border-border bg-background opacity-60")
            }
        >
            {/* Top row */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold truncate">{ext.name}</h3>
                        {ext.bundled && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-accent px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                                <Puzzle className="h-2.5 w-2.5" />
                                Bundled
                            </span>
                        )}
                        {hasError ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-destructive bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Error
                            </span>
                        ) : ext.enabled ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-accent px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                                <Check className="h-2.5 w-2.5" />
                                Active
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                                Disabled
                            </span>
                        )}
                    </div>
                    {ext.description && (
                        <p className="text-xs text-muted-foreground">
                            {ext.description}
                        </p>
                    )}
                    <code className="text-[11px] text-muted-foreground opacity-60 truncate">
                        {ext.path}
                    </code>
                </div>

                <Button
                    variant={ext.enabled ? "outline" : "default"}
                    size="sm"
                    className="rounded-xl h-8 px-3 gap-1.5 text-xs font-semibold shrink-0 ml-4"
                    onClick={ext.enabled ? onDisable : onEnable}
                    disabled={isToggling || hasError}
                >
                    {ext.enabled ? (
                        <>
                            <PowerOff className="h-3 w-3" /> Disable
                        </>
                    ) : (
                        <>
                            <Power className="h-3 w-3" /> Enable
                        </>
                    )}
                </Button>
            </div>

            {/* Error message */}
            {hasError && (
                <div className="text-xs text-destructive bg-muted rounded-lg p-3 font-mono">
                    {ext.loadError}
                </div>
            )}

            {/* Stats row */}
            {!hasError && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    {ext.toolCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Wrench className="h-3 w-3" />
                            {ext.toolCount}{" "}
                            {ext.toolCount === 1 ? "tool" : "tools"}
                        </div>
                    )}
                    {ext.eventCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3" />
                            {ext.eventCount}{" "}
                            {ext.eventCount === 1 ? "hook" : "hooks"}
                        </div>
                    )}
                    {ext.providerCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Cpu className="h-3 w-3" />
                            {ext.providerCount}{" "}
                            {ext.providerCount === 1
                                ? "provider"
                                : "providers"}
                        </div>
                    )}
                    {ext.modelCount > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Layers className="h-3 w-3" />
                            {ext.modelCount}{" "}
                            {ext.modelCount === 1 ? "model" : "models"}
                        </div>
                    )}
                    {ext.toolCount === 0 &&
                        ext.eventCount === 0 &&
                        ext.providerCount === 0 &&
                        ext.modelCount === 0 && (
                            <span className="italic">
                                No tools or hooks registered
                            </span>
                        )}
                </div>
            )}
        </motion.div>
    );
}
