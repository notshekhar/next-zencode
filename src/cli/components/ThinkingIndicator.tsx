import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { getModeColor } from "../utils/colors.js";

interface ThinkingIndicatorProps {
    mode: "plan" | "build";
    onCancel?: () => void;
}

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function ThinkingIndicator({ mode }: ThinkingIndicatorProps) {
    const [frame, setFrame] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const spinnerTimer = setInterval(() => {
            setFrame((f) => (f + 1) % spinnerFrames.length);
        }, 80);

        const elapsedTimer = setInterval(() => {
            setElapsed((e) => e + 1);
        }, 1000);

        return () => {
            clearInterval(spinnerTimer);
            clearInterval(elapsedTimer);
        };
    }, []);

    const label = mode === "plan" ? "Planning" : "Thinking";
    const color = getModeColor(mode);

    return (
        <Box>
            <Text color={color}>{spinnerFrames[frame]} </Text>
            <Text color={color} bold>
                {label}...
            </Text>
            {elapsed > 0 && (
                <Text dimColor> {elapsed}s</Text>
            )}
        </Box>
    );
}
