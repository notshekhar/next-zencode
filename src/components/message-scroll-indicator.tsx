"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { UIMessage } from "ai";

interface MessageStripProps {
    message: UIMessage;
    index: number;
    activeIndex: number;
    onScrollToMessage: (index: number) => void;
}

const MessageStrip = React.memo(
    ({ message, index, activeIndex, onScrollToMessage }: MessageStripProps) => {
        const isAssistant = message.role === "assistant";
        const isUser = message.role === "user";

        const getMessagePreview = (msg: UIMessage): string => {
            // Extract text from message parts
            let textContent = "";

            if (msg.parts) {
                for (const part of msg.parts) {
                    if (part.type === "text") {
                        textContent += part.text + " ";
                    }
                }
            }

            // Get the first 2 lines
            const lines = textContent.split("\n").filter((line) => line.trim());
            const firstTwoLines = lines.slice(0, 2).join(" ");

            // Limit to 150 characters for 2 lines
            const preview =
                firstTwoLines.length > 150
                    ? firstTwoLines.substring(0, 147) + "..."
                    : firstTwoLines;

            return preview || `Message ${index + 1}`;
        };

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => onScrollToMessage(index)}
                        className={cn(
                            "py-1.5 md:py-1.5 px-1 md:px-1 rounded-md transition-all duration-300 ease-out relative overflow-visible group w-full hover:bg-muted hover:opacity-30",
                            isAssistant && "flex justify-start",
                            isUser && "flex justify-end",
                        )}
                        aria-label={`Scroll to message ${index + 1}`}
                    >
                        {/* Visual strip */}
                        <span
                            className={cn(
                                "block h-[2.5px] rounded-full transition-all duration-300 ease-out relative overflow-hidden",
                                isAssistant && "w-[70%]",
                                isUser && "w-full",
                                index === activeIndex
                                    ? "bg-primary h-[4px] shadow-lg shadow-primary opacity-30"
                                    : "bg-muted-foreground opacity-20 group-hover:bg-muted-foreground group-hover:opacity-50 group-hover:h-[3.5px]",
                            )}
                        >
                            {/* Shine effect on hover */}
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                            {/* Active indicator glow */}
                            {index === activeIndex && (
                                <span className="absolute inset-0 bg-primary opacity-20 animate-pulse" />
                            )}
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="left"
                    sideOffset={10}
                    className="max-w-[300px] text-sm"
                >
                    <div className="line-clamp-2">
                        {getMessagePreview(message)}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render if the message content or active state changed
        return (
            prevProps.message === nextProps.message &&
            prevProps.activeIndex === nextProps.activeIndex &&
            prevProps.index === nextProps.index
        );
    },
);

MessageStrip.displayName = "MessageStrip";

interface ScrollButtonProps {
    isVisible: boolean;
    onClick: () => void;
    direction: "up" | "down";
}

const ScrollButton = React.memo(
    ({ isVisible, onClick, direction }: ScrollButtonProps) => {
        return (
            <button
                onClick={onClick}
                disabled={isVisible}
                className={cn(
                    "transition-all duration-200",
                    isVisible
                        ? "text-muted-foreground opacity-30 cursor-not-allowed"
                        : "text-primary hover:text-primary hover:opacity-80 active:scale-90",
                )}
                aria-label={`Scroll to ${direction === "up" ? "top" : "bottom"}`}
            >
                {direction === "up" ? (
                    <ChevronUp className="h-3 w-3 md:h-3 md:w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3 md:h-3 md:w-3" />
                )}
            </button>
        );
    },
    (prevProps, nextProps) => {
        // Only re-render if visibility state changes
        return prevProps.isVisible === nextProps.isVisible;
    },
);

ScrollButton.displayName = "ScrollButton";

interface MessageScrollIndicatorProps {
    messageRefs: React.RefObject<(HTMLDivElement | null)[]>;
    messageCount: number;
    messages: UIMessage[];
    containerRef?: React.RefObject<HTMLDivElement>;
}

export const MessageScrollIndicator = React.memo(
    ({ messageRefs, messageCount, messages }: MessageScrollIndicatorProps) => {
        const [activeIndex, setActiveIndex] = useState(0);
        const [isTopVisible, setIsTopVisible] = useState(true);
        const [isBottomVisible, setIsBottomVisible] = useState(false);
        const scrollContainerRef = useRef<HTMLElement | null>(null);

        const handleScroll = useCallback(() => {
            if (!messageRefs.current || !scrollContainerRef.current) {
                console.log("Missing refs:", {
                    messageRefs: !!messageRefs.current,
                    scrollContainer: !!scrollContainerRef.current,
                });
                return;
            }

            const container = scrollContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const viewportTop = containerRect.top + 50; // Add small offset from top

            let topVisibleIndex = 0;
            let minDistance = Infinity;

            // Find the first message that's visible from the top
            messageRefs.current.forEach((ref, index) => {
                if (ref) {
                    const rect = ref.getBoundingClientRect();

                    // Check if message is visible in viewport
                    const isVisible =
                        rect.bottom > containerRect.top &&
                        rect.top < containerRect.bottom;

                    if (isVisible) {
                        // Calculate distance from viewport top
                        // Prefer messages whose top is closest to viewport top
                        const distance = rect.top - viewportTop;

                        // If this message starts before or very close to viewport top
                        // and is closer than previous best match
                        if (
                            distance < minDistance &&
                            rect.bottom > viewportTop
                        ) {
                            minDistance = distance;
                            topVisibleIndex = index;
                        }
                    }
                }
            });

            console.log("Active index:", topVisibleIndex);
            setActiveIndex(topVisibleIndex);

            // Check if top is visible (with a small threshold)
            const scrollTop = container.scrollTop;
            setIsTopVisible(scrollTop < 50);

            // Check if bottom is visible (with a small threshold)
            const scrollBottom =
                container.scrollHeight -
                container.scrollTop -
                container.clientHeight;
            setIsBottomVisible(scrollBottom < 50);
        }, [messageRefs]);

        useEffect(() => {
            // Find the scroll container (main element's child with overflow-y-auto)
            const findScrollContainer = () => {
                const container = document.querySelector(
                    "main .overflow-y-auto",
                ) as HTMLElement;
                console.log("Found scroll container:", container);
                return container;
            };

            const scrollContainer = findScrollContainer();

            if (!scrollContainer) {
                console.error("Scroll container not found!");
                return;
            }

            scrollContainerRef.current = scrollContainer;

            handleScroll(); // Initial check

            const scrollHandler = () => {
                console.log("Scroll event fired");
                handleScroll();
            };

            scrollContainer.addEventListener("scroll", scrollHandler);
            window.addEventListener("resize", handleScroll);

            return () => {
                if (scrollContainer) {
                    scrollContainer.removeEventListener(
                        "scroll",
                        scrollHandler,
                    );
                }
                window.removeEventListener("resize", handleScroll);
            };
        }, [handleScroll, messageCount]);

        const scrollToMessage = useCallback(
            (index: number) => {
                const ref = messageRefs.current?.[index];
                if (ref) {
                    ref.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });

                    // Update active index after a short delay to account for smooth scrolling
                    setTimeout(() => {
                        setActiveIndex(index);
                    }, 100);
                }
            },
            [messageRefs],
        );

        const scrollToTop = useCallback(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }
        }, []);

        const scrollToBottom = useCallback(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: "smooth",
                });
            }
        }, []);

        if (messageCount === 0) return null;

        return (
            <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 md:gap-2 p-2 md:p-2.5 rounded-l-xl bg-background opacity-90 backdrop-blur-xl border-2 border-r-0 border-border shadow-2xl min-w-[40px] md:min-w-[45px] hover:opacity-100 transition-shadow duration-300 max-w-[40px] md:max-w-[45px]">
                {/* Scroll to Top Button */}
                <ScrollButton
                    isVisible={isTopVisible}
                    onClick={scrollToTop}
                    direction="up"
                />

                {/* Separator */}
                <div className="w-full h-[1px] bg-border opacity-30" />

                <div className="flex flex-col gap-1 md:gap-0.5 w-full">
                    {messages.map((message, index) => (
                        <MessageStrip
                            key={index}
                            message={message}
                            index={index}
                            activeIndex={activeIndex}
                            onScrollToMessage={scrollToMessage}
                        />
                    ))}
                </div>

                {/* Separator */}
                <div className="w-full h-[1px] bg-border opacity-30" />

                {/* Scroll to Bottom Button */}
                <ScrollButton
                    isVisible={isBottomVisible}
                    onClick={scrollToBottom}
                    direction="down"
                />
            </div>
        );
    },
);
