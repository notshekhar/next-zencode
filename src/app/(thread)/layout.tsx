import { AppHeader } from "@/components/layouts/app-header";
import { StatusHealth } from "@/components/StatusHealth";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { COOKIE_KEY_SIDEBAR_STATE } from "@/lib/const";
import { cookies, headers as getHeaders } from "next/headers";

export default async function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [cookieStore, headers] = await Promise.all([cookies(), getHeaders()]);

    const sidebarCookie = cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value;
    // Open by default when cookie is missing; follow cookie strictly when present
    const isCollapsed = sidebarCookie === "false";

    return (
        <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar />
            <main className="relative bg-background w-full flex flex-col h-dvh overflow-hidden">
                <AppHeader />
                <StatusHealth />
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    );
}
