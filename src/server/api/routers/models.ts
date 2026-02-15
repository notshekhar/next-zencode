import { getAllVisibleModels } from "../../services/modelFactory";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const modelsRouter = createTRPCRouter({
    list: publicProcedure.query(async () => {
        const models = getAllVisibleModels();
        return { models };
    }),
});
