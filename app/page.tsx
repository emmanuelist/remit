import { serviceStatuses, watchedSafe } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Page() {
  const services = serviceStatuses();
  const safe = watchedSafe();
  const ready = services.filter((s) => s.configured).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-rule border-b pb-8" data-shot="masthead">
        <p className="font-mono text-[11px] text-ink-quiet uppercase tracking-[0.18em]">
          Phase 0 · rig
        </p>
        <h1 className="mt-3 font-prose text-5xl leading-none tracking-tight">Remit</h1>
        <p className="mt-4 max-w-xl font-prose text-ink-quiet text-lg leading-snug">
          An agent gets exactly the authority its owners signed — byte for byte.
        </p>
        <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
          <span className="text-ink-quiet">Watching</span>
          <span className="data text-ink">{safe.address ?? "no Safe"}</span>
          <span className="text-ink-quiet">on chain {safe.chainId}</span>
        </p>
      </header>

      <section className="mt-12" data-shot="ledger">
        <h2 className="font-mono text-[11px] text-ink-quiet uppercase tracking-[0.18em]">
          Remits
        </h2>
        <div className="mt-4 border border-rule bg-paper-sunk px-6 py-12 text-center">
          <p className="font-prose text-xl">No remits yet.</p>
          {safe.address ? (
            <p className="mt-2 text-ink-quiet text-sm">
              The watched Safe has no proposals from this agent.
            </p>
          ) : (
            <>
              <p className="mt-2 text-ink-quiet text-sm">No Safe is being watched.</p>
              <p className="data mt-3 text-ink-quiet text-xs">NEXT_PUBLIC_SAFE_ADDRESS</p>
            </>
          )}
        </div>
      </section>

      <section className="mt-12" data-shot="readiness">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] text-ink-quiet uppercase tracking-[0.18em]">
            Sources
          </h2>
          <p className="font-mono text-[11px] text-ink-quiet">
            {ready} of {services.length} configured
          </p>
        </div>

        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            {services.map((s) => (
              <tr className="border-rule border-t" key={s.name}>
                <td className="py-3 pr-4 align-top">
                  <span className="font-medium">{s.label}</span>
                  <span className="mt-0.5 block text-ink-quiet text-xs">{s.detail}</span>
                </td>
                <td className="w-28 py-3 text-right align-top">
                  <span
                    className={`data text-xs ${s.configured ? "text-assent" : "text-ink-quiet"}`}
                  >
                    {s.configured ? "connected" : "not set"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 border-rule border-t pt-4 text-ink-quiet text-xs leading-relaxed">
          Every value on this page is read from the running environment. Nothing here is
          mocked, and nothing is rendered that has no real source behind it.
        </p>
      </section>
    </main>
  );
}
