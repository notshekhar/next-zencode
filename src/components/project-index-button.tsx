"use client";

import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

export function ProjectIndexButton() {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link href="/embeddings">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Database className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Project Index</span>
                    </Button>
                </Link>
            </TooltipTrigger>
            <TooltipContent>Project embeddings &amp; semantic search</TooltipContent>
        </Tooltip>
    );
}
