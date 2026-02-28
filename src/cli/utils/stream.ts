/**
 * Parser for Vercel AI SDK UIMessageStream responses.
 * The stream uses a line-based protocol where each line is:
 *   type:value
 * with values being JSON-encoded.
 *
 * Reference: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#ui-message-stream-protocol
 */

export interface StreamMessage {
    id: string;
    role: "assistant" | "user";
    parts: StreamPart[];
}

export type StreamPart =
    | { type: "text"; text: string }
    | { type: "reasoning"; reasoning: string }
    | {
          type: "tool-invocation";
          toolInvocation: {
              toolCallId: string;
              toolName: string;
              args: Record<string, unknown>;
              state: "call" | "partial-call" | "result";
              result?: unknown;
          };
      };

export interface StreamCallbacks {
    onMessageStart?: (messageId: string) => void;
    onTextDelta?: (text: string) => void;
    onReasoningDelta?: (reasoning: string) => void;
    onToolCall?: (
        toolCallId: string,
        toolName: string,
        args: Record<string, unknown>,
    ) => void;
    onToolResult?: (toolCallId: string, result: unknown) => void;
    onFinish?: (message: StreamMessage) => void;
    onError?: (error: string) => void;
}

export async function parseUIMessageStream(
    response: Response,
    callbacks: StreamCallbacks,
): Promise<StreamMessage | null> {
    const body = response.body;
    if (!body) return null;

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const message: StreamMessage = {
        id: "",
        role: "assistant",
        parts: [],
    };

    // Track current text part for appending deltas
    let currentTextPart: { type: "text"; text: string } | null = null;
    let currentReasoningPart: { type: "reasoning"; reasoning: string } | null =
        null;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;

                const colonIdx = line.indexOf(":");
                if (colonIdx === -1) continue;

                const type = line.slice(0, colonIdx);
                const rawValue = line.slice(colonIdx + 1);

                try {
                    processStreamLine(
                        type,
                        rawValue,
                        message,
                        callbacks,
                        { currentTextPart, currentReasoningPart },
                        (tp) => {
                            currentTextPart = tp;
                        },
                        (rp) => {
                            currentReasoningPart = rp;
                        },
                    );
                } catch {
                    // Skip malformed lines
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            const colonIdx = buffer.indexOf(":");
            if (colonIdx !== -1) {
                const type = buffer.slice(0, colonIdx);
                const rawValue = buffer.slice(colonIdx + 1);
                try {
                    processStreamLine(
                        type,
                        rawValue,
                        message,
                        callbacks,
                        { currentTextPart, currentReasoningPart },
                        (tp) => {
                            currentTextPart = tp;
                        },
                        (rp) => {
                            currentReasoningPart = rp;
                        },
                    );
                } catch {
                    // Skip
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    callbacks.onFinish?.(message);
    return message;
}

function processStreamLine(
    type: string,
    rawValue: string,
    message: StreamMessage,
    callbacks: StreamCallbacks,
    parts: {
        currentTextPart: { type: "text"; text: string } | null;
        currentReasoningPart: { type: "reasoning"; reasoning: string } | null;
    },
    setTextPart: (p: { type: "text"; text: string } | null) => void,
    setReasoningPart: (
        p: { type: "reasoning"; reasoning: string } | null,
    ) => void,
) {
    switch (type) {
        case "0": {
            // Text delta
            const text = JSON.parse(rawValue) as string;
            if (parts.currentTextPart) {
                parts.currentTextPart.text += text;
            } else {
                const newPart = { type: "text" as const, text };
                message.parts.push(newPart);
                setTextPart(newPart);
            }
            callbacks.onTextDelta?.(text);
            break;
        }
        case "g": {
            // Message ID
            const id = JSON.parse(rawValue) as string;
            message.id = id;
            callbacks.onMessageStart?.(id);
            break;
        }
        case "i": {
            // Reasoning delta
            const reasoning = JSON.parse(rawValue) as string;
            if (parts.currentReasoningPart) {
                parts.currentReasoningPart.reasoning += reasoning;
            } else {
                const newPart = {
                    type: "reasoning" as const,
                    reasoning,
                };
                message.parts.push(newPart);
                setReasoningPart(newPart);
            }
            callbacks.onReasoningDelta?.(reasoning);
            break;
        }
        case "b": {
            // Tool call start
            setTextPart(null);
            setReasoningPart(null);
            const toolCall = JSON.parse(rawValue) as {
                toolCallId: string;
                toolName: string;
                args: Record<string, unknown>;
            };
            message.parts.push({
                type: "tool-invocation",
                toolInvocation: {
                    ...toolCall,
                    state: "call",
                },
            });
            callbacks.onToolCall?.(
                toolCall.toolCallId,
                toolCall.toolName,
                toolCall.args,
            );
            break;
        }
        case "c": {
            // Tool result
            setTextPart(null);
            setReasoningPart(null);
            const result = JSON.parse(rawValue) as {
                toolCallId: string;
                result: unknown;
            };
            // Update existing tool invocation part
            for (const part of message.parts) {
                if (
                    part.type === "tool-invocation" &&
                    part.toolInvocation.toolCallId === result.toolCallId
                ) {
                    part.toolInvocation.state = "result";
                    part.toolInvocation.result = result.result;
                    break;
                }
            }
            callbacks.onToolResult?.(result.toolCallId, result.result);
            break;
        }
        case "a": {
            // Tool call streaming (partial args)
            // Just track, don't create new parts
            break;
        }
        case "e": {
            // Finish message (step boundary)
            setTextPart(null);
            setReasoningPart(null);
            break;
        }
        case "d": {
            // Finish (stream done)
            break;
        }
        case "3": {
            // Error
            const error = JSON.parse(rawValue) as string;
            callbacks.onError?.(error);
            break;
        }
        default:
            // Unknown type, skip (includes data parts like "data-file-changed")
            break;
    }
}
