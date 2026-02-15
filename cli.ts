#!/usr/bin/env bun

import { spawn, type ChildProcess } from "child_process";
import net from "net";

const isCliMode = process.argv.includes("--cli");

function getFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, () => {
            const address = server.address();
            if (typeof address === "object" && address?.port) {
                const port = address.port;
                server.close(() => resolve(port));
            }
        });
        server.on("error", reject);
    });
}

function openBrowser(url: string) {
    const platform = process.platform;

    if (platform === "darwin") {
        spawn("open", [url]);
    } else if (platform === "win32") {
        spawn("cmd", ["/c", "start", url]);
    } else {
        spawn("xdg-open", [url]);
    }
}

function waitForReady(proc: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
        const onData = (data: Buffer) => {
            const text = data.toString();
            if (text.includes("Ready")) {
                proc.stdout?.off("data", onData);
                resolve();
            }
        };
        proc.stdout?.on("data", onData);
    });
}

const appPath = import.meta.dir;

const port = await getFreePort();
const url = `http://localhost:${port}`;
const zencodeCwd = process.cwd();

if (!isCliMode) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Starting zencode");
    console.log(`📦 Directory: ${zencodeCwd}`);
    console.log(`🌍 URL: ${url}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

const proc = spawn("bunx", ["next", "dev", "-p", port.toString()], {
    cwd: appPath,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ZENCODE_CWD: zencodeCwd },
});

// Graceful shutdown
function cleanup() {
    proc.kill("SIGTERM");
}
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

if (isCliMode) {
    // CLI mode: wait for server ready, then render Ink UI
    proc.stderr?.on("data", () => {
        // Suppress stderr in CLI mode
    });

    await waitForReady(proc);

    const { startCli } = await import("./src/cli/index.tsx");
    await startCli(url, zencodeCwd);

    // When Ink exits, kill the server
    cleanup();
    process.exit(0);
} else {
    // Browser mode: existing behavior
    let isReady = false;

    proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        if (!isReady && text.includes("Ready")) {
            isReady = true;
            console.log("✅ Server Ready");
            console.log(`👉 Opening ${url}`);
            openBrowser(url);
        }
    });

    proc.stderr?.on("data", (data: Buffer) => {
        console.log("⚠️ Error:", data.toString());
    });

    proc.on("close", (code: number | null) => {
        console.log("🛑 Server stopped");
        process.exit(code ?? 0);
    });
}
