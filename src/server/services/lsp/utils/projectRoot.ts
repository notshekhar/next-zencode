import * as fs from "fs";
import * as path from "path";

import { getProjectRoot } from "../../../utils/cwd";

const ROOT_MARKERS = [
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    ".git",
];

export function findProjectRoot(filePath: string): string {
    let currentDir = path.dirname(path.resolve(filePath));
    const { root } = path.parse(currentDir);

    while (currentDir !== root) {
        if (
            ROOT_MARKERS.some((marker) =>
                fs.existsSync(path.join(currentDir, marker)),
            )
        ) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }

    return getProjectRoot(); // Fallback to CWD
}
