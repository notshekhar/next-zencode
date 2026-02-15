"use client";

import {
    ChevronsUpDown,
    Command,
    LogOutIcon,
    Settings2,
    Palette,
    Sun,
    MoonStar,
    ChevronRight,
    GithubIcon,
    MessageSquare,
    LogOut,
    LogIn,
    User,
    Coins,
    Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

import { useThemeStyle } from "@/hooks/use-theme-style";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAtom } from "jotai";
import { openShortcutsPopupAtom } from "@/store";
import { cn } from "@/lib/utils";
import { BASE_THEMES } from "@/lib/const";

export function AppSidebarUser() {
    const [_, setOpenShortcutsPopup] = useAtom(openShortcutsPopupAtom);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-input/30 border"
                            size={"lg"}
                        >
                            <Settings2 className="h-4 w-4" />
                            <span className="truncate">Settings</span>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="top"
                        className="bg-popover text-popover-foreground border border-border w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg shadow-md"
                        align="center"
                    >
                        <SelectTheme />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setOpenShortcutsPopup(true)}
                        >
                            <Command className="size-4 text-foreground" />
                            <span>{"Keyboard Shortcuts"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                window.open(
                                    "https://github.com/notshekhar/oboe-chat/issues/new",
                                    "_blank",
                                );
                            }}
                            className="cursor-pointer"
                        >
                            <MessageSquare className="size-4 text-foreground" />
                            <span>{"Feedback"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function SelectTheme() {
    const { theme = "light", setTheme } = useTheme();

    const { themeStyle = "default", setThemeStyle } = useThemeStyle();

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center">
                <Palette className="mr-2 size-4" />
                <span className="mr-auto">{"Theme"}</span>
                <span className="text-muted-foreground text-xs min-w-0 truncate">
                    {`${theme}`}
                </span>
                <ChevronRight className="size-4 ml-2 mr-2" />
                <span className="text-muted-foreground text-xs min-w-0 truncate">
                    {themeStyle}
                </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48 bg-popover text-popover-foreground border border-border shadow-md">
                    <DropdownMenuLabel className="text-muted-foreground w-full flex items-center">
                        <span className="text-muted-foreground text-xs mr-2 select-none">
                            {theme}
                        </span>
                        <div className="flex-1" />
                        <div
                            onClick={() => {
                                const newTheme =
                                    theme === "light" ? "dark" : "light";
                                setTheme(newTheme);
                            }}
                            className="cursor-pointer border rounded-full flex items-center"
                        >
                            <div
                                className={cn(
                                    theme === "dark" &&
                                        "bg-accent ring ring-muted-foreground/40 text-foreground",
                                    "p-1 rounded-full",
                                )}
                            >
                                <MoonStar className="size-3" />
                            </div>
                            <div
                                className={cn(
                                    theme === "light" &&
                                        "bg-accent ring ring-muted-foreground/40 text-foreground",
                                    "p-1 rounded-full",
                                )}
                            >
                                <Sun className="size-3" />
                            </div>
                        </div>
                    </DropdownMenuLabel>
                    <div className="max-h-96 overflow-y-auto">
                        {BASE_THEMES.map((t) => (
                            <DropdownMenuCheckboxItem
                                key={t}
                                checked={themeStyle === t}
                                onClick={(e: any) => {
                                    e.preventDefault();
                                    setThemeStyle(t);
                                }}
                                className="text-sm"
                            >
                                {t}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </div>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    );
}
