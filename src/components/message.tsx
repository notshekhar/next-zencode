import { UIMessage } from "ai";
import React from "react";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";

export const Message = React.memo(
    ({
        message,
        messageIndex,
        isStreaming,
        isLast,
        showActions = true,
    }: {
        message: UIMessage;
        messageIndex: number;
        isStreaming: boolean;
        isLast: boolean;
        showActions?: boolean;
    }) => {
        const messageId = (message as any).id || `message-${messageIndex}`;

        if (message.role === "user") {
            return (
                <UserMessage
                    message={message}
                    messageId={messageId}
                    messageIndex={messageIndex}
                />
            );
        }

        return (
            <AssistantMessage
                message={message}
                messageId={messageId}
                messageIndex={messageIndex}
                isStreaming={isStreaming}
                isLast={isLast}
                showActions={showActions}
            />
        );
    },
    (prevProps, nextProps) => {
        return (
            prevProps.message === nextProps.message &&
            prevProps.messageIndex === nextProps.messageIndex &&
            prevProps.isStreaming === nextProps.isStreaming &&
            prevProps.isLast === nextProps.isLast &&
            prevProps.showActions === nextProps.showActions
        );
    },
);
