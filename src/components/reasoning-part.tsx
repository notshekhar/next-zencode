import { ChevronDownIcon } from "lucide-react";
import { memo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MemoizedMarkdown } from "./memoized-markdown";

export const ReasoningPart = memo(
    ({ reasoning, state }: { state: string; reasoning: string }) => {
        // Start expanded when reasoning, collapse when done
        const [isExpanded, setIsExpanded] = useState(state !== "done");

        // Auto-collapse when reasoning is done
        useEffect(() => {
            if (state === "done") {
                setIsExpanded(false);
            }
        }, [state]);
        const variants = {
            collapsed: {
                height: 0,
                opacity: 0,
                marginTop: 0,
                marginBottom: 0,
            },
            expanded: {
                height: "auto",
                opacity: 1,
                marginTop: "1rem",
                marginBottom: "0.5rem",
            },
        };

        return (
            <div
                className="flex flex-col cursor-pointer"
                onClick={() => {
                    setIsExpanded(!isExpanded);
                }}
            >
                <div className="flex flex-row gap-2 items-center text-ring hover:text-primary transition-colors">
                    <div className="font-medium">
                        {state === "done"
                            ? "Reasoned for a few seconds"
                            : "Reasoning..."}
                    </div>
                    <button
                        data-testid="message-reasoning-toggle"
                        type="button"
                        className="cursor-pointer"
                    >
                        <ChevronDownIcon size={16} />
                    </button>
                </div>

                <div className="pl-2">
                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.div
                                data-testid="message-reasoning"
                                key="content"
                                initial="collapsed"
                                animate="expanded"
                                exit="collapsed"
                                variants={variants}
                                transition={{
                                    duration: 0.2,
                                    ease: "easeInOut",
                                }}
                                style={{ overflow: "hidden" }}
                                className="pl-4 text-muted-foreground border-l flex flex-col gap-4"
                            >
                                <MemoizedMarkdown>{reasoning}</MemoizedMarkdown>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    },
);
