"use client";

import { PanelLeft } from "lucide-react";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAtom } from "jotai";
import { openShortcutsPopupAtom } from "@/store";
import { useSidebar } from "../ui/sidebar";
import { getShortcutKeyList, Shortcuts } from "@/lib/keyboard-shortcuts";
import { Separator } from "@radix-ui/react-separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toggle } from "@/components/ui/toggle";

import { ConnectButton } from "@/components/connect-button";

export function AppHeader() {
    const { toggleSidebar } = useSidebar();
    const currentPaths = usePathname();

    const componentByPage = useMemo(() => {
        if (currentPaths.startsWith("/chat/")) {
            return <ThreadDropdownComponent />;
        }
        if (currentPaths.startsWith("/games/")) {
            const gameId = currentPaths.split("/").pop();
            const gameName = gameId
                ?.split("-")
                .map((word) =>
                    word.charAt(0)
                        ? word.charAt(0).toUpperCase() + word.slice(1)
                        : "",
                )
                .join(" ");
            return (
                <div className="flex items-center gap-2 px-2 py-1 ml-2">
                    <span className="text-sm font-semibold text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-md border border-accent">
                        {gameName || "Game"}
                    </span>
                </div>
            );
        }
    }, [currentPaths]);

    return (
        <header className="sticky top-0 z-50 flex items-center px-3 py-2 w-full overflow-x-hidden">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        variant="outline"
                        size="sm"
                        aria-label="Toggle Sidebar"
                        onClick={toggleSidebar}
                    >
                        <PanelLeft />
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent>Toggle Sidebar</TooltipContent>
            </Tooltip>

            {componentByPage}

            <div className="flex-1" />

            <ConnectButton />
        </header>
    );
}

function ThreadDropdownComponent() {
    return (
        <div className="items-center gap-1 hidden md:flex">
            <div className="w-1 h-4">
                <Separator orientation="vertical" />
            </div>
        </div>
    );
}
