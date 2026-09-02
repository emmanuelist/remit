import type { MultisigTransaction } from "@/lib/safe/service";

/** The `execTransaction` fragment. Declared, never fetched from an explorer. */
export const EXEC_ABI = [
  {
    type: "function",
    name: "execTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * Concatenate owner signatures in the order the Safe contract requires.
 *
 * `checkNSignatures` walks the blob expecting owners in **ascending address order**; out of
 * order and a valid set of signatures is rejected as invalid. Sorting is not cosmetic.
 */
export function packSignatures(
  confirmations: readonly { owner: string; signature: string | null }[],
): `0x${string}` {
  const ordered = [...confirmations]
    .filter((c): c is { owner: string; signature: string } => Boolean(c.signature))
    .sort((a, b) => (a.owner.toLowerCase() < b.owner.toLowerCase() ? -1 : 1));

  return `0x${ordered.map((c) => c.signature.replace(/^0x/, "")).join("")}`;
}

/** The ten arguments `execTransaction` takes, in order, as KeeperHub wants them. */
export function execArgs(tx: MultisigTransaction): readonly unknown[] {
  return [
    tx.to,
    tx.value,
    tx.data ?? "0x",
    tx.operation,
    (tx as { safeTxGas?: string }).safeTxGas ?? "0",
    (tx as { baseGas?: string }).baseGas ?? "0",
    (tx as { gasPrice?: string }).gasPrice ?? "0",
    (tx as { gasToken?: string }).gasToken ?? ZERO,
    (tx as { refundReceiver?: string }).refundReceiver ?? ZERO,
    packSignatures(tx.confirmations),
  ];
}
