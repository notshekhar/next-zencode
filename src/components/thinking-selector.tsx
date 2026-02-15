"use client";

import { useAtom } from "jotai";
import { selectedThinkingConfigAtom } from "@/store";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Brain, Check, ChevronDown } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

export function ThinkingSelector() {
    const [config, setConfig] = useAtom(selectedThinkingConfigAtom);

    const isEnabled = config?.thinking ?? false;
    const currentEffort = config?.effort || "medium";

    const toggleThinking = () => {
        setConfig((prev) => ({
            thinking: !(prev?.thinking ?? false),
            effort: prev?.effort || "medium",
        }));
    };

    const setEffort = (effort: string) => {
        setConfig((prev) => ({
            thinking: prev?.thinking ?? true,
            effort,
        }));
    };

    return (
        <div className="flex items-center gap-1">
            <Toggle
                pressed={isEnabled}
                onPressedChange={toggleThinking}
                size="sm"
                className="h-8 px-2 rounded-lg data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
                <Brain className="size-3.5" />
            </Toggle>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-6 px-0 rounded-lg"
                        disabled={!isEnabled}
                    >
                        <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[140px] p-1">
                    <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1">
                        Thinking Effort
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["low", "medium", "high"].map((level) => (
                        <DropdownMenuItem
                            key={level}
                            onClick={() => setEffort(level)}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 cursor-pointer rounded-md"
                        >
                            <span className="text-sm capitalize">{level}</span>
                            {currentEffort === level && (
                                <Check className="size-3.5 text-primary" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
