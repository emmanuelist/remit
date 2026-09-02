import "server-only";

/**
 * KeeperHub REST client.
 *
 * Every contract read goes through KeeperHub rather than a public RPC. That is the
 * integration under test: if KeeperHub cannot answer, the page says so instead of
 * quietly falling back to another source and rendering a number that proves nothing.
 *
 * Reads send `simulate: true`. Not because anything is being simulated — a `view`
 * function cannot write — but because the route gates on that flag rather than on the
 * function's mutability, so a read-scoped key is refused without it. See FINDINGS.md §1.
 */

const BASE = "https://app.keeperhub.com/api";

export class KeeperHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "KeeperHubError";
  }
}

function readKey(): string {
  const key = process.env.KEEPERHUB_API_KEY_READ?.trim();
  if (!key) {
    throw new KeeperHubError("KEEPERHUB_API_KEY_READ is not set", 0, "unconfigured");
  }
  return key;
}

type ContractCall = {
  readonly address: string;
  readonly chainId: number;
  readonly functionName: string;
  readonly args?: readonly unknown[];
  readonly abi: readonly unknown[];
};

/** Call a `view` or `pure` function and return its decoded result. */
export async function readContract<T>(call: ContractCall): Promise<T> {
  const res = await fetch(`${BASE}/execute/contract-call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${readKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contractAddress: call.address,
      chainId: call.chainId,
      functionName: call.functionName,
      functionArgs: JSON.stringify(call.args ?? []),
      abi: JSON.stringify(call.abi),
      simulate: true,
    }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : `KeeperHub returned ${res.status}`;
    throw new KeeperHubError(message, res.status, body?.error as string | undefined);
  }

  // The route returns the decoded value under `result` for read functions.
  return (body?.result ?? body?.data) as T;
}

/** Chains KeeperHub will execute on, with the flags its own docs tell you to check. */
export type Chain = {
  readonly chainId: number;
  readonly name: string;
  readonly explorerUrl: string;
  readonly isTestnet: boolean;
  readonly isEnabled: boolean;
  readonly usePrivateMempoolRpc: boolean;
};

export async function getChain(chainId: number): Promise<Chain | null> {
  const res = await fetch(`${BASE}/chains`, {
    headers: { Authorization: `Bearer ${readKey()}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new KeeperHubError(`KeeperHub returned ${res.status}`, res.status);
  const body = (await res.json()) as { items?: Chain[] } | Chain[];
  const items = Array.isArray(body) ? body : (body.items ?? []);
  return items.find((c) => c.chainId === chainId) ?? null;
}
