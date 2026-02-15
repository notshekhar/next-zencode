import React from "react";
import { Box, Text } from "ink";
import type { StreamMessage, StreamPart } from "../utils/stream.js";
import { colors, getModeColor } from "../utils/colors.js";

interface ChatMessageProps {
    message: StreamMessage;
    mode: "plan" | "build";
}

export function ChatMessage({ message, mode }: ChatMessageProps) {
    if (message.role === "user") {
        return <UserMessage message={message} />;
    }
    return <AssistantMessage message={message} mode={mode} />;
}

function UserMessage({ message }: { message: StreamMessage }) {
    const text = message.parts
        .filter((p): p is Extract<StreamPart, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");

    return (
        <Box marginY={0}>
            <Text color="gray" bold>
                {"❯ "}
            </Text>
            <Text bold>{text}</Text>
        </Box>
    );
}

function AssistantMessage({
    message,
    mode,
}: {
    message: StreamMessage;
    mode: "plan" | "build";
}) {
    const modeColor = getModeColor(mode);

    return (
        <Box flexDirection="column" marginY={0}>
            {message.parts.map((part, i) => (
                <PartRenderer key={i} part={part} modeColor={modeColor} />
            ))}
        </Box>
    );
}

function PartRenderer({
    part,
    modeColor,
}: {
    part: StreamPart;
    modeColor: string;
}) {
    switch (part.type) {
        case "text": {
            if (!part.text.trim()) return null;
            return (
                <Box>
                    <Text color={modeColor}>{"⏺ "}</Text>
                    <Text>{renderInlineMarkdown(part.text)}</Text>
                </Box>
            );
        }
        case "reasoning": {
            if (!part.reasoning.trim()) return null;
            return (
                <Box>
                    <Text dimColor>{"💭 "}</Text>
                    <Text dimColor italic>
                        {truncate(part.reasoning.trim(), 200)}
                    </Text>
                </Box>
            );
        }
        case "tool-invocation": {
            const { toolName, args, state, result } = part.toolInvocation;
            return (
                <Box flexDirection="column">
                    <Box>
                        <Text color={modeColor}>{"⏺ "}</Text>
                        <Text color="cyan" bold>
                            {formatToolName(toolName)}
                        </Text>
                        {state === "call" && (
                            <Text dimColor> (running...)</Text>
                        )}
                        {state === "result" && (
                            <Text color={colors.successGreen}> (done)</Text>
                        )}
                    </Box>
                    <ToolArgs toolName={toolName} args={args} />
                    {state === "result" && result != null && (
                        <ToolResult result={result} />
                    )}
                </Box>
            );
        }
        default:
            return null;
    }
}

function ToolArgs({
    toolName,
    args,
}: {
    toolName: string;
    args: Record<string, unknown>;
}) {
    const name = toolName.toLowerCase();

    if (name.includes("readfile") || name.includes("read_file")) {
        const path = (args.path || args.filePath || args.file) as string;
        if (path) {
            return (
                <Box marginLeft={2}>
                    <Text dimColor>{"⎿ "}</Text>
                    <Text dimColor>{path}</Text>
                </Box>
            );
        }
    }

    if (name.includes("editfile") || name.includes("edit_file") || name.includes("write_file") || name.includes("writefile")) {
        const path = (args.path || args.filePath || args.file) as string;
        if (path) {
            return (
                <Box marginLeft={2}>
                    <Text dimColor>{"⎿ "}</Text>
                    <Text dimColor>{path}</Text>
                </Box>
            );
        }
    }

    if (name.includes("bash") || name.includes("execute") || name.includes("run_command")) {
        const cmd = (args.command || args.cmd) as string;
        if (cmd) {
            return (
                <Box marginLeft={2}>
                    <Text dimColor>{"⎿ $ "}</Text>
                    <Text dimColor>{truncate(cmd, 100)}</Text>
                </Box>
            );
        }
    }

    // Generic: show first string arg
    const firstArg = Object.entries(args).find(
        ([, v]) => typeof v === "string",
    );
    if (firstArg) {
        return (
            <Box marginLeft={2}>
                <Text dimColor>{"⎿ "}</Text>
                <Text dimColor>
                    {firstArg[0]}: {truncate(String(firstArg[1]), 80)}
                </Text>
            </Box>
        );
    }

    return null;
}

function ToolResult({ result }: { result: unknown }) {
    const text =
        typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);

    const trimmed = truncate(text, 300);

    return (
        <Box marginLeft={2}>
            <Text dimColor>{"⎿ "}</Text>
            <Text dimColor>{trimmed}</Text>
        </Box>
    );
}

function formatToolName(name: string): string {
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .trim()
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());
}

function truncate(text: string, max: number): string {
    const oneLine = text.replace(/\n/g, " ").trim();
    if (oneLine.length <= max) return oneLine;
    return oneLine.slice(0, max - 3) + "...";
}

function renderInlineMarkdown(text: string): string {
    // Simple inline markdown - strip markers for terminal
    return text
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1");
}
