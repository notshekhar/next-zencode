/**
 * Tool Guard Extension — tool call blocking/filtering example.
 *
 * Demonstrates:
 * - Intercepting tool calls before they execute
 * - Blocking dangerous operations based on custom rules
 * - Logging tool results
 *
 * To use: copy this file to .zencode/extensions/tool-guard.ts
 */

import type { ExtensionFactory } from "../../src/mom/extensions/types";

const BLOCKED_COMMANDS = [
    "rm -rf /",
    "rm -rf ~",
    "mkfs",
    "> /dev/sda",
    "dd if=/dev/zero",
    ":(){:|:&};:",
];

const toolGuard: ExtensionFactory = (api) => {
    api.log("Tool guard extension loaded");

    api.on("tool_call", async (event) => {
        if (event.toolName === "bash") {
            const command = String(event.args.command ?? "").toLowerCase();

            for (const blocked of BLOCKED_COMMANDS) {
                if (command.includes(blocked)) {
                    api.log(
                        `BLOCKED dangerous command: ${command}`,
                        "warn",
                    );
                    return {
                        block: true,
                        reason: `Command blocked by tool-guard: pattern "${blocked}" is not allowed`,
                    };
                }
            }
        }
    });

    api.on("tool_result", async (event) => {
        if (event.isError) {
            api.log(
                `Tool ${event.toolName} failed: ${JSON.stringify(event.result).slice(0, 200)}`,
                "warn",
            );
        }
    });
};

export default toolGuard;
