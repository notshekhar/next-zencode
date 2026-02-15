"use client";

import { useEffect } from "react";
import {
    getShortcutKeyList,
    isShortcutEvent,
    Shortcuts,
} from "@/lib/keyboard-shortcuts";

import { useAtom } from "jotai";
import { openShortcutsPopupAtom } from "@/store";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "./ui/dialog";

export function KeyboardShortcutsPopup({}) {
    // const [openShortcutsPopup, appStoreMutate] = appStore(
    //     useShallow((state) => [state.openShortcutsPopup, state.mutate]),
    // );

    const [openShortcutsPopup, setShortcutsPopup] = useAtom(
        openShortcutsPopupAtom,
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isShortcutEvent(e, Shortcuts.openShortcutsPopup)) {
                e.preventDefault();
                e.stopPropagation();
                setShortcutsPopup((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <Dialog
            open={openShortcutsPopup}
            onOpenChange={() => setShortcutsPopup((prev) => !prev)}
        >
            <DialogContent className="md:max-w-3xl">
                <DialogDescription />
                <div className="grid grid-cols-2 gap-5">
                    {Object.entries(Shortcuts).map(([key, shortcut]) => (
                        <div
                            key={key}
                            className="flex items-center gap-2 w-full text-sm px-2"
                        >
                            <p>{shortcut.description ?? ""}</p>
                            <div className="flex-1" />
                            {getShortcutKeyList(shortcut).map((key) => {
                                return (
                                    <div
                                        key={key}
                                        className="p-1.5 text-xs border min-w-8 min-h-8 flex items-center justify-center rounded-md bg-muted"
                                    >
                                        <span>{key}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
