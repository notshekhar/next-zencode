import React from "react";
import { Box, Text } from "ink";
import { getModeColor } from "../utils/colors.js";

interface StatusBarProps {
    mode: "plan" | "build";
    cwd: string;
}

export function StatusBar({ mode, cwd }: StatusBarProps) {
    const modeColor = getModeColor(mode);
    const modeLabel = mode === "plan" ? "PLAN" : "BUILD";
    const shortCwd =
        cwd.length > 40 ? "..." + cwd.slice(cwd.length - 37) : cwd;

    return (
        <Box marginTop={1}>
            <Text dimColor>
                [<Text color={modeColor}>{modeLabel}</Text>] {shortCwd}
            </Text>
            <Text dimColor> | Tab: toggle mode | Ctrl+C: exit</Text>
        </Box>
    );
}
