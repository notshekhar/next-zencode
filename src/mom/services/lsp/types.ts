/**
 * Core LSP types and interfaces
 * Following Interface Segregation Principle - small, focused interfaces
 */

export interface Diagnostic {
    message: string;
    line: number; // 0-indexed
    character: number;
    severity: "error" | "warning" | "info" | "hint";
    source?: string;
}

export type TransportMode = "stdio" | "tcp";

export interface LanguageServerConfig {
    id: string;
    name: string;
    /** File extensions this server handles */
    extensions: string[];
    /** Optional markers to identify project root */
    rootMarkers?: string[];
    /** Map of extension to languageId */
    languageIds: Record<string, string>;
    /** Initialization options sent to the server */
    initializationOptions?: Record<string, unknown>;

    /** Transport mode: "stdio" (default, auto-start) or "tcp" (connect to running server) */
    transport?: TransportMode;

    /** Stdio config (for transport: "stdio") */
    command?: string;
    args?: string[];
    env?: Record<string, string>;

    /** TCP config (for transport: "tcp") */
    host?: string;
    port?: number;
}

export interface UserLspConfig {
    lsp?:
        | false
        | Record<
              string,
              Partial<LanguageServerConfig> & {
                  disabled?: boolean;
              }
          >;
}

/**
 * JSON-RPC message types
 */
export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id: number | string;
    method: string;
    params?: unknown;
}

export interface JsonRpcNotification {
    jsonrpc: "2.0";
    method: string;
    params?: unknown;
}

export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: number | string;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

/**
 * Transport interface - abstraction over how we communicate with LSP server
 */
export interface ITransport {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(data: string): void;
    onData(handler: (data: Buffer) => void): void;
    onError(handler: (error: Error) => void): void;
    onClose(handler: () => void): void;
    isConnected(): boolean;
}

/**
 * Language Provider interface - what clients consume
 */
export interface ILanguageProvider {
    readonly name: string;
    readonly id: string;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
    validate(filePath: string, content?: string): Promise<Diagnostic[]>;
    handles(filePath: string): boolean;
    isConnected(): boolean;
}

/**
 * Server registry interface for discovering and loading server configs
 */
export interface IServerRegistry {
    getConfigs(projectRoot: string): LanguageServerConfig[];
    getConfigForFile(filePath: string): LanguageServerConfig | null;
    registerConfig(config: LanguageServerConfig): void;
    unregisterConfig(id: string): void;
}

/**
 * LSP Manager events
 */
export type LSPStateListener = (activeLSPs: string[]) => void;
