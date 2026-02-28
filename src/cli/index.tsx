import React from "react";
import { render } from "ink";
import { App } from "./components/App.js";

export function startCli(serverUrl: string, cwd: string) {
    const { waitUntilExit } = render(
        <App serverUrl={serverUrl} cwd={cwd} />,
    );

    return waitUntilExit();
}
