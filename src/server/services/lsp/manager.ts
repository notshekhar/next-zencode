/**
 * LSP Manager - orchestrates LSP providers
 * Single Responsibility: Provider lifecycle management
 */

import type { ILanguageProvider, Diagnostic, LSPStateListener } from "./types";
import { serverRegistry } from "./registry/serverRegistry";
import { LspProvider } from "./providers/lspProvider";
import { findProjectRoot } from "./utils/projectRoot";
import { clearRuntimeCache } from "./utils/runtime";
import * as fs from "fs";
import * as path from "path";

export class LSPManager {
    private activeProviders = new Map<string, ILanguageProvider>();
    private listeners: LSPStateListener[] = [];
    private connectionErrors = new Map<string, string>();
    private initializingProviders = new Set<string>();
    private scanPromises = new Map<string, Promise<void>>();
    private scannedRoots = new Set<string>();
    private static readonly KNOWN_EXTENSIONS = new Set<string>([
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs",
        ".go",
        ".py",
        ".rs",
        ".zig",
        ".c",
        ".cpp",
        ".cc",
        ".cxx",
        ".h",
        ".hpp",
        ".lua",
        ".rb",
    ]);

    /**
     * Add a listener for LSP state changes
     */
    addListener(listener: LSPStateListener): void {
        this.listeners.push(listener);
        this.notifyListeners();
    }

    /**
     * Remove a listener
     */
    removeListener(listener: LSPStateListener): void {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    private notifyListeners(): void {
        const activeNames = Array.from(this.activeProviders.values())
            .filter((p) => p.isConnected())
            .map((p) => p.name);
        this.listeners.forEach((l) => l(activeNames));
    }

    /**
     * Get diagnostics for a file
     */
    async getDiagnostics(
        filePath: string,
        content?: string,
    ): Promise<Diagnostic[]> {
        const config = serverRegistry.getConfigForFile(filePath);

        if (!config) {
            return [];
        }

        const root = findProjectRoot(filePath);
        const key = `${config.id}:${root}`;

        let provider = this.activeProviders.get(key);

        if (!provider && !this.initializingProviders.has(key)) {
            this.initializingProviders.add(key);
            provider = new LspProvider(config, root);

            try {
                await provider.initialize();
                this.activeProviders.set(key, provider);
                this.connectionErrors.delete(key);
                this.notifyListeners();
            } catch (e) {
                const errorMessage = (e as Error).message;
                // Only log if this is a new error
                if (this.connectionErrors.get(key) !== errorMessage) {
                    this.connectionErrors.set(key, errorMessage);
                    if (process.env.ZENCODE_DEBUG === "true") {
                        console.error(`[LSP] ${errorMessage}`);
                    }
                }
                this.initializingProviders.delete(key);
                return [];
            }
            this.initializingProviders.delete(key);
        }

        if (!provider) {
            return [];
        }

        if (!provider.isConnected()) {
            // Try to reconnect
            try {
                await provider.initialize();
                this.connectionErrors.delete(key);
                this.notifyListeners();
            } catch {
                return [];
            }
        }

        return provider.validate(filePath, content);
    }

    /**
     * Get list of active LSP names
     */
    getActiveLSPs(): string[] {
        return Array.from(this.activeProviders.values())
            .filter((p) => p.isConnected())
            .map((p) => p.name);
    }

    /**
     * Get connection errors for debugging
     */
    getConnectionErrors(): Map<string, string> {
        return new Map(this.connectionErrors);
    }

    /**
     * Dispose all providers
     */
    async disposeAll(): Promise<void> {
        const disposePromises = Array.from(this.activeProviders.values()).map(
            (p) => p.dispose().catch(() => {}),
        );
        await Promise.all(disposePromises);
        this.activeProviders.clear();
        this.connectionErrors.clear();
        this.initializingProviders.clear();
        this.notifyListeners();
    }

    /**
     * Dispose a specific provider
     */
    async disposeProvider(id: string, root: string): Promise<void> {
        const key = `${id}:${root}`;
        const provider = this.activeProviders.get(key);
        if (provider) {
            await provider.dispose();
            this.activeProviders.delete(key);
            this.connectionErrors.delete(key);
            this.notifyListeners();
        }
    }

    /**
     * Scan project and auto-start relevant LSPs based on file types found
     */
    async scanProject(projectRoot: string): Promise<void> {
        clearRuntimeCache();
        serverRegistry.clearCache();

        const rootConfigs = serverRegistry.getConfigs(projectRoot);

        // Collect extensions we know about (built-in + user configs at root)
        const targetExtensions = new Set<string>(LSPManager.KNOWN_EXTENSIONS);
        for (const config of rootConfigs) {
            for (const ext of config.extensions) {
                targetExtensions.add(ext);
            }
        }

        if (targetExtensions.size === 0) return;

        const startPromises: Promise<void>[] = [];
        const attemptedKeys = new Set<string>();
        let matchedAnyFile = false;

        this.scanDirectory(
            projectRoot,
            targetExtensions,
            0,
            (filePath, ext) => {
                const root = findProjectRoot(filePath);
                const configs = serverRegistry.getConfigs(root);
                const config = configs.find((c) => c.extensions.includes(ext));
                if (!config) return;

                matchedAnyFile = true;

                const key = `${config.id}:${root}`;
                if (
                    attemptedKeys.has(key) ||
                    this.activeProviders.has(key) ||
                    this.initializingProviders.has(key)
                ) {
                    return;
                }

                attemptedKeys.add(key);
                this.initializingProviders.add(key);
                const provider = new LspProvider(config, root);

                startPromises.push(
                    provider
                        .initialize()
                        .then(() => {
                            this.activeProviders.set(key, provider);
                            this.connectionErrors.delete(key);
                        })
                        .catch((e) => {
                            this.connectionErrors.set(
                                key,
                                (e as Error).message,
                            );
                        })
                        .finally(() => {
                            this.initializingProviders.delete(key);
                        }),
                );
            },
        );

        // Fallback: if we couldn't find any files, try root configs with markers
        if (!matchedAnyFile && rootConfigs.length > 0) {
            for (const config of rootConfigs) {
                if (!config.rootMarkers || config.rootMarkers.length === 0)
                    continue;
                const hasMarker = config.rootMarkers.some((marker: string) =>
                    fs.existsSync(path.join(projectRoot, marker)),
                );
                if (!hasMarker) continue;

                const key = `${config.id}:${projectRoot}`;
                if (
                    attemptedKeys.has(key) ||
                    this.activeProviders.has(key) ||
                    this.initializingProviders.has(key)
                ) {
                    continue;
                }

                attemptedKeys.add(key);
                this.initializingProviders.add(key);
                const provider = new LspProvider(config, projectRoot);

                startPromises.push(
                    provider
                        .initialize()
                        .then(() => {
                            this.activeProviders.set(key, provider);
                            this.connectionErrors.delete(key);
                        })
                        .catch((e) => {
                            this.connectionErrors.set(
                                key,
                                (e as Error).message,
                            );
                        })
                        .finally(() => {
                            this.initializingProviders.delete(key);
                        }),
                );
            }
        }

        await Promise.allSettled(startPromises);
        this.notifyListeners();
        this.scannedRoots.add(projectRoot);
    }

    /**
     * Ensure a project root has been scanned at least once.
     * Useful to trigger scanning from status requests without spamming.
     */
    async ensureScanned(projectRoot: string): Promise<void> {
        if (this.scannedRoots.has(projectRoot)) return;
        const existing = this.scanPromises.get(projectRoot);
        if (existing) return existing;

        const scanPromise = this.scanProject(projectRoot)
            .catch(() => {})
            .finally(() => {
                this.scanPromises.delete(projectRoot);
                this.scannedRoots.add(projectRoot);
            });

        this.scanPromises.set(projectRoot, scanPromise);
        return scanPromise;
    }

    private scanDirectory(
        dir: string,
        targetExtensions: Set<string>,
        depth: number,
        onMatch: (filePath: string, ext: string) => void,
    ): void {
        // Limit recursion depth
        if (depth > 6) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                // Skip hidden dirs and node_modules
                if (entry.name.startsWith(".")) continue;
                if (entry.name === "node_modules") continue;
                if (entry.name === "vendor") continue;
                if (entry.name === "dist") continue;
                if (entry.name === "build") continue;

                if (entry.isDirectory()) {
                    this.scanDirectory(
                        path.join(dir, entry.name),
                        targetExtensions,
                        depth + 1,
                        onMatch,
                    );
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (ext && targetExtensions.has(ext)) {
                        onMatch(path.join(dir, entry.name), ext);
                    }
                }
            }
        } catch {
            // Ignore permission errors
        }
    }
}

// Singleton export
export const lspManager = new LSPManager();
