"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInput } from "./chat-input";
import React, { useRef, useCallback, useEffect } from "react";

import { useTranslations } from "next-intl";
import { useAtomValue, useSetAtom, useAtom } from "jotai";
import {
    selectedModelAtom,
    selectedThinkingConfigAtom,
    replyContextAtom,
    chatModeAtom,
    selectedSkillsAtom,
} from "@/store";
import { v7 } from "uuid";
import { errorToast } from "@/hooks/errorToast";
import { Greeting } from "./greeting";
import { TextSelectionReply } from "./text-selection-reply";
import { MessageScrollIndicator } from "./message-scroll-indicator";
import { CornerDownRight } from "lucide-react";
import { ThinkingDot } from "./thinking-dot";
import { ErrorMessage } from "./error-message";
import { Message } from "./message";

export const Chat = React.memo(
    ({
        threadId,
        initialMessages,
    }: {
        threadId: string;
        initialMessages?: any;
    }) => {
        const endContainerRef = useRef<HTMLDivElement>(null);
        const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

        const startAudio = useRef<HTMLAudioElement>(null);

        const selectedModel = useAtomValue(selectedModelAtom);
        const selectedThinkingConfig = useAtomValue(selectedThinkingConfigAtom);
        const [replyContext, setReplyContext] = useAtom(replyContextAtom);
        const chatMode = useAtomValue(chatModeAtom);
        const selectedSkills = useAtomValue(selectedSkillsAtom);

        // Use a ref to always get the latest selected model value
        const selectedModelRef = useRef(selectedModel);
        selectedModelRef.current = selectedModel;

        const selectedThinkingConfigRef = useRef(selectedThinkingConfig);
        selectedThinkingConfigRef.current = selectedThinkingConfig;

        const chatModeRef = useRef(chatMode);
        chatModeRef.current = chatMode;

        const selectedSkillsRef = useRef(selectedSkills);
        selectedSkillsRef.current = selectedSkills;

        const { messages, sendMessage, status, stop, error, regenerate } =
            useChat({
                transport: new DefaultChatTransport({
                    api: `/api/chat`,
                    credentials: "include",
                    body: () => {
                        return {
                            threadId,
                            modelId: selectedModelRef.current,
                            selectedThinkingConfig:
                                selectedThinkingConfigRef.current,
                            mode: chatModeRef.current,
                            selectedSkillNames: selectedSkillsRef.current,
                        };
                    },

                    prepareSendMessagesRequest: ({
                        body,
                        messages,
                        trigger,
                    }) => {
                        const lastMessage = messages[messages.length - 1];

                        return {
                            body: {
                                ...body,
                                trigger,
                                message: lastMessage,
                                messages: undefined,
                            },
                        };
                    },
                }),

                id: threadId,

                messages: initialMessages,

                onError: (error) => {
                    errorToast(error);
                },

                onData: (dataPart) => {},

                onFinish: () => {
                    if (typeof window !== "undefined") {
                        window.history.replaceState(
                            null,
                            "",
                            `/chat/${threadId}`,
                        );
                    }
                },
            });

        // Store sendMessage in a ref to prevent it from changing on every render
        const sendMessageRef = useRef(sendMessage);
        sendMessageRef.current = sendMessage;

        const scrollToBottom = useCallback(() => {
            endContainerRef.current?.scrollIntoView({
                behavior: "smooth",
            });
        }, [endContainerRef]);

        useEffect(() => {
            if (status === "submitted") {
                scrollToBottom();
            }
        }, [status, scrollToBottom]);

        // Scroll to bottom on first load when there are initial messages
        useEffect(() => {
            if (initialMessages && initialMessages.length > 0) {
                // Use a small delay to ensure the component is fully rendered
                const timer = setTimeout(() => {
                    scrollToBottom();
                }, 100);
                return () => clearTimeout(timer);
            }
        }, [initialMessages, scrollToBottom]);

        // Core function to actually send the message
        const sendActualMessage = useCallback(
            (text: string) => {
                const parts: any[] = [];

                // Add reply context as text type with metadata so backend includes it for the model
                if (replyContext) {
                    parts.push({
                        type: "text",
                        text: `> Replying to ${replyContext.role === "user" ? "my previous message" : "assistant"}:\n> "${replyContext.selectedText}"\n\n`,
                        // Metadata for UI to identify this as a reply
                        isReply: true,
                        replyToMessageId: replyContext.messageId,
                        replyToMessageIndex: replyContext.messageIndex,
                        replyToText: replyContext.selectedText,
                        replyToTextOffset: replyContext.textOffset,
                        replyToRole: replyContext.role,
                    });
                    setReplyContext(null);
                }

                if (text) {
                    parts.push({
                        type: "text",
                        text,
                    });
                }

                const messageId = v7();

                sendMessageRef.current({
                    id: messageId,
                    role: "user",
                    parts: parts,
                });
            },
            [replyContext, setReplyContext],
        );

        // Handler that checks if user is logged in before sending
        const handleInputChange = useCallback(
            (text: string) => {
                sendActualMessage(text);
            },
            [sendActualMessage],
        );

        // Show greeting for users with no messages (both logged in and guests)
        if (messages.length === 0) {
            return <Greeting onFirstMessageSend={handleInputChange}></Greeting>;
        }

        return (
            <div className="flex flex-col min-w-0 w-full overflow-x-hidden px-4 md:px-6">
                {/* Visually hidden heading for SEO and accessibility */}
                <h1 className="sr-only">Chat Conversation</h1>
                {/* Messages Container - Natural height, no overflow */}
                <div className="flex flex-col gap-2 py-6 pb-32 w-full md:px-0">
                    {messages.map((message, index) => {
                        return (
                            <div
                                key={index}
                                ref={(el) => {
                                    if (messageRefs.current) {
                                        messageRefs.current[index] = el;
                                    }
                                }}
                                id={`message-${index}`}
                            >
                                <Message
                                    message={message}
                                    messageIndex={index}
                                    isStreaming={
                                        index === messages.length - 1 &&
                                        status === "streaming"
                                    }
                                    isLast={index === messages.length - 1}
                                />
                            </div>
                        );
                    })}
                    {error && (
                        <ErrorMessage error={error} onRetry={regenerate} />
                    )}
                    {(status === "submitted" || status === "streaming") && (
                        <ThinkingDot />
                    )}
                    {/* Add bottom padding to ensure last message is visible */}
                    <div className="h-50" />
                    <div className="h-4" ref={endContainerRef} />
                </div>

                {/* Message Scroll Indicator */}
                {messages.length > 1 && (
                    <MessageScrollIndicator
                        messageRefs={messageRefs}
                        messageCount={messages.length}
                        messages={messages}
                    />
                )}

                {/* Text Selection Reply Popup - Single instance for all messages */}
                <TextSelectionReply />

                <div className="absolute bottom-0 left-0 right-0 w-full pb-6 px-4 md:px-0">
                    <ChatInput
                        onSend={handleInputChange}
                        disabled={status !== "ready"}
                        showStopButton={status !== "ready"}
                        onStop={stop}
                    />
                </div>
            </div>
        );
    },
);
