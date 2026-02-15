"use client";

export type Shortcut = {
    description?: string;
    shortcut: {
        key?: string;
        shift?: boolean;
        command?: boolean;
        backspace?: boolean;
    };
};

const openNewChatShortcut: Shortcut = {
    description: "newChat",
    shortcut: {
        key: "O",
        shift: true,
        command: true,
    },
};

const toggleSidebarShortcut: Shortcut = {
    description: "toggleSidebar",
    shortcut: {
        key: "S",
        command: true,
        shift: true,
    },
};

const deleteThreadShortcut: Shortcut = {
    description: "deleteThread",
    shortcut: {
        backspace: true,
        shift: true,
    },
};

const openShortcutsPopupShortcut: Shortcut = {
    description: "openShortcutsPopup",
    shortcut: {
        key: "/",
        command: true,
    },
};

const openSearchShortcut: Shortcut = {
    description: "openSearch",
    shortcut: {
        key: "K",
        command: true,
    },
};

export const Shortcuts = {
    openNewChat: openNewChatShortcut,
    openSearch: openSearchShortcut,
    toggleSidebar: toggleSidebarShortcut,
    deleteThread: deleteThreadShortcut,
    openShortcutsPopup: openShortcutsPopupShortcut,
};

export const isShortcutEvent = (
    event: KeyboardEvent,
    { shortcut }: Shortcut,
) => {
    if (shortcut.command && !event.metaKey && !event.ctrlKey) return false;

    if (shortcut.shift && !event.shiftKey) return false;

    if (
        shortcut.key &&
        shortcut.key?.toLowerCase() !== event.key?.toLowerCase()
    )
        return false;

    if (shortcut.backspace && event.key?.toLowerCase() !== "backspace")
        return false;

    return true;
};
export const getShortcutKeyList = ({ shortcut }: Shortcut): string[] => {
    const keys: string[] = [];
    if (shortcut.command) {
        keys.push("⌘");
    }
    if (shortcut.shift) {
        keys.push("⇧");
    }
    if (shortcut.key) {
        keys.push(shortcut.key);
    }
    if (shortcut.backspace) {
        keys.push("⌫");
    }
    return keys;
};
