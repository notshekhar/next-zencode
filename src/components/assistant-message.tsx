import { UIMessage } from "ai";
import { memo } from "react";
import { ChatActions } from "./chat-actions";
import { MemoizedMarkdown } from "./memoized-markdown";
import { ReasoningPart } from "./reasoning-part";
import { FilePart } from "./file-part";
import { ToolInvocationPart } from "./tool-invocation-part";

// NOTE: do this for reasoning part -> text-muted-foreground

export const AssistantMessage = memo(
    ({
        message,
        messageId,
        messageIndex,
        isStreaming,
        isLast,
        showActions = true,
    }: {
        message: UIMessage;
        messageId: string;
        messageIndex: number;
        isStreaming: boolean;
        isLast: boolean;
        showActions?: boolean;
    }) => {
        // Extract text content from message parts for the actions
        const textContent = message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(" ");

        return (
            <div
                className="flex justify-start max-w-3xl mx-auto w-full m-6"
                data-message-id={messageId}
                data-message-index={messageIndex}
                data-message-role="assistant"
            >
                <div className="rounded-lg py-2 max-w-full w-full">
                    {message.parts.map((part, index) => {
                        if (part.type === "text") {
                            return (
                                <MemoizedMarkdown key={index}>
                                    {part.text}
                                </MemoizedMarkdown>
                            );
                        } else if (part.type === "reasoning") {
                            return (
                                <ReasoningPart
                                    key={index}
                                    state={part.state as string}
                                    reasoning={part.text}
                                />
                            );
                        } else if (part.type === "file") {
                            return (
                                <div key={index} className="my-4">
                                    <FilePart part={part as any} />
                                </div>
                            );
                        } else if (part.type.startsWith("tool-")) {
                            return (
                                <ToolInvocationPart
                                    key={index}
                                    part={part as any}
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Chat Actions at the bottom of each assistant message */}
                    {showActions && (
                        <div className="mt-4 flex justify-start">
                            {!isStreaming ? (
                                <ChatActions
                                    messageId={messageId}
                                    message={message}
                                    content={textContent}
                                />
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        );
    },
);
