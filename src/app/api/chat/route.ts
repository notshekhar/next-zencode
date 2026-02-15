import { createUIMessageStreamResponse, type UIMessage } from "ai";
import {
    createChatStream,
    getServiceStatus,
} from "@/server/services/chat.service";
import type { AgentMode } from "@/server/shared/types"; // Verify this path later

interface ChatRequestBody {
    messages: UIMessage[];
    message: UIMessage;
    threadId?: string;
    trigger?: "submit-message" | "regenerate-message";
    abortSignal?: AbortSignal; // Note: Next.js Request signal is usually used, but we might pass it differently
    mode?: AgentMode;
    selectedSkillNames?: string[];
}

export async function POST(req: Request) {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, message, threadId, trigger, mode, selectedSkillNames } = body;

    const status = getServiceStatus();
    if (!status.ready) {
        return Response.json(
            { error: status.reason || "Service not ready" },
            { status: 503 },
        );
    }

    if (!threadId) {
        return Response.json(
            { error: "Session ID is required" },
            { status: 400 },
        );
    }

    try {
        const stream = await createChatStream({
            messages: messages || [],
            message,
            threadId,
            trigger: trigger || "submit-message",
            signal: req.signal,
            mode: mode || "build",
            selectedSkillNames: selectedSkillNames || [],
        });

        return createUIMessageStreamResponse({ stream });
    } catch (error) {
        console.error("[Chat Error]", error);
        return Response.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
        );
    }
}

export async function GET(req: Request) {
    return Response.json(getServiceStatus());
}
