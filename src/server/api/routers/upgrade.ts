import * as fs from "fs";
import * as path from "path";
import { createTRPCRouter, publicProcedure } from "../trpc";

function getCurrentVersion(): string {
    try {
        const possiblePaths = [
            path.join(process.cwd(), "package.json"),
            path.join(__dirname, "../../../package.json"),
            path.join(__dirname, "../../../../package.json"),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                const pkg = JSON.parse(fs.readFileSync(p, "utf-8"));
                return pkg.version || "1.0.0";
            }
        }
    } catch {
        // ignore
    }
    return "1.0.0";
}
async function getLatestVersion(packageName: string): Promise<string | null> {
    try {
        const res = await fetch(
            `https://registry.npmjs.org/${packageName}/latest`,
        );
        if (res.ok) {
            const data = (await res.json()) as { version: string };
            return data.version;
        }
    } catch {
        // ignore
    }
    return null;
}

// Compare semver versions
function isNewerVersion(current: string, latest: string): boolean {
    const currentParts = current.split(".").map(Number);
    const latestParts = latest.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
        const c = currentParts[i] || 0;
        const l = latestParts[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

export const upgradeRouter = createTRPCRouter({
    check: publicProcedure.query(async () => {
        const packageName = "zencode";
        const currentVersion = getCurrentVersion();
        const latestVersion = await getLatestVersion(packageName);

        if (!latestVersion) {
            return {
                hasUpdate: false,
                currentVersion,
                latestVersion: currentVersion,
                message:
                    "Could not check for updates. You may be offline or the package is not published.",
            };
        }

        const hasUpdate = isNewerVersion(currentVersion, latestVersion);

        return {
            hasUpdate,
            currentVersion,
            latestVersion,
            message: hasUpdate
                ? `Update available: ${currentVersion} → ${latestVersion}`
                : `You're on the latest version (${currentVersion})`,
        };
    }),
});
