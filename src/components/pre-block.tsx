import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { useTheme } from "next-themes";
import React, { Fragment, JSX, memo, useEffect, useState } from "react";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import {
    BundledLanguage,
    bundledLanguages,
    codeToHast,
    codeToTokens,
    createHighlighter,
    ThemedToken,
} from "shiki";
import JsonView from "./ui/json-view";
import { jsx, jsxs } from "react/jsx-runtime";
import { safe } from "ts-safe";
import { useCopy } from "@/hooks/use-copy";
import { MermaidDiagram } from "./mermaid-diagram";

export const CodeBlock = memo(
    ({ token }: { token: ThemedToken }) => {
        return <span style={{ color: token.color }}>{token.content}</span>;
    },
    (prev, next) => {
        return prev.token.content === next.token.content;
    },
);

export async function Highlight(
    code: string,
    lang: BundledLanguage | (string & {}),
    theme: string,
) {
    const parsed: BundledLanguage = (
        bundledLanguages[lang as BundledLanguage] ? lang : "md"
    ) as BundledLanguage;

    if (lang === "json") {
        return (
            <PurePre code={code} lang={lang}>
                <JsonView data={code} initialExpandDepth={3} />
            </PurePre>
        );
    }

    if (lang === "mermaid") {
        return (
            <PurePre code={code} lang={lang}>
                <MermaidDiagram chart={code} />
            </PurePre>
        );
    }

    // useMemo(() => marked.lexer(children), [children]);

    // const tokens = await codeToTokens(code, {
    //     lang: parsed,
    //     theme,
    // });

    // return (
    //     <PurePre code={code} lang={lang}>
    //         {tokens.tokens.map((line, i) => (
    //             <div key={i}>
    //                 {line.map((token, j) => (
    //                     <CodeBlock key={j} token={token} />
    //                 ))}
    //             </div>
    //         ))}
    //     </PurePre>
    // );

    const out = await codeToHast(code, {
        lang: parsed,
        theme,
    });

    return toJsxRuntime(out, {
        Fragment,
        jsx,
        jsxs,
        components: {
            pre: (props) => <PurePre {...props} code={code} lang={lang} />,
        },
    }) as JSX.Element;
}

const PurePre = memo(
    ({
        children,
        className,
        code,
        lang,
    }: {
        children: any;
        className?: string;
        code: string;
        lang: string;
    }) => {
        const { copied, copy } = useCopy();

        const downloadCode = () => {
            const getFileExtension = (language: string) => {
                const extensions: Record<string, string> = {
                    javascript: "js",
                    typescript: "ts",
                    python: "py",
                    java: "java",
                    cpp: "cpp",
                    c: "c",
                    csharp: "cs",
                    php: "php",
                    ruby: "rb",
                    go: "go",
                    rust: "rs",
                    swift: "swift",
                    kotlin: "kt",
                    scala: "scala",
                    html: "html",
                    css: "css",
                    scss: "scss",
                    sass: "sass",
                    less: "less",
                    json: "json",
                    xml: "xml",
                    yaml: "yaml",
                    yml: "yml",
                    markdown: "md",
                    sql: "sql",
                    bash: "sh",
                    shell: "sh",
                    powershell: "ps1",
                    dockerfile: "dockerfile",
                    r: "r",
                    matlab: "m",
                };
                return extensions[language.toLowerCase()] || "txt";
            };

            const extension = getFileExtension(lang);
            const fileName = `code.${extension}`;

            const blob = new Blob([code], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        return (
            <pre className={cn("relative ", className)}>
                <div className="p-1.5">
                    <div className="w-full flex z-20 py-2 px-4 items-center mb-2">
                        <span className="text-sm text-muted-foreground">
                            {lang}
                        </span>
                        <div className="ml-auto flex gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="z-10 p-3! size-2! rounded-sm"
                                onClick={downloadCode}
                                title="Download code"
                            >
                                <DownloadIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant={copied ? "secondary" : "ghost"}
                                className="z-10 p-3! size-2! rounded-sm"
                                onClick={() => {
                                    copy(code);
                                }}
                                title="Copy code"
                            >
                                {copied ? (
                                    <CheckIcon className="h-4 w-4" />
                                ) : (
                                    <CopyIcon className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="relative overflow-x-auto px-6 pb-6">
                    {children}
                </div>
            </pre>
        );
    },
);

export function PreBlock({ children }: { children: any }) {
    const code = children.props.children;
    const { theme } = useTheme();
    const language = children.props.className?.split("-")?.[1] || "bash";
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [highlightedComponent, setHighlightedComponent] =
        useState<JSX.Element | null>(null);
    const codeRef = React.useRef(code);

    // Update ref on every render to track latest code
    codeRef.current = code;

    useEffect(() => {
        // Reset highlighted component when code changes significantly (new code block)
        // but don't clear it during streaming to avoid flicker
        if (highlightedComponent === null) {
            setIsHighlighting(true);
        }

        // Debounce highlighting - only run after code stops changing for 300ms
        const timeoutId = setTimeout(() => {
            setIsHighlighting(true);
            safe()
                .map(() =>
                    Highlight(
                        codeRef.current,
                        language,
                        theme == "dark" ? "dark-plus" : "github-light",
                    ),
                )
                .ifOk((component) => {
                    setHighlightedComponent(component);
                })
                .watch(() => setIsHighlighting(false));
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [theme, language, code]);

    // Show unhighlighted code immediately, highlighted version after debounce
    const displayComponent = highlightedComponent ?? (
        <PurePre code={code} lang={language}>
            <code className="whitespace-pre-wrap">{code}</code>
        </PurePre>
    );

    // For other code blocks, render as before
    return (
        <div
            className={cn(
                isHighlighting && !highlightedComponent && "animate-pulse",
                "text-sm flex bg-muted/50 flex-col rounded-2xl relative my-4 overflow-hidden",
            )}
        >
            {displayComponent}
        </div>
    );
}
