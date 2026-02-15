"use client";

import { memo, useState, useCallback, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronDown,
    ChevronRight,
    Check,
    Loader2,
    AlertCircle,
    Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolPartState {
    toolCallId: string;
    state:
        | "input-streaming"
        | "input-available"
        | "output-available"
        | "output-error"
        | "output-denied"
        | string;
    input?: any;
    output?: any;
    errorText?: string;
}

interface ToolWrapperProps {
    part: ToolPartState;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    inputSummary: string;
    children?: ReactNode;
    alwaysExpanded?: boolean;
}

export const ToolWrapper = memo(
    function ToolWrapper({
        part,
        icon: Icon,
        label,
        inputSummary,
        children,
        alwaysExpanded,
    }: ToolWrapperProps) {
        const [isExpanded, setIsExpanded] = useState(alwaysExpanded ?? false);

        const isRunning =
            part.state === "input-streaming" ||
            part.state === "input-available";
        const isDone = part.state === "output-available";
        const isError = part.state === "output-error";
        const isDenied = part.state === "output-denied";
        const hasExpandableContent = (isDone || isError) && children;
        const isCollapsible = hasExpandableContent && !alwaysExpanded;

        const toggleExpand = useCallback(() => {
            setIsExpanded((prev) => !prev);
        }, []);

        return (
            <div className="my-1 w-full max-w-full border border-border rounded-xl bg-card">
                <button
                    type="button"
                    onClick={isCollapsible ? toggleExpand : undefined}
                    className={cn(
                        "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg transition-colors",
                        isCollapsible && "hover:bg-muted cursor-pointer",
                        !isCollapsible && "cursor-default",
                        "group",
                        isError && "text-destructive",
                    )}
                >
                    {/* Tool icon */}
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

                    {/* Label + input summary */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                            {label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate font-mono">
                            {inputSummary}
                        </span>
                    </div>

                    {/* State indicator */}
                    <div className="flex items-center justify-center h-6 w-6 shrink-0">
                        {isRunning && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {isDone && (
                            <Check className="h-4 w-4 text-emerald-500" />
                        )}
                        {isError && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        {isDenied && (
                            <Ban className="h-4 w-4 text-orange-500" />
                        )}
                    </div>

                    {/* Expand chevron */}
                    {isCollapsible && (
                        <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                            {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                            )}
                        </div>
                    )}
                </button>

                {/* Always-expanded content */}
                {alwaysExpanded && hasExpandableContent && (
                    <div className="ml-[3.25rem] mt-1 mb-2">{children}</div>
                )}

                {/* Collapsible content */}
                <AnimatePresence initial={false}>
                    {isExpanded && isCollapsible && (
                        <motion.div
                            key="output"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <div className="ml-[3.25rem] mt-1 mb-2">
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    },
    (prev, next) => {
        return (
            prev.part.toolCallId === next.part.toolCallId &&
            prev.part.state === next.part.state &&
            prev.part.output === next.part.output &&
            prev.part.errorText === next.part.errorText &&
            prev.inputSummary === next.inputSummary
        );
    },
);

/** Truncate long strings */
export function truncate(str: string, max: number): string {
    if (!str) return "";
    const singleLine = str.replace(/\n/g, " ").trim();
    return singleLine.length > max
        ? singleLine.slice(0, max) + "…"
        : singleLine;
}

/** Truncate long output */
export function truncateOutput(str: string, max: number = 3000): string {
    if (str.length <= max) return str;
    return str.slice(0, max) + "\n\n… (output truncated)";
}

/** Format output to string */
export function formatOutput(output: any): string | null {
    if (!output) return null;
    if (typeof output === "string") return output;
    try {
        return JSON.stringify(output, null, 2);
    } catch {
        return String(output);
    }
}

/** Default output renderer */
export function DefaultOutputView({ part }: { part: ToolPartState }) {
    const isError = part.state === "output-error";
    const isDone = part.state === "output-available";
    const formatted = formatOutput(part.output);

    return (
        <>
            {isError && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {isDone && formatted && (
                <pre className="text-xs text-muted-foreground bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-border">
                    {truncateOutput(formatted)}
                </pre>
            )}
        </>
    );
}
