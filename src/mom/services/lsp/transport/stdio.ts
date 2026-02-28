/**
 * Stdio Transport - spawns LSP server and communicates via stdin/stdout
 * Single Responsibility: Process spawning and stdio communication
 */

import { spawn, type ChildProcess } from "child_process";
import type { ITransport } from "../types";

export interface StdioTransportOptions {
    command: string;
    args: string[];
    env?: Record<string, string>;
    cwd?: string;
}

export class StdioTransport implements ITransport {
    private process: ChildProcess | null = null;
    private dataHandlers: ((data: Buffer) => void)[] = [];
    private errorHandlers: ((error: Error) => void)[] = [];
    private closeHandlers: (() => void)[] = [];
    private connected = false;

    constructor(private options: StdioTransportOptions) {}

    async connect(): Promise<void> {
        const { command, args, env, cwd } = this.options;
        const debug = process.env.ZENCODE_DEBUG === "true";

        if (debug) {
            console.error(`[LSP] Starting: ${command} ${args.join(" ")}`);
        }

        return new Promise((resolve, reject) => {
            try {
                this.process = spawn(command, args, {
                    env: { ...process.env, ...env },
                    cwd,
                    stdio: ["pipe", "pipe", "pipe"],
                });

                let startupError: Error | null = null;

                this.process.on("error", (err) => {
                    if (!this.connected) {
                        startupError = new Error(
                            `Failed to start ${command}: ${err.message}`,
                        );
                        reject(startupError);
                    } else {
                        this.errorHandlers.forEach((h) => h(err));
                    }
                });

                this.process.on("exit", (code, signal) => {
                    if (debug) {
                        console.error(
                            `[LSP] Process exited with code ${code}, signal ${signal}`,
                        );
                    }
                    this.connected = false;
                    this.closeHandlers.forEach((h) => h());
                });

                this.process.stdout?.on("data", (data: Buffer) => {
                    this.dataHandlers.forEach((h) => h(data));
                });

                this.process.stderr?.on("data", (data: Buffer) => {
                    const msg = data.toString();
                    if (debug) {
                        console.error(`[LSP stderr]: ${msg}`);
                    }
                    // Check for common startup errors
                    if (!this.connected && msg.includes("Error")) {
                        startupError = new Error(msg.trim());
                    }
                });

                // Give the process a moment to start and potentially fail
                setTimeout(() => {
                    if (startupError) {
                        reject(startupError);
                        return;
                    }
                    if (this.process && !this.process.killed) {
                        this.connected = true;
                        if (debug) {
                            console.error(`[LSP] Connected to ${command}`);
                        }
                        resolve();
                    } else {
                        reject(new Error(`Process ${command} failed to start`));
                    }
                }, 200);
            } catch (err) {
                reject(err);
            }
        });
    }

    async disconnect(): Promise<void> {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.connected = false;
        }
    }

    send(data: string): void {
        if (!this.process || !this.connected) {
            throw new Error("LSP process not running");
        }
        this.process.stdin?.write(data);
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
        return this.connected && this.process !== null && !this.process.killed;
    }
}
