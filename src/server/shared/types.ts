import type { UIMessage } from "ai";

export type { UIMessage };

export interface ChatRequest {
    messages: UIMessage[];
    sessionId?: string;
}

export interface SessionInfo {
    id: string;
    name: string | null;
    createdAt: number;
    updatedAt: number;
    cwd: string;
}

export interface HealthStatus {
    status: "ok" | "error";
    timestamp: number;
    version: string;
}

export type ToolCallStatus = "pending" | "running" | "completed" | "error";

export interface ServerConfig {
    url: string;
    port: number;
}

export type AgentMode = "plan" | "build" | "view";

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    isError?: boolean;
    parts?: StreamPart[];
}

export type StreamPart =
    | { type: "text"; content: string }
    | { type: "tool"; toolCall: ToolCall }
    | { type: "patch"; files: string[] };

export interface ToolCall {
    id?: string;
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status:
        | "pending"
        | "running"
        | "completed"
        | "error"
        | "approval-requested";
    approval?: {
        id: string;
    };
}

export interface DetailedModel {
    id: string;
    name: string;
    provider: {
        id: string;
        attachment: boolean;
        limit: {
            context: number;
        };
    };
    description?: string;
    iconUrl?: string;
}
