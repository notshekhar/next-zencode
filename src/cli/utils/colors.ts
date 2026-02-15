export const colors = {
    primaryBlue: "#B1B9F9",
    planYellow: "yellow",
    buildGreen: "green",
    errorRed: "red",
    mutedGray: "gray",
    toolCyan: "cyan",
    successGreen: "greenBright",
} as const;

export function getModeColor(mode: "plan" | "build"): string {
    return mode === "plan" ? colors.planYellow : colors.buildGreen;
}
