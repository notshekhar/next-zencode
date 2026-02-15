"use client";

import { cn } from "@/lib/utils";
import { UIMessage, TextUIPart } from "ai";
import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Check, Reply } from "lucide-react";
import { FileCard } from "./ui/file-card";
import { ImagePreview } from "./ui/image-preview";

// ==========================================
// Part Type Definitions
// ==========================================

// Extended text part with reply metadata
interface ReplyTextPart extends TextUIPart {
    isReply: true;
    replyToMessageId: string;
    replyToMessageIndex: number;
    replyToText: string;
    replyToTextOffset: number;
    replyToRole: "user" | "assistant";
}

interface ImagePart {
    type: "image";
    image: string;
    mimeType?: string;
}

interface FilePart {
    type: "file";
    url?: string;
    name?: string;
    filename?: string;
    mimeType?: string;
    mediaType?: string;
    size?: number;
}

// Union type for all supported parts
type UserMessagePartType = TextUIPart | ReplyTextPart | ImagePart | FilePart;

// ==========================================
// Type Guards
// ==========================================

function isReplyPart(part: unknown): part is ReplyTextPart {
    return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "isReply" in part &&
        part.isReply === true
    );
}

function isTextPart(part: unknown): part is TextUIPart {
    return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        !isReplyPart(part)
    );
}

function isImagePart(part: unknown): part is ImagePart {
    if (typeof part !== "object" || part === null) return false;
    const p = part as any;
    return (
        p.type === "image" ||
        (p.type === "file" &&
            (p.mimeType?.startsWith("image/") ||
                p.mediaType?.startsWith("image/")))
    );
}

function isFilePart(part: unknown): part is FilePart {
    if (typeof part !== "object" || part === null) return false;
    const p = part as any;
    return (
        p.type === "file" &&
        !p.mimeType?.startsWith("image/") &&
        !p.mediaType?.startsWith("image/")
    );
}

// ==========================================
// Reply Part Component
// ==========================================
interface ReplyPartProps {
    part: ReplyTextPart;
    onScrollToReply: (targetIndex: number, highlightText?: string) => void;
}

const ReplyPart = memo(function ReplyPart({
    part,
    onScrollToReply,
}: ReplyPartProps) {
    return (
        <button
            onClick={() =>
                onScrollToReply(part.replyToMessageIndex, part.replyToText)
            }
            className="flex items-start gap-2 mb-2 px-3 py-2 text-muted text-left max-w-[80%] transition-colors cursor-pointer"
        >
            <Reply className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0 rotate-180" />
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs text-muted-foreground">
                    Replying to{" "}
                    {part.replyToRole === "user" ? "yourself" : "assistant"}
                </span>
                <span className="text-sm text-muted-foreground line-clamp-2 break-words">
                    {part.replyToText}
                </span>
            </div>
        </button>
    );
});

ReplyPart.displayName = "ReplyPart";

// ==========================================
// Text Part Component
// ==========================================
interface TextPartProps {
    part: TextUIPart;
    isError?: boolean;
}

const TextPart = memo(function TextPart({ part, isError }: TextPartProps) {
    return (
        <div
            className={cn(
                "bg-accent text-accent-foreground rounded-2xl px-4 py-3 max-w-full",
                {
                    "opacity-50": isError,
                },
                isError && "border-destructive border",
            )}
        >
            <p className="whitespace-pre-wrap text-sm break-words">
                {part.text}
            </p>
        </div>
    );
});

TextPart.displayName = "TextPart";

// ==========================================
// Image Part Component
// ==========================================
interface ImagePartProps {
    part: ImagePart | FilePart;
    onPreview: (url: string) => void;
}

const ImagePart = memo(function ImagePartComponent({
    part,
    onPreview,
}: ImagePartProps) {
    const p = part as any;
    const url = p.url || p.image;
    const name = p.name || p.filename || "Image";

    if (!url) return null;

    return (
        <div
            className="relative rounded-lg overflow-hidden border border-border/20 w-24 h-24 shrink-0 bg-background/50 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onPreview(url)}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} className="w-full h-full object-cover" />
        </div>
    );
});

ImagePart.displayName = "ImagePart";

// ==========================================
// File Part Component
// ==========================================
interface FilePartProps {
    part: FilePart;
}

const FilePartComponent = memo(function FilePartComponent({
    part,
}: FilePartProps) {
    const name = part.name || part.filename || "Attachment";
    const mimeType = part.mimeType || part.mediaType;

    return <FileCard filename={name} size={part.size} type={mimeType} />;
});

FilePartComponent.displayName = "FilePartComponent";

// ==========================================
// Copy Button Component
// ==========================================
interface CopyButtonProps {
    textContent: string;
}

const CopyButton = memo(function CopyButton({ textContent }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            if (!textContent || textContent.trim() === "") {
                return;
            }

            await navigator.clipboard.writeText(textContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
            try {
                const textArea = document.createElement("textarea");
                textArea.value = textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackError) {
                console.error("Fallback copy also failed:", fallbackError);
            }
        }
    }, [textContent]);

    if (!textContent || textContent.trim() === "") return null;

    return (
        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-6 w-6 p-0 hover:bg-accent/50 rounded"
                    >
                        {copied ? (
                            <Check className="h-3 w-3 text-green-600" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
            </Tooltip>
        </div>
    );
});

CopyButton.displayName = "CopyButton";

// ==========================================
// User Message Part Renderer
// ==========================================
interface UserMessagePartProps {
    part: UserMessagePartType;
    index: number;
    isError?: boolean;
    onScrollToReply: (targetIndex: number, highlightText?: string) => void;
    onImagePreview: (url: string) => void;
}

const UserMessagePart = memo(function UserMessagePart({
    part,
    index,
    isError,
    onScrollToReply,
    onImagePreview,
}: UserMessagePartProps) {
    // Reply part
    if (isReplyPart(part)) {
        return (
            <ReplyPart
                key={index}
                part={part}
                onScrollToReply={onScrollToReply}
            />
        );
    }

    // Text part (non-reply)
    if (isTextPart(part)) {
        return <TextPart key={index} part={part} isError={isError} />;
    }

    // Image part
    if (isImagePart(part)) {
        return (
            <ImagePart
                key={index}
                part={part as ImagePart}
                onPreview={onImagePreview}
            />
        );
    }

    // File part
    if (isFilePart(part)) {
        return <FilePartComponent key={index} part={part} />;
    }

    // Unknown part type - can add more handlers here in the future
    // For now, return null for unsupported types
    console.warn(`Unknown user message part type:`, part);
    return null;
});

UserMessagePart.displayName = "UserMessagePart";

// ==========================================
// Main UserMessage Component
// ==========================================
interface UserMessageProps {
    message: UIMessage;
    messageId: string;
    messageIndex: number;
    isError?: boolean;
}

export const UserMessage = memo(function UserMessage({
    message,
    messageId,
    messageIndex,
    isError,
}: UserMessageProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Scroll to message and select the quoted text
    const scrollToReply = useCallback(
        (targetIndex: number, highlightText?: string) => {
            const el = document.getElementById(`message-${targetIndex}`);
            if (!el) return;

            el.scrollIntoView({ behavior: "smooth", block: "center" });

            if (!highlightText) return;

            setTimeout(() => {
                const searchText = highlightText.slice(0, 150);
                const walker = document.createTreeWalker(
                    el,
                    NodeFilter.SHOW_TEXT,
                );
                const nodes: Text[] = [];
                let node: Text | null;

                // Collect all text nodes
                while ((node = walker.nextNode() as Text)) {
                    nodes.push(node);
                }

                // Build full text and find position
                let fullText = "";
                const positions: { node: Text; start: number }[] = [];

                for (const n of nodes) {
                    positions.push({ node: n, start: fullText.length });
                    fullText += n.textContent || "";
                }

                const matchIdx = fullText.indexOf(searchText);
                if (matchIdx === -1) return;

                // Find start node and offset
                let startNode: Text | null = null;
                let startOffset = 0;
                let endNode: Text | null = null;
                let endOffset = 0;
                const endIdx = matchIdx + searchText.length;

                for (let i = 0; i < positions.length; i++) {
                    const pos = positions[i];
                    const nodeEnd =
                        pos.start + (pos.node.textContent?.length || 0);

                    if (
                        !startNode &&
                        matchIdx >= pos.start &&
                        matchIdx < nodeEnd
                    ) {
                        startNode = pos.node;
                        startOffset = matchIdx - pos.start;
                    }
                    if (endIdx > pos.start && endIdx <= nodeEnd) {
                        endNode = pos.node;
                        endOffset = endIdx - pos.start;
                        break;
                    }
                }

                if (startNode && endNode) {
                    const range = document.createRange();
                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);

                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);

                    setTimeout(() => selection?.removeAllRanges(), 2000);
                }
            }, 300);
        },
        [],
    );

    // Handle image preview
    const handleImagePreview = useCallback((url: string) => {
        setPreviewUrl(url);
        setIsPreviewOpen(true);
    }, []);

    // Extract text content for copy button
    const textContent = message.parts
        .filter((part): part is TextUIPart => isTextPart(part))
        .map((part) => part.text)
        .join("\n");

    return (
        <div
            className="group flex flex-col items-end max-w-3xl mx-auto w-full"
            data-message-id={messageId}
            data-message-index={messageIndex}
            data-message-role="user"
        >
            {/* Render each part dynamically */}
            {message.parts.map((part, index) => (
                <UserMessagePart
                    key={index}
                    part={part as UserMessagePartType}
                    index={index}
                    isError={isError}
                    onScrollToReply={scrollToReply}
                    onImagePreview={handleImagePreview}
                />
            ))}

            {/* Copy Button */}
            <CopyButton textContent={textContent} />

            {/* Image Preview Dialog */}
            <ImagePreview
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                url={previewUrl}
            />
        </div>
    );
});

UserMessage.displayName = "UserMessage";
