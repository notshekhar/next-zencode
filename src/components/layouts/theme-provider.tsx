"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useThemeStyle } from "@/hooks/use-theme-style";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export const ThemeStyleProvider = React.memo(function ({
    children,
}: {
    children: React.ReactNode;
}) {
    const { themeStyle } = useThemeStyle();
    const [mounted, setMounted] = React.useState(false);

    React.useLayoutEffect(() => {
        // Ensure theme is applied to both html and body elements
        const html = document.documentElement;
        const body = document.body;

        if (html.getAttribute("data-theme") !== themeStyle) {
            html.setAttribute("data-theme", themeStyle);
        }

        if (body.getAttribute("data-theme") !== themeStyle) {
            body.setAttribute("data-theme", themeStyle);
        }

        // Force a repaint to ensure colors are applied
        html.style.setProperty("--background", "var(--background)");
        body.style.setProperty("--background", "var(--background)");

        setMounted(true);
    }, [themeStyle]);

    // Prevent flash of unstyled content
    if (!mounted) {
        return (
            <div
                style={{
                    backgroundColor: "var(--background)",
                    minHeight: "100vh",
                    visibility: "hidden",
                }}
            >
                {children}
            </div>
        );
    }

    return children;
});

ThemeStyleProvider.displayName = "ThemeStyleProvider";
