import { Fragment } from "react";

type FormattedTextProps = {
  text: string;
  className?: string;
};

function renderInline(text: string) {
  const parts = text.split(/(Interview tip:|Example:|Key point:|Rule:|Benefit:|Note:|Trade-off:|Diagram:)/g);
  return parts.map((part, index) => {
    if (
      part === "Interview tip:" ||
      part === "Example:" ||
      part === "Key point:" ||
      part === "Rule:" ||
      part === "Benefit:" ||
      part === "Note:" ||
      part === "Trade-off:" ||
      part === "Diagram:"
    ) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function FormattedText({ text, className }: FormattedTextProps) {
  const lines = text.split(/\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(
        <p key={blocks.length} className="whitespace-pre-wrap leading-7">
          {renderInline(paragraph.join(" "))}
        </p>,
      );
      paragraph = [];
    }
  };

  const flushBullets = () => {
    if (bullets.length > 0) {
      blocks.push(
        <ul
          key={blocks.length}
          className="list-disc space-y-1.5 pl-5 leading-7 marker:text-indigo-500"
        >
          {bullets.map((bullet, index) => (
            <li key={index}>{renderInline(bullet)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  const flushCode = () => {
    if (codeLines.length > 0) {
      blocks.push(
        <pre
          key={blocks.length}
          className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-5 text-slate-100"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      codeLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("```")) {
      flushParagraph();
      flushBullets();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (/^[•\-*]\s*/.test(line) || /^\d+\.\s+/.test(line)) {
      flushParagraph();
      bullets.push(line.replace(/^[•\-*]\s*/, "").replace(/^\d+\.\s*/, ""));
    } else {
      flushBullets();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushBullets();
  if (inCode) flushCode();

  return (
    <div className={className ?? "space-y-3 text-sm text-slate-700"}>
      {blocks}
    </div>
  );
}