"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("css", css);

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard tidak tersedia — abaikan
    }
  }

  const lang = language || "text";

  return (
    <div className="group my-2 overflow-hidden rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {lang}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-zinc-400 opacity-0 transition-opacity hover:text-zinc-100 group-hover:opacity-100"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{ margin: 0, background: "transparent", fontSize: "13px" }}
        codeTagProps={{
          style: { fontFamily: "var(--font-geist-mono), monospace" },
        }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="rounded-md border border-zinc-700/70 bg-zinc-800 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-300">
      {children}
    </code>
  );
}

/**
 * Renderer Markdown (GFM) untuk jawaban AI.
 * Gunakan di dalam komponen client; instance di-memo agar tidak re-render
 * setiap potongan streaming.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const isBlock = !!(className || (typeof children === "string" && children.includes("\n")));
            if (isBlock && match) {
              return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, "")} />;
            }
            if (isBlock) {
              return (
                <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <code className="font-mono text-[13px]">{children}</code>
                </pre>
              );
            }
            return <InlineCode>{children}</InlineCode>;
          },
          pre({ children }) {
            // <pre> yang dibungkus rehype — anaknya sudah CodeBlock/pre.
            return <>{children}</>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          h1: (p) => <h1 className="mb-2 mt-4 text-lg font-bold" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-4 text-base font-bold" {...p} />,
          h3: (p) => <h3 className="mb-1.5 mt-3 text-sm font-semibold" {...p} />,
          p: (p) => <p className="my-2 leading-relaxed" {...p} />,
          table: (p) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="border border-zinc-700 bg-zinc-800/70 px-2 py-1 text-left font-semibold" {...p} />
          ),
          td: (p) => <td className="border border-zinc-700 px-2 py-1" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-2 border-l-2 border-zinc-600 pl-3 text-zinc-400" {...p} />
          ),
          hr: () => <hr className="my-3 border-zinc-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
