import {
    threadsAtom,
    threadsInitializedAtom,
    threadsLoadingAtom,
} from "@/store";
import { useAtomValue, useSetAtom } from "jotai";

export function useThreads() {
    const threads = useAtomValue(threadsAtom);
    const loading = useAtomValue(threadsLoadingAtom);
    const initialized = useAtomValue(threadsInitializedAtom);
    // const refreshThreads = useSetAtom();
    // const ensureThreadExists = useSetAtom(ensureThreadExistsAtom);

    // Note: Initial fetch is handled by AppInitializer in layout
    // This hook only provides access to thread state and actions

    return {
        loading,
        threads,
        // refreshThreads,
        // ensureThreadExists,
    };
}
