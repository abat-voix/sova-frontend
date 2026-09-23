import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

/** react-markdown передаёт в каждый компонент служебный `node` (mdast) — на DOM-узел его пробрасывать нельзя. */
function withoutNode<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- отбрасываем node намеренно
  const { node, ...rest } = props;
  return rest;
}

const components: Components = {
  a: (props) => (
    <a
      {...withoutNode(props)}
      className="underline underline-offset-2"
      rel="noopener noreferrer"
      target="_blank"
    />
  ),
  code: (props) => (
    <code
      {...withoutNode(props)}
      className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15"
    />
  ),
  // Заголовки в узком пузыре сообщения только ломают вёрстку — рендерим их
  // как обычный жирный текст, сохраняя markdown-семантику для автора.
  h1: (props) => <p {...withoutNode(props)} className="font-semibold" />,
  h2: (props) => <p {...withoutNode(props)} className="font-semibold" />,
  h3: (props) => <p {...withoutNode(props)} className="font-semibold" />,
  li: (props) => <li {...withoutNode(props)} className="ms-4" />,
  ol: (props) => (
    <ol {...withoutNode(props)} className="list-decimal space-y-0.5 ps-4" />
  ),
  p: (props) => (
    <p {...withoutNode(props)} className="[&:not(:first-child)]:mt-2" />
  ),
  pre: (props) => (
    <pre {...withoutNode(props)} className="my-1 overflow-x-auto" />
  ),
  ul: (props) => (
    <ul {...withoutNode(props)} className="list-disc space-y-0.5 ps-4" />
  ),
};

/** Рендерит текст сообщения как markdown (GFM + одинарный перенос строки = `<br>`). */
export function MessageMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm break-words">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
