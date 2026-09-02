import { Hex } from "@/components/type";
import { decodeOrigin } from "@/lib/remit/origin";
import type { MultisigTransaction } from "@/lib/safe/service";

/** Signature progress as an object rather than a sentence: one mark per required signer. */
function Progress({ have, need }: { have: number; need: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {/* Decoration. The count beside it is the accessible text, so labelling these
          too would make a screen reader say the same thing twice. */}
      {Array.from({ length: need }, (_, i) => (
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${
            i < have ? "bg-assent" : "border border-rule"
          }`}
          key={`mark-${need}-${i}`}
        />
      ))}
      <span className="ml-1 font-mono text-[11px] text-ink-quiet">
        {have} of {need} signed
      </span>
    </span>
  );
}

export function RemitRow({ tx }: { tx: MultisigTransaction }) {
  const origin = decodeOrigin(tx.origin);
  const signed = tx.confirmations.length;
  const need = tx.confirmationsRequired;

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
        <Progress have={signed} need={need} />
      </div>

      <p className="mt-1.5 text-ink-quiet text-xs">
        {tx.dataDecoded?.method ? `${tx.dataDecoded.method}()` : "raw call"} · nonce{" "}
        {tx.nonce}
        {origin ? ` · composed by ${origin.composer}` : null}
      </p>

      <p className="mt-3 text-[11px] text-ink-quiet">
        <span className="font-mono uppercase tracking-[0.14em]">safeTxHash </span>
        <Hex short value={tx.safeTxHash} />
      </p>
    </li>
  );
}
