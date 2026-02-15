/**
 * JSON-RPC Client - handles LSP protocol communication
 * Single Responsibility: Protocol handling only
 */

import type {
    ITransport,
    JsonRpcRequest,
    JsonRpcNotification,
    JsonRpcResponse,
} from "../types";

export type MessageHandler = (message: unknown) => void;

export interface JsonRpcClientOptions {
    debug?: boolean;
    requestTimeout?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export class JsonRpcClient {
    private messageBuffer = "";
    private nextId = 1;
    private pendingRequests = new Map<
        number | string,
        {
            resolve: (result: unknown) => void;
            reject: (error: Error) => void;
            timer: ReturnType<typeof setTimeout>;
        }
    >();
    private messageHandlers: MessageHandler[] = [];
    private debug: boolean;
    private requestTimeout: number;

    constructor(
        private transport: ITransport,
        options: JsonRpcClientOptions = {},
    ) {
        this.debug = options.debug ?? process.env.ZENCODE_DEBUG === "true";
        this.requestTimeout = options.requestTimeout ?? DEFAULT_TIMEOUT;

        this.setupListeners();
    }

    private setupListeners(): void {
        this.transport.onData((data: Buffer) => {
            this.handleData(data);
        });

        this.transport.onError((error: Error) => {
            if (this.debug) {
                console.error(`[LSP transport error]:`, error.message);
            }
        });

        this.transport.onClose(() => {
            // Reject all pending requests
            for (const [id, pending] of this.pendingRequests) {
                clearTimeout(pending.timer);
                pending.reject(new Error("Connection closed"));
            }
            this.pendingRequests.clear();
        });
    }

    private handleData(data: Buffer): void {
        this.messageBuffer += data.toString();

        while (true) {
            const headerStart = this.messageBuffer.indexOf("Content-Length: ");
            if (headerStart === -1) break;

            const headerEnd = this.messageBuffer.indexOf(
                "\r\n\r\n",
                headerStart,
            );
            if (headerEnd === -1) break;

            const lengthStr = this.messageBuffer.slice(
                headerStart + 16,
                headerEnd,
            );
            const contentLength = parseInt(lengthStr, 10);
            if (isNaN(contentLength)) {
                // Corrupted buffer, skip header
                this.messageBuffer = this.messageBuffer.slice(headerEnd + 4);
                continue;
            }

            const messageStart = headerEnd + 4;
            if (this.messageBuffer.length < messageStart + contentLength) break;

            const messageJson = this.messageBuffer.slice(
                messageStart,
                messageStart + contentLength,
            );
            this.messageBuffer = this.messageBuffer.slice(
                messageStart + contentLength,
            );

            try {
                const message = JSON.parse(messageJson);
                this.handleMessage(message);
            } catch (e) {
                if (this.debug) {
                    console.error("Failed to parse LSP JSON:", e);
                }
            }
        }
    }

    private handleMessage(
        message: JsonRpcResponse & { method?: string },
    ): void {
        if (this.debug) {
            console.log("[LSP] IN:", JSON.stringify(message).slice(0, 500));
        }

        // Check if it's a response to a request
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
            const pending = this.pendingRequests.get(message.id)!;
            clearTimeout(pending.timer);
            this.pendingRequests.delete(message.id);

            if (message.error) {
                pending.reject(new Error(message.error.message));
            } else {
                pending.resolve(message.result);
            }
            return;
        }

        // It's a notification or server-initiated request
        this.messageHandlers.forEach((handler) => handler(message));
    }

    /**
     * Send a request and wait for response
     */
    async request<T = unknown>(method: string, params?: unknown): Promise<T> {
        if (!this.transport.isConnected()) {
            throw new Error("Not connected to LSP server");
        }

        return new Promise((resolve, reject) => {
            const id = this.nextId++;

            const timer = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`LSP request '${method}' timed out`));
                }
            }, this.requestTimeout);

            this.pendingRequests.set(id, {
                resolve: resolve as (result: unknown) => void,
                reject,
                timer,
            });

            const request: JsonRpcRequest = {
                jsonrpc: "2.0",
                id,
                method,
                params,
            };

            this.send(request);
        });
    }

    /**
     * Send a notification (no response expected)
     */
    notify(method: string, params?: unknown): void {
        if (!this.transport.isConnected()) {
            return; // Silently ignore if not connected
        }

        const notification: JsonRpcNotification = {
            jsonrpc: "2.0",
            method,
            params,
        };
        this.send(notification);
    }

    /**
     * Add a handler for incoming messages (notifications/requests from server)
     */
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.push(handler);
        return () => {
            this.messageHandlers = this.messageHandlers.filter(
                (h) => h !== handler,
            );
        };
    }

    private send(message: JsonRpcRequest | JsonRpcNotification): void {
        const content = JSON.stringify(message);
        const contentLength = Buffer.byteLength(content, "utf-8");
        const formatted = `Content-Length: ${contentLength}\r\n\r\n${content}`;

        if (this.debug) {
            console.log("[LSP] OUT:", content.slice(0, 500));
        }

        this.transport.send(formatted);
    }

    /**
     * Cancel all pending requests
     */
    dispose(): void {
        for (const [, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
            pending.reject(new Error("Client disposed"));
        }
        this.pendingRequests.clear();
        this.messageHandlers = [];
    }
}
