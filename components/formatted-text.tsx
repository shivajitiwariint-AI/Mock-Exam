import { Fragment } from "react";

type FormattedTextProps = {
  text: string;
  className?: string;
};

function renderInline(text: string) {
  // Bold common lead-in labels for scannability.
  const parts = text.split(/(Interview tip:|Example:|Key point:|Rule:|Benefit:|Note:|Trade-off:)/g);
  return parts.map((part, index) => {
    if (
      part === "Interview tip:" ||
      part === "Example:" ||
      part === "Key point:" ||
      part === "Rule:" ||
      part === "Benefit:" ||
      part === "Note:" ||
      part === "Trade-off:"
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

  for (const rawLine of lines) {
    const line = rawLine.trim();
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

  return (
    <div className={className ?? "space-y-3 text-sm text-slate-700"}>
      {blocks}
    </div>
  );
}