"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { ImagePreview } from "./ui/image-preview";
import { FileCard } from "./ui/file-card";
import { Skeleton } from "./ui/skeleton";
import { ImageIcon } from "lucide-react";

interface FilePartProps {
    part: {
        type: string;
        mediaType?: string;
        mimeType?: string;
        url?: string;
        image?: string;
        name?: string;
        filename?: string;
        size?: number;
    };
}

export const FilePart = memo(function FilePart({ part }: FilePartProps) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const isImage =
        part.type === "image" ||
        (part.type === "file" &&
            (part.mimeType?.startsWith("image/") ||
                part.mediaType?.startsWith("image/")));

    const url = part.url || part.image;
    const name = part.name || part.filename || "Attachment";
    const mimeType = part.mimeType || part.mediaType;

    // Check if URL is valid/complete - base64 URLs should have proper data after the comma
    const isUrlValid = (() => {
        if (!url) return false;

        // For data URLs, check if they have actual content after the base64 marker
        if (url.startsWith("data:")) {
            const base64Part = url.split(",")[1];
            // URL is valid if it has substantial base64 content
            return base64Part && base64Part.length > 100;
        }

        // For regular URLs, just check if it's not empty
        return url.length > 0;
    })();

    // Render image with loading state
    if (isImage) {
        // Show loading placeholder if URL is not valid/complete
        if (!isUrlValid) {
            return (
                <div className="relative rounded-lg overflow-hidden border border-border/20 w-48 h-48 shrink-0 bg-muted/30 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                            <div className="absolute -bottom-1 -right-1">
                                <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground/70">
                            Loading image...
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div
                    className={cn(
                        "relative rounded-lg overflow-hidden border border-border/20 w-48 h-48 shrink-0 bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity",
                    )}
                    onClick={() => setIsPreviewOpen(true)}
                >
                    {/* Loading skeleton */}
                    {!imageLoaded && !imageError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                            <Skeleton className="w-full h-full" />
                        </div>
                    )}

                    {/* Error state */}
                    {imageError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                                <span className="text-xs">Failed to load</span>
                            </div>
                        </div>
                    )}

                    {/* Actual image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={url}
                        alt={name}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-200",
                            imageLoaded ? "opacity-100" : "opacity-0",
                        )}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                </div>

                {/* Image Preview Dialog */}
                <ImagePreview
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    url={url ?? null}
                />
            </>
        );
    }

    // Non-image file
    return <FileCard filename={name} size={part.size} type={mimeType} />;
});

FilePart.displayName = "FilePart";
