import { formatBytes } from "@/lib/utils";
import {
    FileText,
    Table,
    FileArchive,
    Code,
    File,
    X,
    Loader2,
} from "lucide-react";
import { Button } from "./button";
import { memo } from "react";

interface FileCardProps {
    filename: string;
    size?: number;
    type?: string;
    onRemove?: () => void;
    isLoading?: boolean;
}

export const FileCard = memo(
    ({ filename, size, type, onRemove, isLoading }: FileCardProps) => {
        // Determine icon and color based on extension/type
        const getFileInfo = () => {
            const ext = filename.split(".").pop()?.toLowerCase() || "";
            const mime = type?.toLowerCase() || "";

            if (mime.includes("pdf") || ext === "pdf") {
                return {
                    icon: FileText,
                    color: "bg-red-500",
                    label: "PDF",
                };
            }
            if (
                mime.includes("spreadsheet") ||
                mime.includes("csv") ||
                ["csv", "xls", "xlsx"].includes(ext)
            ) {
                return {
                    icon: Table,
                    color: "bg-green-500",
                    label: "Spreadsheet",
                };
            }
            if (
                mime.includes("zip") ||
                mime.includes("compressed") ||
                mime.includes("archive") ||
                ["zip", "rar", "7z", "tar", "gz"].includes(ext)
            ) {
                return {
                    icon: FileArchive,
                    color: "bg-violet-500", // Violet/Purple for archive
                    label: "Zip Archive",
                };
            }
            if (
                mime.includes("text/x-") ||
                [
                    "js",
                    "ts",
                    "tsx",
                    "jsx",
                    "py",
                    "html",
                    "css",
                    "json",
                ].includes(ext)
            ) {
                return {
                    icon: Code,
                    color: "bg-blue-500",
                    label: "Code",
                };
            }

            return {
                icon: File,
                color: "bg-gray-500",
                label: "File",
            };
        };

        const { icon: Icon, color, label } = getFileInfo();

        return (
            <div className="relative flex items-center gap-3 p-3 bg-card border border-border rounded-xl w-64 group">
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        <X size={10} />
                    </button>
                )}

                <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isLoading ? "bg-muted" : color}`}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin text-muted-foreground h-5 w-5" />
                    ) : (
                        <Icon className="text-white h-6 w-6" />
                    )}
                </div>

                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate text-foreground">
                        {filename}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{label}</span>
                        {size && (
                            <>
                                <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground" />
                                <span>{formatBytes(size)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    },
);
