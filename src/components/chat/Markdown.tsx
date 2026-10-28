import ReactMarkdown, { type Components } from "react-markdown";

// Answers are model output: no raw HTML (react-markdown's default) and no images.
const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  strong: ({ children }) => <strong className="text-ink font-semibold">{children}</strong>,
  code: ({ children }) => (
    <code className="bg-paper border-line rounded border px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  a: ({ href = "", children }) => {
    const external = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="text-accent-text underline underline-offset-4 hover:decoration-2"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    );
  },
};

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown components={components} disallowedElements={["img"]} unwrapDisallowed>
      {text}
    </ReactMarkdown>
  );
}
