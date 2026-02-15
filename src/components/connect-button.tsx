"use client";

import { Plug } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import Link from "next/link";

export function ConnectButton() {
    const { data } = api.apiKeys.list.useQuery();
    const connectedCount =
        data?.providers.filter((p) => p.connected).length ?? 0;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link href="/settings/keys">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Plug className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Connect</span>
                        {connectedCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                                {connectedCount}
                            </span>
                        )}
                    </Button>
                </Link>
            </TooltipTrigger>
            <TooltipContent>Connect API providers</TooltipContent>
        </Tooltip>
    );
}
