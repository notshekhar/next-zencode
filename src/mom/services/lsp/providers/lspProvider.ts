/**
 * LSP Provider - connects to LSP servers via stdio or TCP
 * Single Responsibility: Orchestrates transport, RPC, and diagnostics
 */

import type {
    ILanguageProvider,
    ITransport,
    LanguageServerConfig,
    Diagnostic,
} from "../types";
import { TcpTransport } from "../transport/tcp";
import { StdioTransport } from "../transport/stdio";
import { JsonRpcClient } from "../rpc/client";

export class LspProvider implements ILanguageProvider {
    readonly name: string;
    readonly id: string;

    private transport: ITransport | null = null;
    private rpcClient: JsonRpcClient | null = null;
    private diagnostics = new Map<string, Diagnostic[]>();
    private openFiles = new Map<string, number>(); // uri -> version
    private lastContent = new Map<string, string>();
    private pendingDiagnostics = new Map<
        string,
        ((diags: Diagnostic[]) => void)[]
    >();
    private initialized = false;

    constructor(
        private config: LanguageServerConfig,
        private rootPath: string,
    ) {
        this.name = config.name;
        this.id = config.id;
    }

    handles(filePath: string): boolean {
        const ext = "." + filePath.split(".").pop();
        return this.config.extensions.includes(ext);
    }

    isConnected(): boolean {
        return this.transport?.isConnected() ?? false;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Create transport based on config
        if (this.config.transport === "tcp") {
            if (!this.config.host || !this.config.port) {
                throw new Error(
                    `TCP transport requires host and port for ${this.name}`,
                );
            }
            this.transport = new TcpTransport({
                host: this.config.host,
                port: this.config.port,
                timeout: 5000,
                retries: 3,
                retryDelay: 1000,
            });
        } else {
            // Default to stdio
            if (!this.config.command) {
                throw new Error(
                    `Stdio transport requires command for ${this.name}`,
                );
            }
            this.transport = new StdioTransport({
                command: this.config.command,
                args: this.config.args || [],
                env: this.config.env,
                cwd: this.rootPath,
            });
        }

        try {
            await this.transport.connect();
        } catch (error) {
            const mode = this.config.transport === "tcp" ? "TCP" : "stdio";
            throw new Error(
                `Failed to start ${this.name} (${mode}): ${(error as Error).message}`,
            );
        }

        // Create RPC client
        this.rpcClient = new JsonRpcClient(this.transport);

        // Handle incoming notifications
        this.rpcClient.onMessage((message) => {
            this.handleNotification(
                message as { method?: string; params?: unknown },
            );
        });

        // Send initialize request
        const initParams = {
            processId: process.pid,
            rootUri: `file://${this.rootPath}`,
            rootPath: this.rootPath,
            capabilities: {
                textDocument: {
                    publishDiagnostics: {
                        relatedInformation: true,
                    },
                    synchronization: {
                        didOpen: true,
                        didChange: true,
                        didClose: true,
                    },
                },
                workspace: {
                    workspaceFolders: true,
                },
            },
            workspaceFolders: [
                {
                    uri: `file://${this.rootPath}`,
                    name: this.rootPath.split("/").pop() || "workspace",
                },
            ],
            initializationOptions: this.config.initializationOptions,
        };

        await this.rpcClient.request("initialize", initParams);
        this.rpcClient.notify("initialized", {});
        this.initialized = true;
    }

    async dispose(): Promise<void> {
        if (this.rpcClient) {
            // Notify server we're shutting down
            try {
                await this.rpcClient.request("shutdown", null);
                this.rpcClient.notify("exit", null);
            } catch {
                // Ignore errors during shutdown
            }
            this.rpcClient.dispose();
            this.rpcClient = null;
        }

        if (this.transport) {
            await this.transport.disconnect();
            this.transport = null;
        }

        this.diagnostics.clear();
        this.openFiles.clear();
        this.lastContent.clear();
        this.pendingDiagnostics.clear();
        this.initialized = false;
    }

    async validate(filePath: string, content?: string): Promise<Diagnostic[]> {
        if (!this.rpcClient || !this.isConnected()) {
            return [];
        }

        const uri = `file://${filePath}`;
        const hasChanged = this.lastContent.get(uri) !== content;
        this.lastContent.set(uri, content || "");

        // Return cached diagnostics if content hasn't changed
        if (!hasChanged && this.diagnostics.has(uri)) {
            return this.diagnostics.get(uri)!;
        }

        // Send didOpen or didChange
        if (this.openFiles.has(uri)) {
            const version = this.openFiles.get(uri)! + 1;
            this.openFiles.set(uri, version);

            this.rpcClient.notify("textDocument/didChange", {
                textDocument: { uri, version },
                contentChanges: [{ text: content || "" }],
            });
        } else {
            this.openFiles.set(uri, 1);
            this.rpcClient.notify("textDocument/didOpen", {
                textDocument: {
                    uri,
                    languageId: this.getLanguageId(filePath),
                    version: 1,
                    text: content || "",
                },
            });
        }

        // Wait for diagnostics
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                const diags = this.diagnostics.get(uri) || [];
                const listeners = this.pendingDiagnostics.get(uri) || [];
                this.pendingDiagnostics.set(
                    uri,
                    listeners.filter((l) => l !== resolveHandler),
                );
                resolve(diags);
            }, 30000);

            const resolveHandler = (diags: Diagnostic[]) => {
                clearTimeout(timeout);
                resolve(diags);
            };

            const listeners = this.pendingDiagnostics.get(uri) || [];
            listeners.push(resolveHandler);
            this.pendingDiagnostics.set(uri, listeners);
        });
    }

    private handleNotification(message: {
        method?: string;
        params?: unknown;
    }): void {
        if (message.method === "textDocument/publishDiagnostics") {
            const params = message.params as {
                uri: string;
                diagnostics: Array<{
                    message: string;
                    range: { start: { line: number; character: number } };
                    severity?: number;
                    source?: string;
                }>;
            };

            const diags: Diagnostic[] = params.diagnostics.map((d) => ({
                message: d.message,
                line: d.range.start.line,
                character: d.range.start.character,
                severity: this.mapSeverity(d.severity),
                source: d.source || this.name,
            }));

            this.diagnostics.set(params.uri, diags);

            // Resolve pending listeners
            const listeners = this.pendingDiagnostics.get(params.uri);
            if (listeners && listeners.length > 0) {
                listeners.forEach((l) => l(diags));
                this.pendingDiagnostics.set(params.uri, []);
            }
        }
    }

    private getLanguageId(filePath: string): string {
        const ext = "." + filePath.split(".").pop();
        return this.config.languageIds[ext] || "plaintext";
    }

    private mapSeverity(severity?: number): Diagnostic["severity"] {
        switch (severity) {
            case 1:
                return "error";
            case 2:
                return "warning";
            case 3:
                return "info";
            case 4:
                return "hint";
            default:
                return "info";
        }
    }
}
