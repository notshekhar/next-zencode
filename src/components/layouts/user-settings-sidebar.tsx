"use client";

import {
    User,
    MessageSquare,
    ChevronLeft,
    PanelLeft,
    Coins,
    History,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

interface SettingsNavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface SettingsSection {
    title: string;
    items: SettingsNavItem[];
}

const settingsSections: SettingsSection[] = [
    {
        title: "User Settings",
        items: [
            {
                title: "Profile",
                href: "/user/profile",
                icon: User,
            },
            {
                title: "Chat Preferences",
                href: "/user/preferences",
                icon: MessageSquare,
            },
        ],
    },
    {
        title: "Balance",
        items: [
            {
                title: "Overview",
                href: "/user/credits",
                icon: Coins,
            },
            {
                title: "Usage",
                href: "/user/credits/usage",
                icon: History,
            },
        ],
    },
];

export function UserSettingsSidebar() {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
        }
    }, [pathname, isMobile, setOpenMobile]);

    return (
        <Sidebar collapsible="offcanvas" className="border-r">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/" className="flex items-center gap-2">
                                <ChevronLeft className="h-4 w-4" />
                                <span>Back to Chat</span>
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
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {settingsSections.map((section) => (
                    <SidebarGroup key={section.title}>
                        <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarGroupLabel>
                                        <h4 className="text-xs text-muted-foreground">
                                            {section.title}
                                        </h4>
                                    </SidebarGroupLabel>

                                    <SidebarMenuSub>
                                        {section.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive =
                                                pathname === item.href;

                                            return (
                                                <SidebarMenuSubItem
                                                    key={item.href}
                                                >
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={isActive}
                                                    >
                                                        <Link href={item.href}>
                                                            <Icon className="h-4 w-4" />
                                                            <span>
                                                                {item.title}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            );
                                        })}
                                    </SidebarMenuSub>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
