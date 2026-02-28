"use client";

import { memo, useMemo } from "react";
import {
    FolderOpen,
    File,
    Folder,
    FileCode2,
    FileJson,
    FileText,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    FileType,
    FileCog,
    FileSpreadsheet,
    Shield,
    Database,
    Globe,
    Terminal,
    Gem,
    Package,
    Braces,
    Hash,
} from "lucide-react";
import { ToolWrapper, type ToolPartState } from "./tool-wrapper";

type LucideIcon = typeof File;

const iconMap: Record<string, { icon: LucideIcon; color: string }> = {
    // TypeScript / JavaScript
    ts: { icon: FileCode2, color: "text-blue-400" },
    tsx: { icon: FileCode2, color: "text-blue-400" },
    js: { icon: FileCode2, color: "text-yellow-400" },
    jsx: { icon: FileCode2, color: "text-yellow-400" },
    mjs: { icon: FileCode2, color: "text-yellow-400" },
    cjs: { icon: FileCode2, color: "text-yellow-400" },

    // Web
    html: { icon: Globe, color: "text-orange-400" },
    htm: { icon: Globe, color: "text-orange-400" },
    css: { icon: Hash, color: "text-purple-400" },
    scss: { icon: Hash, color: "text-pink-400" },
    sass: { icon: Hash, color: "text-pink-400" },
    less: { icon: Hash, color: "text-indigo-400" },

    // Data / Config
    json: { icon: FileJson, color: "text-yellow-300" },
    jsonc: { icon: FileJson, color: "text-yellow-300" },
    yaml: { icon: FileCog, color: "text-red-300" },
    yml: { icon: FileCog, color: "text-red-300" },
    toml: { icon: FileCog, color: "text-red-300" },
    ini: { icon: FileCog, color: "text-red-300" },
    env: { icon: FileCog, color: "text-green-300" },
    xml: { icon: Braces, color: "text-orange-300" },

    // Documents / Text
    md: { icon: FileText, color: "text-sky-300" },
    mdx: { icon: FileText, color: "text-sky-300" },
    txt: { icon: FileText, color: "text-zinc-400" },
    pdf: { icon: FileText, color: "text-red-400" },
    doc: { icon: FileText, color: "text-blue-300" },
    docx: { icon: FileText, color: "text-blue-300" },
    csv: { icon: FileSpreadsheet, color: "text-green-400" },
    xls: { icon: FileSpreadsheet, color: "text-green-400" },
    xlsx: { icon: FileSpreadsheet, color: "text-green-400" },

    // Images
    png: { icon: FileImage, color: "text-emerald-400" },
    jpg: { icon: FileImage, color: "text-emerald-400" },
    jpeg: { icon: FileImage, color: "text-emerald-400" },
    gif: { icon: FileImage, color: "text-emerald-400" },
    svg: { icon: FileImage, color: "text-amber-400" },
    ico: { icon: FileImage, color: "text-emerald-400" },
    webp: { icon: FileImage, color: "text-emerald-400" },
    avif: { icon: FileImage, color: "text-emerald-400" },

    // Video / Audio
    mp4: { icon: FileVideo, color: "text-violet-400" },
    webm: { icon: FileVideo, color: "text-violet-400" },
    mov: { icon: FileVideo, color: "text-violet-400" },
    mp3: { icon: FileAudio, color: "text-pink-400" },
    wav: { icon: FileAudio, color: "text-pink-400" },
    ogg: { icon: FileAudio, color: "text-pink-400" },

    // Archives
    zip: { icon: FileArchive, color: "text-amber-300" },
    tar: { icon: FileArchive, color: "text-amber-300" },
    gz: { icon: FileArchive, color: "text-amber-300" },
    rar: { icon: FileArchive, color: "text-amber-300" },

    // Other languages
    py: { icon: FileCode2, color: "text-green-400" },
    rb: { icon: Gem, color: "text-red-400" },
    go: { icon: FileCode2, color: "text-cyan-400" },
    rs: { icon: FileCode2, color: "text-orange-400" },
    java: { icon: FileCode2, color: "text-red-300" },
    kt: { icon: FileCode2, color: "text-violet-400" },
    swift: { icon: FileCode2, color: "text-orange-400" },
    c: { icon: FileCode2, color: "text-blue-300" },
    cpp: { icon: FileCode2, color: "text-blue-300" },
    h: { icon: FileCode2, color: "text-blue-300" },
    php: { icon: FileCode2, color: "text-indigo-400" },

    // Shell / Scripts
    sh: { icon: Terminal, color: "text-green-300" },
    bash: { icon: Terminal, color: "text-green-300" },
    zsh: { icon: Terminal, color: "text-green-300" },
    fish: { icon: Terminal, color: "text-green-300" },
    bat: { icon: Terminal, color: "text-green-300" },
    ps1: { icon: Terminal, color: "text-blue-300" },

    // Package / Lock
    lock: { icon: Shield, color: "text-zinc-500" },

    // Database
    sql: { icon: Database, color: "text-blue-300" },
    db: { icon: Database, color: "text-blue-300" },
    sqlite: { icon: Database, color: "text-blue-300" },
    prisma: { icon: Database, color: "text-teal-400" },

    // Fonts
    woff: { icon: FileType, color: "text-zinc-400" },
    woff2: { icon: FileType, color: "text-zinc-400" },
    ttf: { icon: FileType, color: "text-zinc-400" },
    otf: { icon: FileType, color: "text-zinc-400" },
    eot: { icon: FileType, color: "text-zinc-400" },
};

// Special full-name matches
const nameMap: Record<string, { icon: LucideIcon; color: string }> = {
    Dockerfile: { icon: Package, color: "text-blue-400" },
    "docker-compose.yml": { icon: Package, color: "text-blue-400" },
    "docker-compose.yaml": { icon: Package, color: "text-blue-400" },
    ".gitignore": { icon: FileCog, color: "text-zinc-500" },
    ".eslintrc": { icon: FileCog, color: "text-violet-400" },
    ".prettierrc": { icon: FileCog, color: "text-violet-400" },
    "tsconfig.json": { icon: FileCog, color: "text-blue-400" },
    "package.json": { icon: Package, color: "text-green-400" },
    "package-lock.json": { icon: Shield, color: "text-zinc-500" },
    "bun.lockb": { icon: Shield, color: "text-zinc-500" },
    "yarn.lock": { icon: Shield, color: "text-zinc-500" },
    "pnpm-lock.yaml": { icon: Shield, color: "text-zinc-500" },
    LICENSE: { icon: FileText, color: "text-yellow-300" },
    README: { icon: FileText, color: "text-sky-300" },
    "README.md": { icon: FileText, color: "text-sky-300" },
    Makefile: { icon: Terminal, color: "text-orange-300" },
};

function getFileIcon(name: string): { Icon: LucideIcon; color: string } {
    // Check exact name match first
    if (nameMap[name]) {
        return { Icon: nameMap[name].icon, color: nameMap[name].color };
    }

    // Check extension
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (iconMap[ext]) {
        return { Icon: iconMap[ext].icon, color: iconMap[ext].color };
    }

    // Dotfiles
    if (name.startsWith(".")) {
        return { Icon: FileCog, color: "text-zinc-500" };
    }

    return { Icon: File, color: "text-zinc-400" };
}

export const ListFilesTool = memo(function ListFilesTool({
    part,
}: {
    part: ToolPartState;
}) {
    const inputSummary = useMemo(() => {
        return (
            part.input?.dirPath ||
            part.input?.path ||
            part.input?.directory ||
            "Listing files..."
        );
    }, [part.input]);

    const files = useMemo(() => {
        if (part.state !== "output-available" || !part.output) return [];
        return part.output?.files || [];
    }, [part.output, part.state]);

    const count =
        part.state === "output-available" ? (part.output?.count ?? 0) : 0;

    return (
        <ToolWrapper
            part={part}
            icon={FolderOpen}
            label="List Files"
            inputSummary={inputSummary}
        >
            {part.state === "output-error" && part.errorText && (
                <pre className="text-xs text-destructive bg-destructive/10 rounded-md p-3 whitespace-pre-wrap font-mono">
                    {part.errorText}
                </pre>
            )}
            {files.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground mb-1">
                        {count} item{count !== 1 ? "s" : ""}
                    </span>
                    {files.map(
                        (file: { name: string; type: string }, i: number) => {
                            const { Icon, color } = file.type === "directory"
                                ? { Icon: Folder, color: "text-blue-400" }
                                : getFileIcon(file.name);
                            return (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono text-muted-foreground"
                                >
                                    <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                                    <span>{file.name}</span>
                                </div>
                            );
                        },
                    )}
                </div>
            )}
        </ToolWrapper>
    );
});
