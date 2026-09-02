import { RemitRow } from "@/components/remit-row";
import { Treasury } from "@/components/treasury";
import { Kicker, Notice } from "@/components/type";
import { watchedSafe } from "@/lib/config";
import { getChain } from "@/lib/keeperhub/client";
import { readSafeState, readTokenBalance } from "@/lib/safe/read";
import { pendingTransactions } from "@/lib/safe/service";

export const dynamic = "force-dynamic";

/** Every read is attempted for real. A failure is reported, never substituted. */
async function attempt<T>(work: () => Promise<T>): Promise<{ ok: T } | { err: string }> {
  try {
    return { ok: await work() };
  } catch (error) {
    return { err: error instanceof Error ? error.message : "Unknown failure" };
  }
}

export default async function Page() {
  const watched = watchedSafe();

  if (!watched.address) {
    return (
      <Shell>
        <Notice
          detail="Set NEXT_PUBLIC_SAFE_ADDRESS to the Safe this instance should watch."
          title="No Safe configured"
        />
      </Shell>
    );
  }

  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const [safe, chain, balance, queue] = await Promise.all([
    attempt(() => readSafeState(watched.address as string, watched.chainId)),
    attempt(() => getChain(watched.chainId)),
    usdc
      ? attempt(() => readTokenBalance(usdc, watched.address as string, watched.chainId))
      : Promise.resolve({ ok: null } as const),
    attempt(() => pendingTransactions(watched.address as string, watched.chainId)),
  ]);

  return (
    <Shell>
      {"err" in safe ? (
        <Notice
          detail={`${safe.err} — the Safe's state could not be read through KeeperHub, so nothing about it is shown. No fallback source is used on purpose.`}
          title="KeeperHub unreachable"
          tone="alarm"
        />
      ) : (
        <Treasury
          balance={"ok" in balance ? balance.ok : null}
          explorer={"ok" in chain && chain.ok ? chain.ok.explorerUrl : null}
          privateMempool={
            "ok" in chain && chain.ok ? chain.ok.usePrivateMempoolRpc : false
          }
          safe={safe.ok}
        />
      )}

      <section className="mt-10" data-shot="register">
        <Kicker>Remits</Kicker>
        <div className="mt-3">
          {"err" in queue ? (
            <Notice
              detail={queue.err}
              title="Safe Transaction Service unreachable"
              tone="alarm"
            />
          ) : queue.ok.length === 0 ? (
            <div className="border border-rule bg-paper-sunk px-6 py-8">
              <p className="font-prose text-lg">No remits yet.</p>
              <p className="mt-1.5 max-w-md text-ink-quiet text-sm leading-relaxed">
                Nothing has been proposed to this Safe. A remit appears here the moment an
                agent composes one, and stays until its signed bytes and executed bytes
                have been compared.
              </p>
            </div>
          ) : (
            <ul className="border-rule border-t">
              {queue.ok.map((tx) => (
                <RemitRow key={tx.safeTxHash} tx={tx} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10" data-shot="masthead">
        <Kicker>Phase 2 · propose path</Kicker>
        <h1 className="mt-3 font-prose text-5xl leading-none tracking-tight">Remit</h1>
        <p className="mt-4 max-w-xl font-prose text-ink-quiet text-lg leading-snug">
          An agent gets exactly the authority its owners signed — byte for byte.
        </p>
      </header>
      {children}
    </main>
  );
}
