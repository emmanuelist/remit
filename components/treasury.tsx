import { Hex, Kicker, Stat } from "@/components/type";
import type { SafeState, TokenBalance } from "@/lib/safe/read";

const ROLE: Record<string, string> = {
  [process.env.SAFE_OWNER_A_ADDRESS?.toLowerCase() ?? "-"]: "browser wallet",
  [process.env.SAFE_OWNER_B_ADDRESS?.toLowerCase() ?? "-"]: "scripted signer",
  [process.env.SAFE_OWNER_C_ADDRESS?.toLowerCase() ?? "-"]: "scripted signer",
};

export function Treasury({
  safe,
  balance,
  explorer,
  privateMempool,
}: {
  safe: SafeState;
  balance: TokenBalance | null;
  explorer: string | null;
  privateMempool: boolean;
}) {
  return (
    <section className="border border-rule" data-shot="treasury">
      <header className="border-rule border-b px-6 pt-5 pb-5">
        <Kicker>Treasury</Kicker>
        <p className="data mt-3 text-[15px] leading-snug">
          {explorer ? (
            <a
              className="underline decoration-rule underline-offset-4 hover:decoration-ink"
              href={`${explorer}/address/${safe.address}`}
              rel="noreferrer"
              target="_blank"
            >
              {safe.address}
            </a>
          ) : (
            safe.address
          )}
        </p>
        <p className="mt-2 text-ink-quiet text-xs">
          Safe {safe.version} · chain {safe.chainId}
          {privateMempool ? " · private mempool" : null}
        </p>
      </header>

      <div className="grid grid-cols-2 border-rule border-b sm:grid-cols-3">
        <div className="border-rule px-6 py-6 sm:border-r">
          <Stat
            label={balance ? balance.symbol : "balance"}
            lead
            shot="balance"
            value={balance ? balance.formatted : "—"}
          />
        </div>
        <div className="border-rule border-l px-6 py-6 sm:border-l-0 sm:border-r">
          <Stat
            label="threshold"
            shot="threshold"
            value={`${safe.threshold} of ${safe.owners.length}`}
          />
        </div>
        <div className="col-span-2 border-rule border-t px-6 py-6 sm:col-span-1 sm:border-t-0">
          <Stat label="next nonce" shot="nonce" value={safe.nonce} />
        </div>
      </div>

      <div className="px-6 py-5">
        <Kicker>Signers</Kicker>
        <ul className="mt-3 space-y-2">
          {safe.owners.map((owner) => (
            <li
              aria-label={`${owner} — ${ROLE[owner.toLowerCase()] ?? "signer"}`}
              className="flex items-baseline gap-x-3"
              key={owner}
            >
              {/* An owner address is identity, not the claim, so it may be abbreviated
                  where space is short. Calldata never is. */}
              <span aria-hidden className="sm:hidden">
                <Hex short value={owner} />
              </span>
              <span aria-hidden className="hidden sm:inline">
                <Hex value={owner} />
              </span>
              <span aria-hidden className="mb-[3px] h-px flex-1 bg-rule" />
              <span aria-hidden className="shrink-0 text-ink-quiet text-xs">
                {ROLE[owner.toLowerCase()] ?? "signer"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-rule border-t px-6 py-3 font-mono text-[10px] text-ink-quiet uppercase tracking-[0.14em]">
        read through KeeperHub · execute_contract_call
      </p>
    </section>
  );
}
