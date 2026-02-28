"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { memo } from "react";

type ThinkingDotProps = {
    className?: string;
    size?: number; // dot diameter in px
};

export const ThinkingDot = memo(
    ({ className, size = 16 }: ThinkingDotProps) => {
        return (
            <div
                className={cn(
                    "flex justify-start max-w-3xl mx-auto w-full",
                    className,
                )}
            >
                <div className="rounded-lg py-2 max-w-full">
                    <p className="leading-6 my-4 break-words">
                        <motion.span
                            aria-hidden
                            className="bg-foreground/60 rounded-full inline-block"
                            style={{ width: size, height: size }}
                            animate={{
                                opacity: [0.35, 1, 0.35],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </p>
                </div>
            </div>
        );
    },
);
