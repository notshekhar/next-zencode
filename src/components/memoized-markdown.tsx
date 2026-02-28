import { memo, PropsWithChildren, useMemo } from "react";

import { marked } from "marked";
import ReactMarkdown, { Components } from "react-markdown";
import { isString, toAny } from "@/lib/utils";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { PreBlock } from "./pre-block";
import { EnhancedTable } from "./enhanced-table";

const FadeIn = memo(({ children }: PropsWithChildren) => {
    return (
        <span className="fade-in animate-in duration-1000">{children} </span>
    );
});
FadeIn.displayName = "FadeIn";

const WordByWordFadeIn = memo(({ children }: PropsWithChildren) => {
    const childrens = [children]
        .flat()
        .flatMap((child) => (isString(child) ? child.split(" ") : child));
    return childrens.map((word, index) =>
        isString(word) ? <FadeIn key={index}>{word}</FadeIn> : word,
    );
});
WordByWordFadeIn.displayName = "WordByWordFadeIn";

const components: Partial<Components> = {
    code: memo(({ children }) => {
        return (
            <code className="text-sm rounded-md bg-accent py-1 px-2 mx-0.5">
                {children}
            </code>
        );
    }),
    blockquote: memo(({ children }) => {
        return (
            <div className="px-2">
                <blockquote className="relative px-4 my-6 overflow-hidden border-l-4 italic">
                    <WordByWordFadeIn>{children}</WordByWordFadeIn>
                </blockquote>
            </div>
        );
    }),
    p: memo(({ children }) => {
        return (
            <p className="leading-6 my-4 break-words">
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </p>
        );
    }),
    pre: memo(({ children }) => {
        return (
            <div className="py-2">
                <PreBlock>{children}</PreBlock>
            </div>
        );
    }),
    ol: memo(({ node, children, ...props }) => {
        return (
            <ol className="px-8 list-decimal list-outside" {...props}>
                {children}
            </ol>
        );
    }),
    li: memo(({ node, children, ...props }) => {
        return (
            <li className="py-2 break-words" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </li>
        );
    }),
    ul: memo(({ node, children, ...props }) => {
        return (
            <ul className="px-8 list-decimal list-outside" {...props}>
                {children}
            </ul>
        );
    }),
    strong: memo(({ node, children, ...props }) => {
        return (
            <span className="font-semibold" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </span>
        );
    }),
    a: memo(({ node, children, ...props }) => {
        return (
            <Link
                className="hover:underline text-blue-400"
                target="_blank"
                rel="noreferrer"
                {...toAny(props)}
            >
                <b>
                    <WordByWordFadeIn>{children}</WordByWordFadeIn>
                </b>
            </Link>
        );
    }),
    h1: memo(({ node, children, ...props }) => {
        return (
            <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </h1>
        );
    }),
    h2: memo(({ node, children, ...props }) => {
        return (
            <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </h2>
        );
    }),
    h3: memo(({ node, children, ...props }) => {
        return (
            <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </h3>
        );
    }),
    h4: memo(({ node, children, ...props }) => {
        return (
            <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </h4>
        );
    }),
    h5: memo(({ node, children, ...props }) => {
        return (
            <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </h5>
        );
    }),
    h6: memo(({ node, children, ...props }) => {
        return (
            <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </h6>
        );
    }),
    img: memo(({ node, children, ...props }) => {
        const { src, alt, ...rest } = props;

        return src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="mx-auto rounded-lg" src={src} alt={alt} {...rest} />
        ) : null;
    }),
    table: memo(({ children }) => {
        return <EnhancedTable>{children}</EnhancedTable>;
    }),
    thead: memo(({ children }) => {
        return <thead className="bg-muted/50">{children}</thead>;
    }),
    tbody: memo(({ children }) => {
        return <tbody>{children}</tbody>;
    }),
    tr: memo(({ children }) => {
        return (
            <tr className="border-b transition-colors hover:bg-muted/50">
                {children}
            </tr>
        );
    }),
    th: memo(({ children }) => {
        return (
            <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </th>
        );
    }),
    td: memo(({ children }) => {
        return (
            <td className="p-4 align-middle">
                <WordByWordFadeIn>{children}</WordByWordFadeIn>
            </td>
        );
    }),
};

const PureReactMarkdown = memo(
    ({ children, ...props }: any) => {
        return (
            <ReactMarkdown
                components={components}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                {...props}
            >
                {children}
            </ReactMarkdown>
        );
    },
    (prevProps, nextProps) => prevProps.children === nextProps.children,
);

export const MemoizedMarkdown = memo(
    ({ children }: { children: string }) => {
        const tokens = useMemo(() => marked.lexer(children), [children]);

        return (
            <>
                {tokens.map((token: any, index: number) => {
                    return (
                        <PureReactMarkdown key={index}>
                            {token.raw}
                        </PureReactMarkdown>
                    );
                })}
            </>
        );
    },
    (prevProps, nextProps) => prevProps.children === nextProps.children,
);
