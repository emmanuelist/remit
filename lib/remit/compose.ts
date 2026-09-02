import { encodeFunctionData, getAddress, parseUnits } from "viem";

/**
 * Composing a treasury action.
 *
 * This is the step an agent performs. Today the composer is deterministic — given the
 * same intent it produces the same bytes — and an LLM slots in behind the same interface
 * without anything downstream changing. That ordering is deliberate: the claim Remit makes
 * is about what happens to the bytes *after* they are composed, so the byte-identity path
 * is proven before a probabilistic composer is allowed anywhere near it.
 */

export type Intent = {
  /** What a human asked for, in their words. Travels with the proposal. */
  readonly text: string;
  readonly token: `0x${string}`;
  readonly recipient: `0x${string}`;
  /** Decimal string in major units, e.g. "12.50". Never a float. */
  readonly amount: string;
  readonly decimals: number;
};

export type ComposedCall = {
  readonly to: `0x${string}`;
  readonly value: string;
  readonly data: `0x${string}`;
  readonly operation: 0;
  readonly method: string;
};

const ERC20_TRANSFER = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/** An ERC-20 transfer. `value` is zero: the tokens move, no native value does. */
export function composeTransfer(intent: Intent): ComposedCall {
  return {
    to: getAddress(intent.token),
    value: "0",
    data: encodeFunctionData({
      abi: ERC20_TRANSFER,
      functionName: "transfer",
      args: [getAddress(intent.recipient), parseUnits(intent.amount, intent.decimals)],
    }),
    operation: 0,
    method: "transfer(address,uint256)",
  };
}

/** Identifies the code that produced the bytes. Recorded on every proposal. */
export const COMPOSER = "deterministic/erc20-transfer@1";
