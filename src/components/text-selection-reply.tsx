"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Reply } from "lucide-react";
import { useSetAtom } from "jotai";
import { replyContextAtom, ReplyContext } from "@/store";

export function TextSelectionReply() {
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState("");
    const [messageInfo, setMessageInfo] = useState<{
        messageId: string;
        messageIndex: number;
        role: "user" | "assistant";
        textOffset: number;
    } | null>(null);
    const setReplyContext = useSetAtom(replyContextAtom);
    const popupRef = useRef<HTMLDivElement>(null);
    const isClickingPopupRef = useRef(false);

    const handleSelection = useCallback(() => {
        if (isClickingPopupRef.current) {
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setShowPopup(false);
            return;
        }

        const selectedStr = selection.toString().trim();
        if (!selectedStr) {
            setShowPopup(false);
            return;
        }

        // Find the message container from the selection
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const messageEl = (
            container instanceof Element ? container : container.parentElement
        )?.closest("[data-message-id]");

        if (!messageEl) {
            setShowPopup(false);
            return;
        }

        const messageId = messageEl.getAttribute("data-message-id");
        const messageIndex = parseInt(
            messageEl.getAttribute("data-message-index") || "0",
            10,
        );
        const role = messageEl.getAttribute("data-message-role") as
            | "user"
            | "assistant";

        if (!messageId || !role) {
            setShowPopup(false);
            return;
        }

        // Calculate textOffset - position of selection start within message text
        let textOffset = 0;
        const treeWalker = document.createTreeWalker(
            messageEl,
            NodeFilter.SHOW_TEXT,
        );
        let node;
        const startNode = range.startContainer;
        const startOffsetInNode = range.startOffset;

        while ((node = treeWalker.nextNode())) {
            if (node === startNode) {
                textOffset += startOffsetInNode;
                break;
            }
            textOffset += (node.textContent || "").length;
        }

        const rect = range.getBoundingClientRect();

        setSelectedText(selectedStr);
        setMessageInfo({ messageId, messageIndex, role, textOffset });
        setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 45,
        });
        setShowPopup(true);
    }, []);

    const handleReply = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (selectedText && messageInfo) {
                const replyContext: ReplyContext = {
                    messageId: messageInfo.messageId,
                    messageIndex: messageInfo.messageIndex,
                    selectedText,
                    textOffset: messageInfo.textOffset,
                    role: messageInfo.role,
                };
                setReplyContext(replyContext);
                setShowPopup(false);
                window.getSelection()?.removeAllRanges();

                // Focus the chat input
                setTimeout(() => {
                    const textarea = document.querySelector(
                        "textarea",
                    ) as HTMLTextAreaElement;
                    textarea?.focus();
                }, 50);
            }
        },
        [selectedText, messageInfo, setReplyContext],
    );

    useEffect(() => {
        const onMouseUp = () => {
            setTimeout(handleSelection, 10);
        };

        document.addEventListener("mouseup", onMouseUp);
        document.addEventListener("keyup", handleSelection);

        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("keyup", handleSelection);
        };
    }, [handleSelection]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                popupRef.current &&
                !popupRef.current.contains(e.target as Node)
            ) {
                setShowPopup(false);
            }
        };

        if (showPopup) {
            const timer = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 50);

            return () => {
                clearTimeout(timer);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showPopup]);

    if (!showPopup) return null;

    return (
        <div
            ref={popupRef}
            className="fixed z-[100] bg-popover border border-border rounded-lg shadow-lg px-3 py-1.5 cursor-pointer hover:bg-accent transition-colors"
            style={{
                left: `${popupPosition.x}px`,
                top: `${popupPosition.y}px`,
                transform: "translateX(-50%)",
            }}
            onMouseDown={() => {
                isClickingPopupRef.current = true;
            }}
            onMouseUp={() => {
                setTimeout(() => {
                    isClickingPopupRef.current = false;
                }, 100);
            }}
            onClick={handleReply}
        >
            <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
            </div>
        </div>
    );
}
