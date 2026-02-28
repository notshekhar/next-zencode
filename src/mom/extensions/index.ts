/**
 * Extension system — public API.
 *
 * This module ties together discovery, loading, and runtime execution
 * of extensions. It exposes a singleton `extensionManager` that the
 * rest of the application uses.
 */

export type {
    ExtensionAPI,
    ExtensionFactory,
    ExtensionToolDefinition,
    ExtensionManifest,
    ExtensionEvent,
    ExtensionEventType,
    ExtensionHandler,
    LoadedExtension,
    LoadExtensionsResult,
    ToolExecutionContext,
    BeforeAgentStartEvent,
    BeforeAgentStartResult,
    AgentStartEvent,
    AgentEndEvent,
    ContextEvent,
    ContextEventResult,
    ToolCallEvent,
    ToolCallEventResult,
    ToolResultEvent,
    ToolResultEventResult,
    SessionStartEvent,
    SessionEndEvent,
    ExtensionProviderConfig,
    ExtensionModelConfig,
} from "./types";

export {
    discoverAndLoadExtensions,
    discoverExtensionPaths,
    isBundledExtension,
} from "./loader";
export { ExtensionRunner, extensionRunner } from "./runner";

import { discoverAndLoadExtensions } from "./loader";
import { extensionRunner } from "./runner";
import { configService } from "../services/configService";
import type { LoadedExtension } from "./types";

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * After loading, apply persisted state from config.
 * All extensions (including bundled) start enabled.
 * If the user previously disabled one, we respect that.
 */
function applyPersistedState(extensions: LoadedExtension[]): void {
    const disabled = configService.getDisabledExtensions();
    for (const ext of extensions) {
        if (disabled.includes(ext.name)) {
            ext.enabled = false;
        }
    }
}

/**
 * Initialize the extension system.
 * Safe to call multiple times — only the first call actually loads.
 */
export async function initExtensions(
    cwd: string,
    configuredPaths: string[] = [],
): Promise<void> {
    if (initialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const { extensions, errors } = await discoverAndLoadExtensions(
            cwd,
            configuredPaths,
        );

        applyPersistedState(extensions);
        extensionRunner.setExtensions(extensions);

        for (const err of errors) {
            console.warn("[extensions] " + err.path + ": " + err.error);
        }

        initialized = true;
        const enabledCount = extensions.filter((e) => e.enabled).length;
        console.log(
            "[extensions] Initialized with " + extensions.length + " extension(s) (" + enabledCount + " enabled)",
        );
    })();

    return initPromise;
}

/**
 * Reload all extensions (re-discover and re-load).
 */
export async function reloadExtensions(
    cwd: string,
    configuredPaths: string[] = [],
): Promise<{ loaded: number; errors: number }> {
    initialized = false;
    initPromise = null;

    const { extensions, errors } = await discoverAndLoadExtensions(
        cwd,
        configuredPaths,
    );

    applyPersistedState(extensions);
    extensionRunner.setExtensions(extensions);

    for (const err of errors) {
        console.warn("[extensions] " + err.path + ": " + err.error);
    }

    initialized = true;
    return { loaded: extensions.length, errors: errors.length };
}

/**
 * Get all loaded extensions.
 */
export function getLoadedExtensions(): LoadedExtension[] {
    return extensionRunner.getExtensions();
}

/**
 * Check if the extension system is initialized.
 */
export function isExtensionsInitialized(): boolean {
    return initialized;
}
