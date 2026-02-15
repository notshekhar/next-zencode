"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImagePreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
}

export function ImagePreview({ open, onOpenChange, url }: ImagePreviewProps) {
    if (!url) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
                <VisuallyHidden>
                    <DialogTitle>Image Preview</DialogTitle>
                </VisuallyHidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt="Preview"
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                />
            </DialogContent>
        </Dialog>
    );
}
