import type { ReactNode } from "react";

/** Small-caps section label. The only thing that names a region. */
export function Kicker({ children, shot }: { children: ReactNode; shot?: string }) {
  return (
    <p
      className="font-mono text-[11px] text-ink-quiet uppercase tracking-[0.18em]"
      data-shot={shot}
    >
      {children}
    </p>
  );
}

/** A number that matters, with the word for what it is underneath it. */
export function Stat({
  value,
  label,
  shot,
  lead,
}: {
  value: ReactNode;
  label: string;
  shot?: string;
  /** The one figure the eye should land on first. */
  lead?: boolean;
}) {
  return (
    <div data-shot={shot}>
      <p className={`data leading-none ${lead ? "text-4xl" : "text-2xl text-ink-quiet"}`}>
        {value}
      </p>
      <p className="mt-2 font-mono text-[10px] text-ink-quiet uppercase tracking-[0.14em]">
        {label}
      </p>
    </div>
  );
}

/** Hex that is meant to be read, not glanced at. Never truncated by default —
 *  the product's claim is about bytes, so hiding them would undercut it. */
export function Hex({
  value,
  short,
  title,
}: {
  value: string;
  short?: boolean;
  title?: string;
}) {
  const shown =
    short && value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
  return (
    <span className="data" title={title ?? value}>
      {shown}
    </span>
  );
}

/** Something went wrong, or a source is not configured. Stated, never swallowed. */
export function Notice({
  title,
  detail,
  tone = "quiet",
}: {
  title: string;
  detail?: string;
  tone?: "quiet" | "alarm";
}) {
  const accent = tone === "alarm" ? "text-alarm" : "text-ink-quiet";
  return (
    <div className="border border-rule bg-paper-sunk px-5 py-4" data-shot="notice">
      <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${accent}`}>
        {title}
      </p>
      {detail ? (
        <p className="mt-2 text-ink-quiet text-sm leading-relaxed">{detail}</p>
      ) : null}
    </div>
  );
}
