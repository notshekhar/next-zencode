/**
 * LSP Module - Language Server Protocol integration
 *
 * This module auto-detects installed LSP servers and starts them on demand.
 * It supports both stdio (auto-start) and TCP (connect to running server) modes.
 *
 * Auto-detected servers:
 * - TypeScript/JavaScript: typescript-language-server (via bun/node)
 * - Go: gopls
 * - Python: pylsp or pyright
 * - Rust: rust-analyzer
 * - C/C++: clangd
 * - Zig: zls
 * - Lua: lua-language-server
 * - Ruby: solargraph
 *
 * Custom LSP Configuration (zencode.json):
 * {
 *   "lsp": {
 *     // Disable a built-in server
 *     "typescript-language-server": { "disabled": true },
 *
 *     // Add a custom server (stdio mode - auto-start)
 *     "my-lsp": {
 *       "name": "My Language",
 *       "command": "my-lsp-binary",
 *       "args": ["--stdio"],
 *       "extensions": [".mylang"],
 *       "languageIds": { ".mylang": "mylanguage" }
 *     },
 *
 *     // Add a custom server (TCP mode - connect to running server)
 *     "remote-lsp": {
 *       "name": "Remote LSP",
 *       "transport": "tcp",
 *       "host": "127.0.0.1",
 *       "port": 3000,
 *       "extensions": [".remote"],
 *       "languageIds": { ".remote": "remote" }
 *     }
 *   }
 * }
 *
 * Environment Variables:
 * - ZENCODE_DISABLE_LSP=true: Disable all LSP features
 * - ZENCODE_DEBUG=true: Enable debug logging
 */

// Re-export types
export type {
    Diagnostic,
    LanguageServerConfig,
    UserLspConfig,
    ILanguageProvider,
    ITransport,
    IServerRegistry,
    LSPStateListener,
    TransportMode,
} from "./types";

// Re-export manager
export { LSPManager, lspManager } from "./manager";

// Re-export registry
export { ServerRegistry, serverRegistry } from "./registry/serverRegistry";

// Re-export transports
export { TcpTransport } from "./transport/tcp";
export { StdioTransport } from "./transport/stdio";

// Re-export provider
export { LspProvider } from "./providers/lspProvider";

// Re-export utilities
export { findProjectRoot } from "./utils/projectRoot";
export {
    isCommandAvailable,
    findTypeScriptServer,
    getPreferredRuntime,
    which,
} from "./utils/runtime";
