"use client";

import React, { memo, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Copy, Download, Check, Zap, ChartColumn } from "lucide-react";
import { motion } from "framer-motion";
import { UIMessage } from "ai";

interface ChatActionsProps {
    messageId: string;
    content: string;
    message: UIMessage;
    onCopy?: () => void;
    onDownload?: () => void;
    className?: string;
}

export const ChatActions = memo(
    ({
        messageId,
        content,
        message,
        onCopy,
        onDownload,
        className = "",
    }: ChatActionsProps) => {
        const [copied, setCopied] = useState(false);

        const handleCopy = async () => {
            try {
                console.log("Copying content:", content); // Debug log
                if (!content || content.trim() === "") {
                    console.log("Content is empty, not copying");
                    return;
                }

                await navigator.clipboard.writeText(content);
                setCopied(true);
                onCopy?.();
                setTimeout(() => setCopied(false), 2000);
            } catch (error) {
                console.error("Failed to copy:", error);
                // Fallback for older browsers
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = content;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textArea);
                    setCopied(true);
                    onCopy?.();
                    setTimeout(() => setCopied(false), 2000);
                } catch (fallbackError) {
                    console.error("Fallback copy also failed:", fallbackError);
                }
            }
        };

        const handleDownload = () => {
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `chat-message-${messageId}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            onDownload?.();
        };

        const metadata = message?.metadata as
            | {
                  modelName?: string;
                  modelIcon?: string;
                  tokensPerSecond?: number;
              }
            | undefined;
        const modelName = metadata?.modelName ?? "";
        const modelIcon = metadata?.modelIcon ?? "";
        const tokensPerSecond = metadata?.tokensPerSecond ?? 0;

        // Extract usage data from message parts
        const usageData = useMemo(() => {
            const usagePart = message?.parts?.find(
                (part: any) => part.type === "data-usage",
            ) as any;
            return usagePart?.data?.usage ?? null;
        }, [message?.parts]);

        const tokenUsage = useMemo(() => {
            const usagePart = message?.parts?.find(
                (part: any) => part.type === "data-usage",
            ) as any;
            return usagePart?.data?.tokenUsage ?? null;
        }, [message?.parts]);

        const handleUsageOpenChange = useCallback(
            (open: boolean) => {
                if (open) {
                }
            },
            [modelName, tokenUsage, usageData],
        );

        const formatCost = (cost: number) => {
            return `$${cost.toFixed(6)}`;
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-1 ${className}`}
            >
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
                    <TooltipContent>
                        {copied ? "Copied" : "Copy"}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownload}
                            className="h-6 w-6 p-0 hover:bg-accent/50 rounded"
                        >
                            <Download className="h-3 w-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{"Download"}</TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-1 ml-auto"></div>
                <div className="ml-4 text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    {(usageData || tokenUsage) && (
                        <Popover onOpenChange={handleUsageOpenChange}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-accent/50 rounded"
                                >
                                    <ChartColumn className="h-3 w-3" />
                                </Button>
                            </PopoverTrigger>
                        </Popover>
                    )}
                    {tokensPerSecond > 150 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Zap className="h-3 w-3 text-yellow-500 fill-yellow-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Lightning fast response</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {modelIcon && (
                        <img
                            src={modelIcon}
                            alt=""
                            className="h-4 w-4 rounded-full object-cover"
                        />
                    )}
                    <span className="font-medium">{modelName}</span>
                </div>
            </motion.div>
        );
    },
);

ChatActions.displayName = "ChatActions";
