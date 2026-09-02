import { decodeEventLog, parseAbi } from "viem";

/**
 * The claim, made checkable.
 *
 * The naive check — decode the executed transaction's calldata and compare it to what was
 * signed — does not survive contact with reality. KeeperHub broadcasts through a relayer
 * contract, so the top-level input is the relayer's calldata and `execTransaction` never
 * appears at the top level.
 *
 * The Safe answers this itself. On success it emits
 *
 *     ExecutionSuccess(bytes32 indexed txHash, uint256 payment)
 *
 * where `txHash` is the EIP-712 safeTxHash — a commitment to `to`, `value`, `data`,
 * `operation`, the gas fields, and the nonce. If the Safe emits that event for the hash the
 * owners signed, then by construction the call it executed was byte-identical to the call
 * they approved. The chain attests it; Remit only reads the attestation.
 *
 * That is a stronger proof than our own byte comparison, because it does not depend on us
 * decoding anything correctly, and it holds no matter how many relayers sit in front.
 */

export const SAFE_EXEC_EVENTS = parseAbi([
  "event ExecutionSuccess(bytes32 indexed txHash, uint256 payment)",
  "event ExecutionFailure(bytes32 indexed txHash, uint256 payment)",
]);

export type Attestation =
  | { readonly kind: "identical"; readonly safeTxHash: string; readonly payment: string }
  | { readonly kind: "reverted"; readonly safeTxHash: string }
  | {
      readonly kind: "mismatch";
      readonly signed: string;
      readonly attested: readonly string[];
    }
  | { readonly kind: "absent"; readonly reason: string };

/** The only three fields needed. A viem receipt log satisfies this, and so does a
 *  hand-built fixture, which keeps the test for the product's central claim readable. */
export type MinimalLog = {
  readonly address: string;
  readonly topics: readonly string[];
  readonly data: string;
};

/**
 * Read the Safe's own verdict out of a transaction receipt.
 *
 * Only logs emitted by the Safe are considered. Anything else in the receipt was emitted by
 * a different contract and cannot attest on the Safe's behalf.
 */
export function attestation(
  logs: readonly MinimalLog[],
  safeAddress: string,
  signedSafeTxHash: string,
): Attestation {
  const safe = safeAddress.toLowerCase();
  const signed = signedSafeTxHash.toLowerCase();
  const attested: string[] = [];

  for (const log of logs) {
    if (log.address.toLowerCase() !== safe) continue;
    let decoded: { eventName: string; args: Record<string, unknown> };
    try {
      decoded = decodeEventLog({
        abi: SAFE_EXEC_EVENTS,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        data: log.data as `0x${string}`,
      }) as { eventName: string; args: Record<string, unknown> };
    } catch {
      continue; // some other Safe event, e.g. SafeMultiSigTransaction
    }

    const hash = String(decoded.args.txHash).toLowerCase();
    attested.push(hash);
    if (hash !== signed) continue;

    return decoded.eventName === "ExecutionSuccess"
      ? {
          kind: "identical",
          safeTxHash: signed,
          payment: String(decoded.args.payment ?? "0"),
        }
      : { kind: "reverted", safeTxHash: signed };
  }

  if (attested.length > 0) {
    return { kind: "mismatch", signed, attested };
  }
  return {
    kind: "absent",
    reason:
      "The receipt carries no ExecutionSuccess or ExecutionFailure from this Safe, so the " +
      "chain has not attested that this transaction executed the signed call.",
  };
}
