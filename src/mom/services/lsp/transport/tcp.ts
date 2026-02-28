/**
 * TCP Transport - connects to LSP servers over TCP socket
 * Single Responsibility: Network communication only
 */

import * as net from "net";
import type { ITransport } from "../types";

export interface TcpTransportOptions {
    host: string;
    port: number;
    /** Connection timeout in ms (default: 5000) */
    timeout?: number;
    /** Retry attempts on initial connection (default: 3) */
    retries?: number;
    /** Delay between retries in ms (default: 1000) */
    retryDelay?: number;
}

export class TcpTransport implements ITransport {
    private socket: net.Socket | null = null;
    private dataHandlers: ((data: Buffer) => void)[] = [];
    private errorHandlers: ((error: Error) => void)[] = [];
    private closeHandlers: (() => void)[] = [];
    private connected = false;

    constructor(private options: TcpTransportOptions) {}

    async connect(): Promise<void> {
        const {
            host,
            port,
            timeout = 5000,
            retries = 3,
            retryDelay = 1000,
        } = this.options;

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                await this.attemptConnect(host, port, timeout);
                return;
            } catch (error) {
                lastError = error as Error;
                if (attempt < retries - 1) {
                    await this.delay(retryDelay);
                }
            }
        }

        throw lastError || new Error(`Failed to connect to ${host}:${port}`);
    }

    private attemptConnect(
        host: string,
        port: number,
        timeout: number,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();

            const timeoutId = setTimeout(() => {
                socket.destroy();
                reject(new Error(`Connection timeout to ${host}:${port}`));
            }, timeout);

            socket.once("connect", () => {
                clearTimeout(timeoutId);
                this.socket = socket;
                this.connected = true;
                this.setupSocketHandlers();
                resolve();
            });

            socket.once("error", (err) => {
                clearTimeout(timeoutId);
                socket.destroy();
                reject(err);
            });

            socket.connect(port, host);
        });
    }

    private setupSocketHandlers(): void {
        if (!this.socket) return;

        this.socket.on("data", (data: Buffer) => {
            this.dataHandlers.forEach((handler) => handler(data));
        });

        this.socket.on("error", (error) => {
            this.errorHandlers.forEach((handler) => handler(error));
        });

        this.socket.on("close", () => {
            this.connected = false;
            this.closeHandlers.forEach((handler) => handler());
        });
    }

    async disconnect(): Promise<void> {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
            this.connected = false;
        }
    }

    send(data: string): void {
        if (!this.socket || !this.connected) {
            throw new Error("Not connected to LSP server");
        }
        this.socket.write(data);
    }

    onData(handler: (data: Buffer) => void): void {
        this.dataHandlers.push(handler);
    }

    onError(handler: (error: Error) => void): void {
        this.errorHandlers.push(handler);
    }

    onClose(handler: () => void): void {
        this.closeHandlers.push(handler);
    }

    isConnected(): boolean {
        return this.connected;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
