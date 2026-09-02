import { Hex } from "@/components/type";
import { decodeOrigin } from "@/lib/remit/origin";
import type { MultisigTransaction } from "@/lib/safe/service";

/** Signature progress as an object rather than a sentence: one mark per required signer. */
function Progress({ have, need }: { have: number; need: number }) {
  // Each slot is named for the signature it stands for, so the mark has an identity
  // that is not its position in an array.
  const slots = Array.from({ length: need }, (_, i) => ({
    id: `signature-${i + 1}-of-${need}`,
    filled: i < have,
  }));

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {/* Decoration. The count beside it is the accessible text, so labelling these
          too would make a screen reader say the same thing twice. */}
      {slots.map((slot) => (
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${
            slot.filled ? "bg-assent" : "border border-rule"
          }`}
          key={slot.id}
        />
      ))}
      <span className="ml-1 font-mono text-[11px] text-ink-quiet">
        {have} of {need} signed
      </span>
    </span>
  );
}

/** The stamp. The only place the seal colour appears in the product. */
function Seal({ tone, children }: { tone: "seal" | "alarm"; children: string }) {
  const colour = tone === "seal" ? "border-seal text-seal" : "border-alarm text-alarm";
  return (
    <span
      className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${colour}`}
    >
      {children}
    </span>
  );
}

export function RemitRow({
  tx,
  explorer,
}: {
  tx: MultisigTransaction;
  explorer: string | null;
}) {
  const origin = decodeOrigin(tx.origin);
  const executed = tx.isExecuted;
  const failed = executed && tx.isSuccessful === false;

  return (
    <li className="border-rule border-b py-5" data-shot="remit-row">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <p className="font-prose text-lg leading-snug">
          {origin ? (
            origin.intent
          ) : (
            <span className="text-ink-quiet">Proposed outside Remit</span>
          )}
        </p>
        {executed ? (
          <Seal tone={failed ? "alarm" : "seal"}>{failed ? "reverted" : "executed"}</Seal>
        ) : (
          <Progress have={tx.confirmations.length} need={tx.confirmationsRequired} />
        )}
      </div>

      <p className="mt-1.5 text-ink-quiet text-xs">
        {tx.dataDecoded?.method ? `${tx.dataDecoded.method}()` : "raw call"} · nonce{" "}
        {tx.nonce}
        {origin ? ` · composed by ${origin.composer}` : null}
      </p>

      <dl className="mt-3 space-y-1 text-[11px] text-ink-quiet">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-mono uppercase tracking-[0.14em]">signed</dt>
          <dd>
            <Hex short value={tx.safeTxHash} />
          </dd>
        </div>
        {executed && tx.transactionHash ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="font-mono uppercase tracking-[0.14em]">executed</dt>
            <dd>
              {explorer ? (
                <a
                  className="underline decoration-rule underline-offset-4 hover:decoration-ink"
                  href={`${explorer}/tx/${tx.transactionHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Hex short value={tx.transactionHash} />
                </a>
              ) : (
                <Hex short value={tx.transactionHash} />
              )}
            </dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}
