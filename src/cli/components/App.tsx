import React from "react";
import { Box } from "ink";
import { v4 as uuid } from "uuid";
import { ChatView } from "./ChatView.js";

interface AppProps {
    serverUrl: string;
    cwd: string;
}

export function App({ serverUrl, cwd }: AppProps) {
    const threadId = React.useMemo(() => uuid(), []);

    return (
        <Box flexDirection="column" width="100%">
            <ChatView serverUrl={serverUrl} threadId={threadId} cwd={cwd} />
        </Box>
    );
}
