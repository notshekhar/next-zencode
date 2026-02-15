"use client";

import { cn } from "@/lib/utils";

import { useState, useRef, useEffect, memo, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Pause, CornerRightUp, X, Reply, Hammer, Map } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import {
    replyContextAtom,
    selectedModelAtom,
    modelsAtom,
    modelsLoadingAtom,
    modelsErrorAtom,
    modelsInitializedAtom,
    chatModeAtom,
    type ChatMode,
} from "@/store";
import { useRouter } from "next/navigation";
import { WriteIcon } from "./ui/write-icon";
import { ModelSelector } from "./model-selector";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
    showStopButton?: boolean;
    onStop?: () => void;
    usageData?: any | null;
}

// Memoized button components to prevent re-renders
const SendButton = memo(
    ({
        showStopButton,
        onStop,
        onSend,
        disabled,
        inputRef,
        clearInput,
    }: {
        showStopButton: boolean;
        onStop?: () => void;
        onSend: (message: string) => void;
        disabled: boolean;
        inputRef: React.RefObject<HTMLTextAreaElement | null>;
        clearInput: () => void;
    }) => {
        const handleClick = useCallback(() => {
            if (showStopButton) {
                onStop?.();
            } else {
                const currentInput = inputRef.current?.value || "";
                if (currentInput.trim() && !disabled) {
                    onSend(currentInput);
                    clearInput();
                }
            }
        }, [showStopButton, onStop, onSend, disabled, inputRef, clearInput]);

        return (
            <div
                onClick={handleClick}
                className="fade-in animate-in cursor-pointer text-muted-foreground rounded-full p-2 bg-secondary hover:bg-accent-foreground hover:text-accent transition-all duration-200"
            >
                {showStopButton ? (
                    <Pause
                        size={16}
                        className="fill-muted-foreground text-muted-foreground"
                    />
                ) : (
                    <CornerRightUp size={16} />
                )}
            </div>
        );
    },
);

// Reply context preview component
const ReplyContextPreview = memo(
    ({
        replyContext,
        onClear,
    }: {
        replyContext: {
            messageId: string;
            selectedText: string;
            role: "user" | "assistant";
        } | null;
        onClear: () => void;
    }) => {
        if (!replyContext) return null;

        return (
            <div className="flex items-start gap-2 px-3 pt-3">
                <div className="flex-1 flex items-start gap-2 py-2 bg-background border-l-2 rounded-r-lg">
                    <Reply className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0 rotate-180" />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground">
                            Replying to{" "}
                            {replyContext.role === "user"
                                ? "yourself"
                                : "assistant"}
                        </span>
                        <span className="text-sm text-muted-foreground line-clamp-2 break-words">
                            {replyContext.selectedText}
                        </span>
                    </div>
                    <button
                        onClick={onClear}
                        className="p-1 hover:bg-accent rounded-full transition-colors shrink-0"
                    >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>
        );
    },
);

export const ChatInput = memo(
    ({
        onSend,
        disabled = false,
        placeholder,
        showStopButton = false,
        onStop,
        usageData,
    }: ChatInputProps) => {
        const defaultPlaceholder = "Ask anything...";
        const [input, setInput] = useState("");
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const router = useRouter();

        const models = useAtomValue(modelsAtom);
        const selectedModel = useAtomValue(selectedModelAtom);
        const modelsLoading = useAtomValue(modelsLoadingAtom);
        const modelsError = useAtomValue(modelsErrorAtom);
        const modelsInitialized = useAtomValue(modelsInitializedAtom);
        const currentModel = models.find((m) => m.id === selectedModel) || null;
        const [replyContext, setReplyContext] = useAtom(replyContextAtom);
        const [chatMode, setChatMode] = useAtom(chatModeAtom);

        const toggleMode = useCallback(() => {
            setChatMode((prev: ChatMode) =>
                prev === "build" ? "plan" : "build",
            );
        }, [setChatMode]);

        const isPlanMode = chatMode === "plan";

        // Check if models are unavailable (loading, error, or empty after initialization)
        const modelsUnavailable =
            modelsLoading ||
            modelsError ||
            (modelsInitialized && models.length === 0);

        const isContextLimitReached = useMemo(() => {
            if (
                !currentModel ||
                !usageData ||
                !usageData?.tokenUsage ||
                !usageData?.tokenUsage?.total
            )
                return false;
            const limit = currentModel.provider.limit.context;
            const usage = usageData.tokenUsage.total;
            return (usage / limit) * 100 >= 80;
        }, [currentModel, usageData]);

        const isDisabled =
            disabled || isContextLimitReached || modelsUnavailable;

        const clearInput = useCallback(() => {
            setInput("");
        }, []);

        const handleSend = useCallback(() => {
            if (input.trim() && !isDisabled) {
                onSend(input);
                clearInput();
            }
        }, [input, isDisabled, onSend, clearInput]);

        const handleKeyPress = useCallback(
            (e: React.KeyboardEvent) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            },
            [handleSend],
        );

        const handleInputChange = useCallback(
            (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setInput(e.target.value);
            },
            [],
        );

        const handleReplyRemove = useCallback(() => {
            setReplyContext(null);
        }, []);

        // Auto-resize textarea
        useEffect(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`; // 128px = 8rem
            }
        }, [input]);

        useEffect(() => {
            if (!isDisabled && textareaRef) {
                textareaRef.current?.focus();
            }
        }, [isDisabled]);

        return (
            <div className="max-w-3xl mx-auto fade-in animate-in">
                {isContextLimitReached && (
                    <div className="mb-4 p-4 border border-border rounded-lg flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-medium text-foreground">
                                Context Limit Approaching
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                The conversation is getting long. Start a new
                                chat to continue.
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                router.push("/");
                                router.refresh();
                            }}
                            variant="default"
                            size="sm"
                            className="gap-2 shrink-0"
                        >
                            <WriteIcon className="size-4" />
                            Create New Chat
                        </Button>
                    </div>
                )}
                <div className="z-10 mx-auto w-full max-w-3xl relative">
                    <fieldset className="flex w-full min-w-0 max-w-full flex-col px-2">
                        <div
                            className={cn(
                                "overflow-hidden rounded-xl transition-all duration-200 bg-muted relative flex w-full flex-col cursor-text z-10 items-stretch focus-within:bg-muted hover:bg-muted",
                                isPlanMode
                                    ? "ring-2 ring-amber-500/60"
                                    : "ring-8 ring-muted focus-within:ring-muted hover:ring-muted",
                            )}
                        >
                            {/* Reply Context Preview */}
                            <ReplyContextPreview
                                replyContext={replyContext}
                                onClear={handleReplyRemove}
                            />
                            <div className="flex flex-col gap-3.5 px-3 py-2">
                                <div className="relative min-h-[2rem]">
                                    <textarea
                                        ref={textareaRef}
                                        placeholder={
                                            isContextLimitReached
                                                ? "Context limit reached. Please start a new thread."
                                                : placeholder ||
                                                  defaultPlaceholder
                                        }
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyPress={handleKeyPress}
                                        disabled={isDisabled}
                                        className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base resize-none min-h-[2rem] max-h-32 px-0 text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        rows={1}
                                        style={{
                                            minHeight: "2rem",
                                            maxHeight: "8rem",
                                            overflowY: "auto",
                                        }}
                                    />
                                </div>
                                <div className="flex w-full items-center gap-1 z-30">
                                    {/* Mode toggle */}
                                    <button
                                        type="button"
                                        onClick={toggleMode}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer",
                                            isPlanMode
                                                ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                                                : "bg-transparent text-muted-foreground hover:bg-accent",
                                        )}
                                        title={
                                            isPlanMode
                                                ? "Switch to Build mode"
                                                : "Switch to Plan mode"
                                        }
                                    >
                                        {isPlanMode ? (
                                            <>
                                                <Map size={14} /> Plan
                                            </>
                                        ) : (
                                            <>
                                                <Hammer size={14} /> Build
                                            </>
                                        )}
                                    </button>

                                    <div className="flex-1" />

                                    <div className="flex items-center gap-[2px] justify-end shrink-0">
                                        <ModelSelector disabled={isDisabled} />

                                        <SendButton
                                            showStopButton={showStopButton}
                                            onStop={onStop}
                                            onSend={onSend}
                                            disabled={
                                                isDisabled ||
                                                input.trim() === ""
                                            }
                                            inputRef={textareaRef}
                                            clearInput={clearInput}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>
                </div>
            </div>
        );
    },
);
