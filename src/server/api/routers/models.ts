import { getAllVisibleModels } from "../../services/modelFactory";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const modelsRouter = createTRPCRouter({
    list: publicProcedure.query(async () => {
        const models = await getAllVisibleModels();
        return { models };
    }),
});
