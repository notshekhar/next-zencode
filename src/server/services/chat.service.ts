import {
    streamText,
    convertToModelMessages,
    createUIMessageStream,
    stepCountIs,
    isToolUIPart,
    type UIMessage,
} from "ai";
import { v7 as uuidv7 } from "uuid";
import { getModel, isModelConfigured } from "./modelFactory";
import { getSystemPrompt } from "./prompts";
import { getToolsForMode } from "../tools/index";
import { skillService, type Skill } from "./skillService";
import {
    saveUIMessage,
    updateSessionTimestamp,
    getUIMessages,
    updateUIMessage,
    getSession,
    createSession,
} from "../db/database";
import * as Snapshot from "./snapshot";
import { compactMessageParts } from "./messageCompaction";
import type { AgentMode } from "../shared/types";
import { getLatestCommitFileChanges } from "./gitChangeSummary.service";
import { clearTasks } from "./sessionState";

function generateSessionName(content: string): string {
    // Extract first 5-7 words from the message as the session name
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const nameWords = words.slice(0, 7);
    let name = nameWords.join(" ");

    // Truncate if too long
    if (name.length > 50) {
        name = name.slice(0, 47) + "...";
    }

    return name;
}



export async function detectToolApprovalFlow(message: UIMessage) {
    for (const part of message.parts) {
        if (isToolUIPart(part) && part.state === "approval-responded") {
            return true;
        }
    }
    return false;
}

export interface ChatStreamOptions {
    messages: UIMessage[];
    message: UIMessage;
    threadId: string;
    trigger?: "submit-message" | "regenerate-message";
    signal?: AbortSignal;
    mode?: AgentMode;
    selectedSkillNames?: string[];
}

export async function createChatStream(options: ChatStreamOptions) {
    const {
        messages,
        message,
        threadId,
        trigger = "submit-message",
        signal,
        mode = "build",
        selectedSkillNames = [],
    } = options;

    if (!isModelConfigured()) {
        throw new Error(
            "AI provider not configured. Please run /connect to set up your API key.",
        );
    }

    if (!threadId) {
        throw new Error("Thread ID is required");
    }

    const existingSession = getSession(threadId);

    if (!existingSession) {
        const textContent = message.parts
            .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
            )
            .map((p) => p.text)
            .join("");

        const sessionName =
            message.role === "user" ? generateSessionName(textContent) : null;

        createSession(sessionName || undefined, threadId);
        clearTasks();
    }

    const model = getModel();

    let allMessages = messages && messages.length > 0 ? messages : null;
    if (!allMessages) {
        const existingMessages = getUIMessages(threadId);
        allMessages =
            existingMessages.length > 0 ? existingMessages : [message];
    }

    const compactedMessages = allMessages.map((uiMessage) => ({
        ...uiMessage,
        parts: compactMessageParts(uiMessage.parts),
    }));
    const modelMessages = await convertToModelMessages(compactedMessages);

    const isToolApprovalFlow = await detectToolApprovalFlow(message);

    if (isToolApprovalFlow) {
        updateUIMessage(threadId, message.id, message);
    }

    if (trigger !== "regenerate-message" && message.role === "user") {
        let snapshot: string | undefined;
        try {
            snapshot = await Snapshot.track();
        } catch (error) {
            console.error("[Snapshot Error]", error);
        }
        saveUIMessage(threadId, message, { snapshot });
    }

    const allSkills = skillService.getAllSkills(process.cwd());
    const activatedSkills =
        selectedSkillNames && selectedSkillNames.length > 0
            ? allSkills.filter((s) => selectedSkillNames.includes(s.name))
            : [];
    const discoverableSkills = allSkills.filter(
        (s) => !selectedSkillNames?.includes(s.name),
    );

    const activeTools = getToolsForMode(mode, { projectDir: process.cwd() });

    return createUIMessageStream({
        execute: async ({ writer }) => {
            const textStream = streamText({
                model,
                system: getSystemPrompt(mode, activatedSkills, discoverableSkills),
                messages: modelMessages,
                tools: activeTools,
                stopWhen: stepCountIs(200),
                abortSignal: signal,
                onFinish: async () => {
                    const gitFileChanges = await getLatestCommitFileChanges(
                        process.cwd(),
                    );
                    writer.write({
                        type: "data-file-changed",
                        data: gitFileChanges,
                    });
                },
            });

            writer.merge(
                textStream.toUIMessageStream({
                    sendReasoning: true,
                }),
            );
        },
        originalMessages: allMessages,

        generateId: () => uuidv7(),

        onError: (error) => {
            console.error("[Chat Stream Error]", error);
            return error instanceof Error ? error.message : "Unknown error";
        },

        onFinish: async (event) => {
            const assistantMessage = event.responseMessage;

            if (assistantMessage) {
                if (event.isContinuation) {
                    updateUIMessage(
                        threadId,
                        assistantMessage.id,
                        assistantMessage,
                    );
                } else {
                    saveUIMessage(threadId, assistantMessage);
                }
            }
            updateSessionTimestamp(threadId);
        },
    });
}

export function isServiceReady(): boolean {
    return isModelConfigured();
}

export function getServiceStatus(): { ready: boolean; reason?: string } {
    if (!isModelConfigured()) {
        return {
            ready: false,
            reason: "AI provider not configured",
        };
    }
    return { ready: true };
}
