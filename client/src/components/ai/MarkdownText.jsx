import { Fragment } from 'react';

/**
 * Renders the small Markdown subset the AI coach uses — paragraphs, "- " /
 * "1. " lists and **bold** — as React elements. No HTML is ever injected, so
 * AI output cannot run scripts or add markup.
 */
function inline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part.replace(/\*/g, '')}</Fragment>
    ),
  );
}

export function MarkdownText({ text }) {
  const blocks = [];
  let list = null;

  String(text)
    .split('\n')
    .forEach((rawLine) => {
      const line = rawLine.trim();
      const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (bullet) {
        if (!list) {
          list = { ordered: /^\d/.test(line), items: [] };
          blocks.push(list);
        }
        list.items.push(bullet[1]);
        return;
      }
      list = null;
      if (line) blocks.push({ paragraph: line.replace(/^#+\s*/, '') });
    });

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) =>
        block.items ? (
          block.ordered ? (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item, `${i}-${j}`)}</li>
              ))}
            </ol>
          ) : (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          )
        ) : (
          <p key={i}>{inline(block.paragraph, String(i))}</p>
        ),
      )}
    </div>
  );
}
