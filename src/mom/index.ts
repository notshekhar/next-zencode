/**
 * Mom — Agent Core Layer
 *
 * This is the heart of Zencode. Everything the agent does flows through here:
 * sessions, tools, extensions, embeddings, LLM orchestration.
 *
 * Architecture:
 *   mom (agent-core) → server (API layer) → frontend (UI)
 *
 * Extensions hook into mom to customize agent behavior.
 * The server layer is a thin API that delegates to mom.
 * The frontend consumes the server API and listens for mom events.
 */

// ─── Chat Orchestration ─────────────────────────────────────────────────────
export {
    createChatStream,
    isServiceReady,
    getServiceStatus,
    detectToolApprovalFlow,
    type ChatStreamOptions,
} from "./services/chat.service";

// ─── Extensions ──────────────────────────────────────────────────────────────
export {
    initExtensions,
    reloadExtensions,
    getLoadedExtensions,
    isExtensionsInitialized,
    extensionRunner,
    type ExtensionAPI,
    type ExtensionFactory,
    type ExtensionToolDefinition,
    type ExtensionEvent,
    type ExtensionEventType,
    type LoadedExtension,
    type ToolExecutionContext,
    type ExtensionProviderConfig,
    type ExtensionModelConfig,
} from "./extensions";

// ─── Database / Sessions ─────────────────────────────────────────────────────
export {
    saveUIMessage,
    updateSessionTimestamp,
    getUIMessages,
    updateUIMessage,
    getSession,
    createSession,
    getAllSessions,
    deleteSession,
} from "./db/database";

// ─── Tools ───────────────────────────────────────────────────────────────────
export { getToolsForMode, tools, planModeTools } from "./tools";

// ─── Models & Provider Registry ──────────────────────────────────────────────
export {
    getModel,
    isModelConfigured,
    getAllVisibleModels,
    registerProvider,
    unregisterProvider,
    registerModel,
    getRegisteredProviders,
} from "./services/modelFactory";

// ─── Configuration ───────────────────────────────────────────────────────────
export { configService } from "./services/configService";
export type {
    ZencodeConfig,
    ProviderType,
    PermissionLevel,
    ExtensionsConfig,
} from "./services/configService";

// ─── Skills ──────────────────────────────────────────────────────────────────
export { skillService } from "./services/skillService";

// ─── Embeddings ──────────────────────────────────────────────────────────────
export {
    insertChunks,
    semanticSearch,
    getStats as getEmbeddingStats,
    clearProjectEmbeddings,
    isVecAvailable,
} from "./embeddings/store";
export {
    indexProject,
    reindexProject,
    reindexSingleFile,
} from "./embeddings/indexer";

// ─── Prompts ─────────────────────────────────────────────────────────────────
export { getSystemPrompt } from "./services/prompts";

// ─── LSP ─────────────────────────────────────────────────────────────────────
export { lspManager } from "./services/lsp/index";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
    AgentMode,
    SessionInfo,
    HealthStatus,
    DetailedModel,
    UIMessage,
} from "./shared/types";

// ─── Utilities ───────────────────────────────────────────────────────────────
export { getProjectRoot } from "./utils/cwd";

// ─── Frontend Events (for extension → frontend communication) ────────────────
export {
    frontendEventBus,
    type FrontendEvent,
    type FrontendEventType,
    type FrontendEventHandler,
} from "./frontend-events";
