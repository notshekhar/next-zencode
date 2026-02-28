"use client";

import dynamic from "next/dynamic";

const KeyboardShortcutsPopup = dynamic(
    () =>
        import("../keyboard-shortcuts-popup").then(
            (mod) => mod.KeyboardShortcutsPopup,
        ),
    {
        ssr: false,
    },
);

export function AppPopupProvider() {
    return (
        <>
            <KeyboardShortcutsPopup />
        </>
    );
}
