import type { Metadata } from "next";
import Script from "next/script";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";

import { Toaster } from "@/components/ui/sonner";
import { StatusHealth } from "@/components/StatusHealth";
import { TRPCReactProvider } from "@/trpc/react";
import {
    ThemeProvider,
    ThemeStyleProvider,
} from "@/components/layouts/theme-provider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "oboe.chat",
        template: "%s | oboe.chat",
    },
    description:
        "Access Gemini, Claude, Grok, ChatGPT, and Groq all in one place. Pay as you go with no subscription - only pay for what you use. Switch between top AI models instantly.",
    keywords: [
        "AI chat",
        "Gemini",
        "Claude",
        "ChatGPT",
        "Grok",
        "Groq",
        "multi-model AI",
        "pay as you go",
        "no subscription",
        "AI assistant",
    ],
    authors: [{ name: "oboe.chat" }],
    creator: "oboe.chat",
    openGraph: {
        title: "oboe.chat",
        description:
            "Access Gemini, Claude, Grok, ChatGPT & Groq in one place. Pay as you go, no subscription required.",
        url: "https://oboe.chat",
        siteName: "oboe.chat",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "oboe.chat",
        description:
            "Access Gemini, Claude, Grok, ChatGPT & Groq in one place. Pay as you go, no subscription.",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="color-scheme" content="light dark" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=AW-786159670"
                    strategy="afterInteractive"
                />
                <Script id="google-ads-tag" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());

                        gtag('config', 'AW-786159670');

                        // Event snippet for Page view conversion page
                        gtag('event', 'conversion', {
                            'send_to': 'AW-786159670/51NbCL_t2NsbELaw7_YC',
                            'value': 1.0,
                            'currency': 'USD'
                        });
                    `}
                </Script>
                <NextTopLoader color="var(--primary)" showSpinner={false} />
                <NuqsAdapter>
                    <TRPCReactProvider>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="dark"
                            themes={["light", "dark"]}
                            storageKey="app-theme"
                            disableTransitionOnChange
                            enableSystem={false}
                        >
                            <ThemeStyleProvider>
                                <div id="root">
                                    {children}
                                    <Toaster richColors />
                                </div>
                            </ThemeStyleProvider>
                        </ThemeProvider>
                    </TRPCReactProvider>
                </NuqsAdapter>
            </body>
        </html>
    );
}
