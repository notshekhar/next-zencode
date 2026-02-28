import {
    type Thread,
    threadsAtom,
    threadsInitializedAtom,
    threadsLoadingAtom,
} from "@/store";
import { api } from "@/trpc/react";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

export function useThreads() {
    const setThreads = useSetAtom(threadsAtom);
    const setLoading = useSetAtom(threadsLoadingAtom);
    const setInitialized = useSetAtom(threadsInitializedAtom);

    const {
        data,
        isLoading,
        refetch: refreshThreads,
    } = api.session.list.useQuery(undefined, {
        staleTime: 30_000,
    });

    const deleteMutation = api.session.delete.useMutation({
        onSuccess: () => {
            void refreshThreads();
        },
    });

    useEffect(() => {
        setLoading(isLoading);
    }, [isLoading, setLoading]);

    useEffect(() => {
        if (data) {
            const threads: Thread[] = data.map((s) => ({
                pubId: s.id,
                title: s.name ?? "",
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
                status: "active",
            }));
            setThreads(threads);
            setInitialized(true);
        }
    }, [data, setThreads, setInitialized]);

    const deleteThread = async (threadId: string) => {
        await deleteMutation.mutateAsync({ id: threadId });
    };

    return {
        loading: isLoading,
        threads: data
            ? data.map((s) => ({
                  pubId: s.id,
                  title: s.name ?? "",
                  createdAt: s.createdAt,
                  updatedAt: s.updatedAt,
                  status: "active",
              }))
            : [],
        refreshThreads,
        deleteThread,
    };
}
