"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { PanelLeft } from "lucide-react";
import { WriteIcon } from "../ui/write-icon";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "../ui/sidebar";
import { isShortcutEvent, Shortcuts } from "@/lib/keyboard-shortcuts";
import { AppSidebarThreads } from "./app-sidebar-threads";
import { AppSidebarUser } from "./app-sidebar-user";

export function AppSidebar() {
    const { toggleSidebar, setOpenMobile } = useSidebar();
    const router = useRouter();
    const isMobile = useIsMobile();

    const currentPath = usePathname();

    // global shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isShortcutEvent(e, Shortcuts.openNewChat)) {
                e.preventDefault();
                router.push("/");
                router.refresh();
            }
            if (isShortcutEvent(e, Shortcuts.toggleSidebar)) {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router, toggleSidebar]);

    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
        }
    }, [currentPath, isMobile]);

    return (
        <Sidebar collapsible="offcanvas" className="border-r">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-0.5">
                        <SidebarMenuButton
                            asChild
                            className="hover:bg-transparent"
                        >
                            <Link
                                href={`/`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push("/");
                                    router.refresh();
                                }}
                            >
                                <div className="font-bold font-serif text-xl">
                                    zencode
                                </div>
                                <div
                                    className="ml-auto block sm:hidden"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMobile(false);
                                    }}
                                >
                                    <PanelLeft className="size-4" />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <SidebarMenuAction
                                    showOnHover={false}
                                    className="bg-sidebar-accent"
                                    onClick={() => {
                                        router.push("/");
                                        router.refresh();
                                    }}
                                >
                                    <WriteIcon className="size-4" />
                                </SidebarMenuAction>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                New Thread
                            </TooltipContent>
                        </Tooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="mt-2 flex h-full flex-col overflow-hidden">
                <div className="flex flex-col overflow-y-auto">
                    <AppSidebarThreads />
                </div>
            </SidebarContent>
            <SidebarFooter className="flex flex-col items-stretch space-y-2">
                <AppSidebarUser />
            </SidebarFooter>
        </Sidebar>
    );
}
