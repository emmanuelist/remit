import "server-only";

/**
 * Safe Transaction Service.
 *
 * This is the queue the Safe's real owners see in Safe{Wallet}. Remit proposes into it
 * and reads confirmations back out of it; it is the authority on who has signed what,
 * and Remit never keeps its own count.
 */

const HOSTS: Record<number, string> = {
  // The chain-prefixed path segment, per EIP-3770. The old per-chain hosts 308-redirect.
  11155111: "https://api.safe.global/tx-service/sep/api/v1",
};

export class SafeServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SafeServiceError";
  }
}

function apiKey(): string {
  const key = process.env.SAFE_API_KEY?.trim();
  if (!key) throw new SafeServiceError("SAFE_API_KEY is not set", 0);
  return key;
}

function base(chainId: number): string {
  const host = HOSTS[chainId];
  if (!host)
    throw new SafeServiceError(`No Transaction Service host for chain ${chainId}`, 0);
  return host;
}

export type Confirmation = {
  readonly owner: string;
  readonly submissionDate: string;
  readonly signature: string | null;
};

/** One entry in the Safe's signing queue, as the Transaction Service reports it. */
export type MultisigTransaction = {
  readonly safeTxHash: string;
  readonly to: string;
  readonly value: string;
  readonly data: string | null;
  readonly operation: number;
  readonly nonce: number;
  readonly submissionDate: string;
  readonly isExecuted: boolean;
  readonly isSuccessful: boolean | null;
  readonly transactionHash: string | null;
  readonly confirmationsRequired: number;
  readonly confirmations: readonly Confirmation[];
  readonly dataDecoded: { readonly method: string } | null;
};

async function get<T>(chainId: number, path: string): Promise<T> {
  const res = await fetch(`${base(chainId)}${path}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SafeServiceError(
      `Safe Transaction Service returned ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** Transactions proposed but not yet executed — the queue the owners are looking at. */
export async function pendingTransactions(
  safe: string,
  chainId: number,
): Promise<readonly MultisigTransaction[]> {
  const page = await get<{ results: MultisigTransaction[] }>(
    chainId,
    `/safes/${safe}/multisig-transactions/?executed=false&limit=20`,
  );
  return page.results;
}

/** Everything the Safe has ever been asked to do, newest first. */
export async function allTransactions(
  safe: string,
  chainId: number,
): Promise<readonly MultisigTransaction[]> {
  const page = await get<{ results: MultisigTransaction[] }>(
    chainId,
    `/safes/${safe}/multisig-transactions/?limit=20`,
  );
  return page.results;
}
