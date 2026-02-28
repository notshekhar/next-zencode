import React, { useState, useCallback, useRef } from "react";
import { Box, Text, Static, useInput, useApp } from "ink";
import { v4 as uuid } from "uuid";
import { ChatMessage } from "./ChatMessage.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { StatusBar } from "./StatusBar.js";
import { RobotAscii } from "./RobotAscii.js";
import {
    parseUIMessageStream,
    type StreamMessage,
} from "../utils/stream.js";
import { getModeColor } from "../utils/colors.js";

interface ChatViewProps {
    serverUrl: string;
    threadId: string;
    cwd: string;
}

export function ChatView({ serverUrl, threadId, cwd }: ChatViewProps) {
    const { exit } = useApp();
    const [completedMessages, setCompletedMessages] = useState<StreamMessage[]>(
        [],
    );
    const [currentMessage, setCurrentMessage] = useState<StreamMessage | null>(
        null,
    );
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [mode, setMode] = useState<"plan" | "build">("build");
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const historyRef = useRef<StreamMessage[]>([]);
    const messageHistoryRef = useRef<string[]>([]);
    const historyIdxRef = useRef(-1);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!text.trim() || isStreaming) return;

            setError(null);

            // Add to input history
            messageHistoryRef.current.unshift(text);
            historyIdxRef.current = -1;

            // Create user message
            const userMsg: StreamMessage = {
                id: uuid(),
                role: "user",
                parts: [{ type: "text", text }],
            };

            // Move to completed immediately
            setCompletedMessages((prev) => [...prev, userMsg]);
            historyRef.current = [...historyRef.current, userMsg];
            setInput("");
            setIsStreaming(true);

            // Create streaming assistant message
            const assistantMsg: StreamMessage = {
                id: "",
                role: "assistant",
                parts: [],
            };
            setCurrentMessage({ ...assistantMsg });

            const abortController = new AbortController();
            abortRef.current = abortController;

            try {
                // Check service status first
                const statusRes = await fetch(`${serverUrl}/api/chat`, {
                    signal: abortController.signal,
                });
                const status = await statusRes.json();
                if (!status.ready) {
                    setError(
                        `Service not ready: ${status.reason || "initializing..."}`,
                    );
                    setCurrentMessage(null);
                    setIsStreaming(false);
                    return;
                }

                // Build UIMessage format
                const uiMessage = {
                    id: userMsg.id,
                    role: "user" as const,
                    content: text,
                    parts: [{ type: "text" as const, text }],
                };

                const response = await fetch(`${serverUrl}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [],
                        message: uiMessage,
                        threadId,
                        trigger: "submit-message",
                        mode,
                    }),
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    const errBody = await response
                        .json()
                        .catch(() => ({ error: response.statusText }));
                    throw new Error(
                        errBody.error || `HTTP ${response.status}`,
                    );
                }

                const finalMsg = await parseUIMessageStream(response, {
                    onMessageStart: (id) => {
                        assistantMsg.id = id;
                    },
                    onTextDelta: () => {
                        setCurrentMessage({ ...assistantMsg, parts: [...assistantMsg.parts] });
                    },
                    onReasoningDelta: () => {
                        setCurrentMessage({ ...assistantMsg, parts: [...assistantMsg.parts] });
                    },
                    onToolCall: () => {
                        setCurrentMessage({ ...assistantMsg, parts: [...assistantMsg.parts] });
                    },
                    onToolResult: () => {
                        setCurrentMessage({ ...assistantMsg, parts: [...assistantMsg.parts] });
                    },
                    onError: (err) => {
                        setError(err);
                    },
                });

                // Move completed message to static
                if (finalMsg && finalMsg.parts.length > 0) {
                    historyRef.current = [...historyRef.current, finalMsg];
                    setCompletedMessages((prev) => [...prev, finalMsg]);
                }
            } catch (err: unknown) {
                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    // User cancelled
                } else {
                    setError(
                        err instanceof Error ? err.message : "Request failed",
                    );
                }
            } finally {
                setCurrentMessage(null);
                setIsStreaming(false);
                abortRef.current = null;
            }
        },
        [serverUrl, threadId, mode, isStreaming],
    );

    useInput((ch, key) => {
        if (key.ctrl && ch === "c") {
            if (isStreaming && abortRef.current) {
                abortRef.current.abort();
            } else {
                exit();
            }
            return;
        }

        if (key.tab) {
            setMode((m) => (m === "plan" ? "build" : "plan"));
            return;
        }

        if (key.escape) {
            if (isStreaming && abortRef.current) {
                abortRef.current.abort();
            }
            return;
        }

        if (key.return) {
            sendMessage(input);
            return;
        }

        if (key.backspace || key.delete) {
            setInput((prev) => prev.slice(0, -1));
            return;
        }

        if (key.upArrow) {
            const hist = messageHistoryRef.current;
            if (hist.length > 0) {
                const nextIdx = Math.min(
                    historyIdxRef.current + 1,
                    hist.length - 1,
                );
                historyIdxRef.current = nextIdx;
                setInput(hist[nextIdx]);
            }
            return;
        }

        if (key.downArrow) {
            const hist = messageHistoryRef.current;
            if (historyIdxRef.current > 0) {
                historyIdxRef.current -= 1;
                setInput(hist[historyIdxRef.current]);
            } else {
                historyIdxRef.current = -1;
                setInput("");
            }
            return;
        }

        // Regular character input
        if (ch && !key.ctrl && !key.meta) {
            setInput((prev) => prev + ch);
        }
    });

    const modeColor = getModeColor(mode);
    const showWelcome = completedMessages.length === 0 && !isStreaming;

    return (
        <Box flexDirection="column">
            {/* Static region: completed messages (won't re-render) */}
            <Static items={completedMessages}>
                {(msg, idx) => (
                    <Box key={msg.id || idx} flexDirection="column">
                        {idx === 0 && <RobotAscii mode={mode} />}
                        <ChatMessage message={msg} mode={mode} />
                    </Box>
                )}
            </Static>

            {/* Dynamic region: current streaming + input */}
            <Box flexDirection="column">
                {showWelcome && <RobotAscii mode={mode} />}

                {currentMessage && currentMessage.parts.length > 0 && (
                    <ChatMessage message={currentMessage} mode={mode} />
                )}

                {isStreaming && currentMessage && currentMessage.parts.length === 0 && (
                    <ThinkingIndicator mode={mode} />
                )}

                {error && (
                    <Box>
                        <Text color="red">Error: {error}</Text>
                    </Box>
                )}

                {/* Input */}
                <Box
                    borderStyle="round"
                    borderColor={isStreaming ? "gray" : modeColor}
                    paddingX={1}
                    marginTop={1}
                >
                    <Text color={modeColor}>
                        {mode === "plan" ? "plan" : "build"}
                        {" ❯ "}
                    </Text>
                    <Text>
                        {input}
                        {!isStreaming && (
                            <Text color={modeColor}>▋</Text>
                        )}
                    </Text>
                </Box>

                <StatusBar mode={mode} cwd={cwd} />
            </Box>
        </Box>
    );
}
