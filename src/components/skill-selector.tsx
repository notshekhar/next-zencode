"use client";

import { useAtom } from "jotai";
import { selectedSkillsAtom } from "@/store";
import { api } from "@/trpc/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Zap, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

export function SkillSelector({ disabled }: { disabled?: boolean }) {
    const [selectedSkillNames, setSelectedSkillNames] = useAtom(selectedSkillsAtom);
    const { data: skills, isLoading } = api.skills.list.useQuery();

    const toggleSkill = useCallback((skillName: string) => {
        setSelectedSkillNames((prev) => 
            prev.includes(skillName) 
                ? prev.filter(name => name !== skillName)
                : [...prev, skillName]
        );
    }, [setSelectedSkillNames]);

    const clearSkills = useCallback(() => {
        setSelectedSkillNames([]);
    }, [setSelectedSkillNames]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 h-8 px-2">
                <Skeleton className="size-3.5 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <ChevronDown className="size-3 text-muted-foreground/30 shrink-0" />
            </div>
        );
    }

    const availableSkills = skills || [];
    const selectedCount = selectedSkillNames.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className={cn(
                        "gap-2 h-8 px-2 rounded-lg transition-colors overflow-hidden",
                        selectedCount > 0 
                            ? "bg-accent text-accent-foreground hover:bg-accent" 
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground"
                    )}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Zap className={cn("size-3.5 shrink-0", selectedCount > 0 ? "fill-primary" : "")} />
                        <span className="text-xs font-medium truncate">
                            {selectedCount > 0 ? `${selectedCount} Skill${selectedCount > 1 ? 's' : ''}` : "Skills"}
                        </span>
                    </div>
                    <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[240px] p-1">
                <DropdownMenuLabel className="flex items-center justify-between font-normal px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">Select Agent Skills</span>
                    {selectedCount > 0 && (
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                clearSkills();
                            }}
                            className="text-[10px] text-primary hover:underline"
                        >
                            Clear all
                        </button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {availableSkills.length === 0 ? (
                        <div className="px-2 py-4 text-center">
                            <p className="text-xs text-muted-foreground">No skills found</p>
                        </div>
                    ) : (
                        availableSkills.map((skill) => (
                            <DropdownMenuItem
                                key={skill.name}
                                onClick={() => toggleSkill(skill.name)}
                                className="flex items-start gap-3 px-2 py-2 cursor-pointer rounded-md"
                            >
                                <div className="flex items-center justify-center size-4 shrink-0 mt-0.5 rounded border border-border">
                                    {selectedSkillNames.includes(skill.name) && (
                                        <Check className="size-3" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-sm font-medium leading-none">
                                        {skill.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground line-clamp-2">
                                        {skill.description}
                                    </span>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                {availableSkills.length > 0 && (
                     <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                            <div className="flex items-start gap-2 bg-muted p-2 rounded-md border border-border">
                                <Info className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-[10px] text-muted-foreground leading-normal">
                                    Selected skills are automatically injected into the agent's system prompt for better performance.
                                </p>
                            </div>
                        </div>
                     </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
