import { Box, Text } from "ink";

interface RobotAsciiProps {
    mode: "plan" | "build";
}

const LOGO_LINES = [
    { text: "  ██  ██  ", color: "#E8956A" as const },
    { text: "  ██████  ", color: "#E8956A" as const },
    { text: "  █ ██ █  ", color: "#E8956A" as const },
    { text: "   ████   ", color: "#C87A54" as const },
];

export function RobotAscii({ mode }: RobotAsciiProps) {
    return (
        <Box flexDirection="column" marginTop={1}>
            <Box flexDirection="column" marginRight={2}>
                {LOGO_LINES.map((line, i) => (
                    <Text key={`logo-${i}`} color={line.color}>
                        {line.text}
                    </Text>
                ))}
            </Box>
        </Box>
    );
}
