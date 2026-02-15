import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const openShortcutsPopupAtom = atom<boolean>(false);

// Model types
export interface Model {
    id: string;
    name: string;
    provider: {
        id: string;
        attachment: boolean;
        limit: {
            context: number;
        };
    };
    description?: string;
    iconUrl?: string;
}

// Model selection atoms
export const selectedModelAtom = atomWithStorage<string>(
    "oboe-selected-model",
    "gemini-3-flash-preview",
);

export const modelsAtom = atom<Model[]>([]);
export const modelsLoadingAtom = atom<boolean>(false);
export const modelsErrorAtom = atom<any>(null);
export const modelsInitializedAtom = atom<boolean>(false);

export const selectedThinkingConfigAtom = atomWithStorage<{
    thinking: boolean;
    effort?: string;
} | null>("oboe-thinking-config", null);

// Thread management atoms
export type Thread = {
    pubId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    status: string;
};

export const threadsAtom = atom<Thread[]>([]);
export const threadsLoadingAtom = atom<boolean>(false);
export const threadsInitializedAtom = atom<boolean>(false);

// Reply context atom
export type ReplyContext = {
    messageId: string;
    messageIndex: number;
    selectedText: string;
    textOffset: number; // Character offset within the message text
    role: "user" | "assistant";
} | null;

export const replyContextAtom = atom<ReplyContext>(null);

// Chat mode atom
export type ChatMode = "build" | "plan";
export const chatModeAtom = atomWithStorage<ChatMode>(
    "zencode-chat-mode",
    "build",
);

// Skills atoms
export const selectedSkillsAtom = atomWithStorage<string[]>(
    "zencode-selected-skills",
    [],
);
