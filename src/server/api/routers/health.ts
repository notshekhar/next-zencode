import { createTRPCRouter, publicProcedure } from "../trpc";
import { getProjectRoot } from "../../utils/cwd";
import * as path from "path";
import * as fs from "fs";

export const healthRouter = createTRPCRouter({
    check: publicProcedure.query(() => {
        const projectRoot = getProjectRoot();
        let projectName = path.basename(projectRoot);

        try {
            const packageJsonPath = path.join(projectRoot, "package.json");
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(
                    fs.readFileSync(packageJsonPath, "utf-8"),
                );
                if (packageJson.name) {
                    projectName = packageJson.name;
                }
            }
        } catch (e) {
            console.log(e);
        }

        return {
            status: "ok",
            timestamp: new Date(),
            projectPath: projectRoot,
            projectName: projectName,
        };
    }),
});
