import { isToolUIPart, type UIMessage } from "ai";

const MAX_TEXT_PART_LENGTH = 20_000;
const MAX_TOOL_OUTPUT_LENGTH = 25_000;

function truncateWithNotice(value: string, limit: number): string {
    if (value.length <= limit) return value;
    const removed = value.length - limit;
    return `${value.slice(0, limit)}\n\n...[truncated ${removed} chars]`;
}

export function compactMessageParts(
    parts: UIMessage["parts"],
): UIMessage["parts"] {
    return parts.map((part) => {
        if (part.type === "text") {
            const textPart = part as { type: "text"; text: string };
            if (
                !textPart.text ||
                textPart.text.length <= MAX_TEXT_PART_LENGTH
            ) {
                return part;
            }
            return {
                ...part,
                text: truncateWithNotice(textPart.text, MAX_TEXT_PART_LENGTH),
            };
        }

        if (isToolUIPart(part)) {
            const toolPart = part as any;
            if (typeof toolPart.output === "string") {
                if (toolPart.output.length <= MAX_TOOL_OUTPUT_LENGTH) {
                    return part;
                }
                return {
                    ...toolPart,
                    output: truncateWithNotice(
                        toolPart.output,
                        MAX_TOOL_OUTPUT_LENGTH,
                    ),
                };
            }
        }

        return part;
    });
}
