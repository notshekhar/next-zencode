/**
 * Extension loader — discovers and loads TypeScript extension modules.
 *
 * Discovery locations (in order):
 * 1. Project-local: <cwd>/.zencode/extensions/
 * 2. Global: ~/.config/zencode/extensions/
 * 3. Explicitly configured paths from config
 *
 * Each extension must default-export a factory function:
 *   export default (api: ExtensionAPI) => { ... }
 */

import * as fs from "fs";
import * as path from "path";
import { frontendEventBus } from "../frontend-events";
import type { FrontendEvent } from "../frontend-events";
import {
    registerProvider as registerProviderInFactory,
    registerModel as registerModelInFactory,
} from "../services/modelFactory";
import type {
    ExtensionAPI,
    ExtensionFactory,
    ExtensionManifest,
    ExtensionModelConfig,
    ExtensionProviderConfig,
    ExtensionToolDefinition,
    LoadedExtension,
    LoadExtensionsResult,
} from "./types";

function getGlobalExtensionsDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const configBase =
        process.platform === "darwin" || process.platform === "linux"
            ? path.join(homeDir, ".config")
            : path.join(homeDir, "AppData", "Roaming");
    return path.join(configBase, "zencode", "extensions");
}

function isExtensionFile(name: string): boolean {
    return name.endsWith(".ts") || name.endsWith(".js");
}

function readManifest(packageJsonPath: string): ExtensionManifest | null {
    try {
        const content = fs.readFileSync(packageJsonPath, "utf-8");
        const pkg = JSON.parse(content);
        if (pkg.zencode && typeof pkg.zencode === "object") {
            return {
                name: pkg.zencode.name || pkg.name || "unknown",
                version: pkg.zencode.version || pkg.version,
                description: pkg.zencode.description || pkg.description,
                extensions: pkg.zencode.extensions,
            };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Resolve entry points from a directory:
 * 1. package.json with "zencode.extensions" → declared paths
 * 2. index.ts or index.js → the index file
 */
function resolveEntryPoints(dir: string): { paths: string[]; manifest?: ExtensionManifest } | null {
    const packageJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
        const manifest = readManifest(packageJsonPath);
        if (manifest?.extensions?.length) {
            const entries: string[] = [];
            for (const extPath of manifest.extensions) {
                const resolved = path.resolve(dir, extPath);
                if (fs.existsSync(resolved)) {
                    entries.push(resolved);
                }
            }
            if (entries.length > 0) {
                return { paths: entries, manifest };
            }
        }
    }

    for (const indexFile of ["index.ts", "index.js"]) {
        const indexPath = path.join(dir, indexFile);
        if (fs.existsSync(indexPath)) {
            return { paths: [indexPath] };
        }
    }

    return null;
}

/**
 * Discover extensions in a single directory (one level deep).
 *
 * - Direct files: dir/*.ts or *.js -> load
 * - Subdirectory with index/manifest: dir/*\/ -> resolve entry points
 */
function discoverInDir(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const discovered: string[] = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);

            if (entry.isFile() && isExtensionFile(entry.name)) {
                discovered.push(entryPath);
                continue;
            }

            if (entry.isDirectory()) {
                const resolved = resolveEntryPoints(entryPath);
                if (resolved) {
                    discovered.push(...resolved.paths);
                }
            }
        }
    } catch {
        // Directory unreadable — skip
    }
    return discovered;
}

function createExtensionAPI(
    extension: LoadedExtension,
    cwd: string,
): ExtensionAPI {
    return {
        on(event, handler) {
            const list = extension.handlers.get(event) ?? [];
            list.push(handler as (...args: unknown[]) => Promise<unknown>);
            extension.handlers.set(event, list);
        },

        registerTool(tool: ExtensionToolDefinition) {
            extension.tools.set(tool.name, tool);
        },

        getCwd() {
            return cwd;
        },

        log(message, level = "info") {
            const prefix = "[ext:" + extension.name + "]";
            switch (level) {
                case "warn":
                    console.warn(prefix, message);
                    break;
                case "error":
                    console.error(prefix, message);
                    break;
                default:
                    console.log(prefix, message);
            }
        },

        registerProvider(config: ExtensionProviderConfig) {
            extension.providers.set(config.id, config);
            registerProviderInFactory(config, "extension");
        },

        registerModel(config: ExtensionModelConfig) {
            extension.models.push(config);
            registerModelInFactory(config);
        },

        emitFrontendEvent(event: FrontendEvent) {
            frontendEventBus.emit(event);
        },

        playSound(sound) {
            frontendEventBus.emit({ type: "play_sound", sound });
        },

        showToast(message, variant = "default") {
            frontendEventBus.emit({ type: "show_toast", message, variant });
        },

        showNotification(title, body) {
            frontendEventBus.emit({ type: "show_notification", title, body });
        },

        triggerAnimation(animation) {
            frontendEventBus.emit({ type: "trigger_animation", animation });
        },
    };
}

function createEmptyExtension(
    extensionPath: string,
    resolvedPath: string,
    bundled = false,
): LoadedExtension {
    const name = path.basename(resolvedPath, path.extname(resolvedPath));
    return {
        path: extensionPath,
        resolvedPath,
        name,
        handlers: new Map(),
        tools: new Map(),
        providers: new Map(),
        models: [],
        enabled: true,
        bundled,
    };
}

// Bypass Turbopack/webpack static analysis of dynamic imports.
// The bundler fails on `import(variable)` because it tries to resolve
// the path at build time. Using Function() makes it opaque.
const dynamicImport = new Function("p", "return import(p)") as (
    p: string,
) => Promise<any>;

async function loadExtensionModule(
    resolvedPath: string,
): Promise<ExtensionFactory | null> {
    try {
        const module = await dynamicImport(resolvedPath);
        const factory = module.default ?? module;
        return typeof factory === "function" ? factory : null;
    } catch (err) {
        console.error(
            "[extensions] Failed to import " + resolvedPath + ":",
            err instanceof Error ? err.message : err,
        );
        return null;
    }
}

async function loadSingleExtension(
    extensionPath: string,
    cwd: string,
): Promise<{ extension: LoadedExtension | null; error: string | null }> {
    const resolvedPath = path.isAbsolute(extensionPath)
        ? extensionPath
        : path.resolve(cwd, extensionPath);

    const bundled = isBundledExtension(resolvedPath);

    try {
        const factory = await loadExtensionModule(resolvedPath);
        if (!factory) {
            return {
                extension: null,
                error: "Extension does not export a valid factory function: " + extensionPath,
            };
        }

        const extension = createEmptyExtension(extensionPath, resolvedPath, bundled);
        const api = createExtensionAPI(extension, cwd);
        await factory(api);

        const tag = bundled ? " (bundled)" : "";
        console.log(
            "[extensions] Loaded: " + extension.name + " (" + extension.tools.size + " tools, " + extension.handlers.size + " event types)" + tag,
        );
        return { extension, error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            extension: null,
            error: "Failed to load extension " + extensionPath + ": " + message,
        };
    }
}

/**
 * Get the path to the bundled example extensions shipped with zencode.
 */
function getBundledExtensionsDir(cwd: string): string {
    return path.join(cwd, "extensions", "examples");
}

/** Paths that came from the bundled examples directory */
const bundledPaths = new Set<string>();

/**
 * Check if a resolved extension path is a bundled example.
 */
export function isBundledExtension(resolvedPath: string): boolean {
    return bundledPaths.has(resolvedPath);
}

/**
 * Discover all extension paths from standard + configured + bundled locations.
 */
export function discoverExtensionPaths(
    cwd: string,
    configuredPaths: string[] = [],
): string[] {
    const allPaths: string[] = [];
    const seen = new Set<string>();
    bundledPaths.clear();

    const addPaths = (paths: string[], bundled = false) => {
        for (const p of paths) {
            const resolved = path.resolve(p);
            if (!seen.has(resolved)) {
                seen.add(resolved);
                allPaths.push(resolved);
                if (bundled) {
                    bundledPaths.add(resolved);
                }
            }
        }
    };

    // 1. Project-local
    addPaths(discoverInDir(path.join(cwd, ".zencode", "extensions")));

    // 2. Global
    addPaths(discoverInDir(getGlobalExtensionsDir()));

    // 3. Configured paths
    for (const p of configuredPaths) {
        const resolved = path.isAbsolute(p) ? p : path.resolve(cwd, p);
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
            const entries = resolveEntryPoints(resolved);
            if (entries) {
                addPaths(entries.paths);
            } else {
                addPaths(discoverInDir(resolved));
            }
        } else if (fs.existsSync(resolved)) {
            addPaths([resolved]);
        }
    }

    // 4. Bundled example extensions (disabled by default, users opt-in)
    addPaths(discoverInDir(getBundledExtensionsDir(cwd)), true);

    return allPaths;
}

/**
 * Load all extensions from discovered paths.
 */
export async function loadExtensions(
    paths: string[],
    cwd: string,
): Promise<LoadExtensionsResult> {
    const extensions: LoadedExtension[] = [];
    const errors: Array<{ path: string; error: string }> = [];

    for (const extPath of paths) {
        const { extension, error } = await loadSingleExtension(extPath, cwd);
        if (error) {
            errors.push({ path: extPath, error });
            continue;
        }
        if (extension) {
            extensions.push(extension);
        }
    }

    return { extensions, errors };
}

/**
 * Full discovery + load pipeline.
 */
export async function discoverAndLoadExtensions(
    cwd: string,
    configuredPaths: string[] = [],
): Promise<LoadExtensionsResult> {
    const paths = discoverExtensionPaths(cwd, configuredPaths);

    if (paths.length === 0) {
        console.log("[extensions] No extensions found");
        return { extensions: [], errors: [] };
    }

    console.log("[extensions] Discovered " + paths.length + " extension(s)");
    return loadExtensions(paths, cwd);
}
