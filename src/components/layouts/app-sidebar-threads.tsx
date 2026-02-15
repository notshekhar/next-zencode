"use client";

import { SidebarGroupLabel, SidebarMenuSub } from "@/components/ui/sidebar";
import Link from "next/link";
import {
    SidebarMenuAction,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarGroup } from "@/components/ui/sidebar";
import { ChevronDown, ChevronUp, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, useParams } from "next/navigation";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { api } from "@/trpc/react";
import { useMemo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreads } from "@/hooks/use-threads";
import { WriteIcon } from "../ui/write-icon";
import { Shortcuts, getShortcutKeyList } from "@/lib/keyboard-shortcuts";

type Thread = {
    pubId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    status: string;
};

type ThreadGroup = {
    label: string;
    threads: Thread[];
};

const MAX_THREADS_COUNT = 40;

const NewThreadButton = ({ onClick }: { onClick: () => void }) => {
    const shortcutKeys = getShortcutKeyList(Shortcuts.openNewChat);

    return (
        <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-9 px-2 text-muted-foreground hover:text-foreground"
            onClick={onClick}
        >
            <WriteIcon className="h-4 w-4" />
            <span className="text-sm font-medium">New Thread</span>
            <div className="ml-auto flex items-center gap-1">
                {shortcutKeys.map((key, i) => (
                    <kbd
                        key={i}
                        className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
                    >
                        {key}
                    </kbd>
                ))}
            </div>
        </Button>
    );
};

export function AppSidebarThreads() {
    const router = useRouter();
    const params = useParams();
    const currentThreadId = params?.threadId as string | undefined;
    const { threads, loading } = useThreads();
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedQuery = useDebounce(searchQuery, 300);

    // tRPC search query
    const { data: searchResults, isLoading: isSearching } =
        api.session.search.useQuery(
            { query: debouncedQuery },
            { enabled: debouncedQuery.length > 0 },
        );

    // State to track if expanded view is active
    const [isExpanded, setIsExpanded] = useState(false);

    // Check if we have 40 or more threads to display "View All" button
    const hasExcessThreads = threads && threads.length >= MAX_THREADS_COUNT;

    // Use either limited or full thread list based on expanded state
    const displayThreadList = useMemo(() => {
        if (!threads) return [];
        return !isExpanded && hasExcessThreads
            ? threads.slice(0, MAX_THREADS_COUNT)
            : threads;
    }, [threads, hasExcessThreads, isExpanded]);

    const threadGroupByDate = useMemo(() => {
        if (!displayThreadList || displayThreadList.length === 0) {
            return [];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const groups: ThreadGroup[] = [
            { label: "today", threads: [] },
            { label: "yesterday", threads: [] },
            { label: "lastWeek", threads: [] },
            { label: "older", threads: [] },
        ];

        displayThreadList.forEach((thread) => {
            const threadDate = new Date(thread.updatedAt || thread.createdAt);
            threadDate.setHours(0, 0, 0, 0);

            if (threadDate.getTime() === today.getTime()) {
                groups[0].threads.push(thread);
            } else if (threadDate.getTime() === yesterday.getTime()) {
                groups[1].threads.push(thread);
            } else if (threadDate.getTime() >= lastWeek.getTime()) {
                groups[2].threads.push(thread);
            } else {
                groups[3].threads.push(thread);
            }
        });

        // Filter out empty groups
        return groups.filter((group) => group.threads.length > 0);
    }, [displayThreadList]);

    const handleDeleteThread = async (threadId: string) => {
        try {
            // await deleteThread(threadId);
            // await refreshThreads();

            // If the deleted thread was currently active, redirect to home
            if (currentThreadId === threadId) {
                router.push("/");
            }
        } catch (error) {
            console.error("Failed to delete thread:", error);
        }
    };

    // Show empty state when not loading and no threads
    if (!loading && (!threads || threads.length === 0) && !searchQuery) {
        return (
            <SidebarGroup>
                <div className="px-2 pb-2 flex flex-col gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search chats..."
                            className="pl-8 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <NewThreadButton
                        onClick={() => {
                            router.push("/");
                            router.refresh();
                        }}
                    />
                </div>
                <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarGroupLabel className="">
                                <h4 className="text-xs text-muted-foreground">
                                    {"Recent Chats"}
                                </h4>
                            </SidebarGroupLabel>
                            <div className="px-2 py-4 text-center">
                                <p className="text-sm text-muted-foreground">
                                    {"No Conversations Yet"}
                                </p>
                            </div>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        );
    }

    return (
        <>
            <div className="px-2 pb-2 flex flex-col gap-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        className="pl-8 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <NewThreadButton
                    onClick={() => {
                        router.push("/");
                        router.refresh();
                    }}
                />
            </div>

            {searchQuery ? (
                // Search Results View
                <SidebarGroup>
                    <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarGroupLabel>
                                    <h4 className="text-xs text-muted-foreground">
                                        {isSearching
                                            ? "Searching..."
                                            : `Found ${searchResults?.length || 0} results`}
                                    </h4>
                                </SidebarGroupLabel>
                                <SidebarMenuSub>
                                    {searchResults?.map((thread) => (
                                        <SidebarMenuSubItem
                                            key={thread.id}
                                            className="group/thread"
                                        >
                                            <Tooltip delayDuration={1000}>
                                                <TooltipTrigger asChild>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={
                                                            currentThreadId ===
                                                            thread.id
                                                        }
                                                    >
                                                        <Link
                                                            href={`/chat/${thread.id}`}
                                                        >
                                                            <span className="truncate">
                                                                {thread.name ||
                                                                    "New Chat"}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-[200px] p-4 break-all overflow-y-auto max-h-[200px]">
                                                    {thread.name || "New Chat"}
                                                </TooltipContent>
                                            </Tooltip>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ) : (
                // Regular Thread List
                <>
                    {loading ? (
                        <>
                            {/* Today skeleton group */}
                            <SidebarGroup>
                                <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarGroupLabel>
                                                <Skeleton className="h-3 w-12" />
                                            </SidebarGroupLabel>
                                            <SidebarMenuSub>
                                                {Array.from({ length: 4 }).map(
                                                    (_, index) => (
                                                        <SidebarMenuSubItem
                                                            key={`today-${index}`}
                                                        >
                                                            <div className="w-full px-2 py-1.5">
                                                                <Skeleton className="h-4 w-full" />
                                                            </div>
                                                        </SidebarMenuSubItem>
                                                    ),
                                                )}
                                            </SidebarMenuSub>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            {/* Yesterday skeleton group */}
                            <SidebarGroup>
                                <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarGroupLabel>
                                                <Skeleton className="h-3 w-16" />
                                            </SidebarGroupLabel>
                                            <SidebarMenuSub>
                                                {Array.from({ length: 3 }).map(
                                                    (_, index) => (
                                                        <SidebarMenuSubItem
                                                            key={`yesterday-${index}`}
                                                        >
                                                            <div className="w-full px-2 py-1.5">
                                                                <Skeleton className="h-4 w-full" />
                                                            </div>
                                                        </SidebarMenuSubItem>
                                                    ),
                                                )}
                                            </SidebarMenuSub>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            {/* Last week skeleton group */}
                            <SidebarGroup>
                                <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarGroupLabel>
                                                <Skeleton className="h-3 w-20" />
                                            </SidebarGroupLabel>
                                            <SidebarMenuSub>
                                                {Array.from({ length: 5 }).map(
                                                    (_, index) => (
                                                        <SidebarMenuSubItem
                                                            key={`lastweek-${index}`}
                                                        >
                                                            <div className="w-full px-2 py-1.5">
                                                                <Skeleton className="h-4 w-full" />
                                                            </div>
                                                        </SidebarMenuSubItem>
                                                    ),
                                                )}
                                            </SidebarMenuSub>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </>
                    ) : (
                        <>
                            {threadGroupByDate.map((group) => {
                                return (
                                    <SidebarGroup key={group.label}>
                                        <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
                                            <SidebarMenu>
                                                <SidebarMenuItem>
                                                    <SidebarGroupLabel className="">
                                                        <h4 className="text-xs text-muted-foreground group-hover/threads:text-foreground transition-colors">
                                                            {group.label}
                                                        </h4>
                                                        <div className="flex-1" />
                                                    </SidebarGroupLabel>

                                                    <SidebarMenuSub>
                                                        {group.threads.map(
                                                            (thread) => (
                                                                <SidebarMenuSubItem
                                                                    key={
                                                                        thread.pubId
                                                                    }
                                                                    className="group/thread"
                                                                >
                                                                    <Tooltip
                                                                        delayDuration={
                                                                            1000
                                                                        }
                                                                    >
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <SidebarMenuSubButton
                                                                                asChild
                                                                                isActive={
                                                                                    currentThreadId ===
                                                                                    thread.pubId
                                                                                }
                                                                            >
                                                                                <Link
                                                                                    href={`/chat/${thread.pubId}`}
                                                                                >
                                                                                    <span className="truncate">
                                                                                        {thread.title ||
                                                                                            "New Chat"}
                                                                                    </span>
                                                                                </Link>
                                                                            </SidebarMenuSubButton>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-[200px] p-4 break-all overflow-y-auto max-h-[200px]">
                                                                            {thread.title ||
                                                                                "New Chat"}
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    <DropdownMenu>
                                                                        <SidebarMenuAction
                                                                            className="opacity-0 group-hover/thread:opacity-100 data-[state=open]:opacity-100 top-1/2 -translate-y-1/2"
                                                                            asChild
                                                                        >
                                                                            <DropdownMenuTrigger>
                                                                                <MoreHorizontal className="w-4 h-4" />
                                                                            </DropdownMenuTrigger>
                                                                        </SidebarMenuAction>
                                                                        <DropdownMenuContent
                                                                            side="right"
                                                                            align="start"
                                                                        >
                                                                            <DropdownMenuItem
                                                                                className="text-destructive focus:text-destructive"
                                                                                onClick={() =>
                                                                                    handleDeleteThread(
                                                                                        thread.pubId,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Trash className="w-4 h-4" />
                                                                                Delete
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </SidebarMenuSubItem>
                                                            ),
                                                        )}
                                                    </SidebarMenuSub>
                                                </SidebarMenuItem>
                                            </SidebarMenu>
                                        </SidebarGroupContent>
                                    </SidebarGroup>
                                );
                            })}

                            {hasExcessThreads && (
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <div className="w-full flex px-4">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full hover:bg-input! justify-start"
                                                onClick={() =>
                                                    setIsExpanded(!isExpanded)
                                                }
                                            >
                                                <MoreHorizontal className="mr-2 w-4 h-4" />
                                                {isExpanded
                                                    ? "Show Less Chats"
                                                    : "Show All Chats"}
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 ml-auto" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 ml-auto" />
                                                )}
                                            </Button>
                                        </div>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    );
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
