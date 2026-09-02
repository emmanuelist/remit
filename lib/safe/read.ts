import "server-only";
import { formatDisplay } from "@/lib/format";
import { readContract } from "@/lib/keeperhub/client";
import { ERC20_ABI, SAFE_ABI } from "@/lib/safe/abi";

/** The Safe's on-chain state, every field read through KeeperHub. */
export type SafeState = {
  readonly address: string;
  readonly chainId: number;
  readonly version: string;
  readonly owners: readonly string[];
  readonly threshold: number;
  readonly nonce: number;
};

export type TokenBalance = {
  readonly address: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly raw: string;
  readonly formatted: string;
};

export async function readSafeState(
  address: string,
  chainId: number,
): Promise<SafeState> {
  const call = <T>(functionName: string) =>
    readContract<T>({ address, chainId, functionName, abi: SAFE_ABI });

  // One round trip each; KeeperHub allows 60/min and this is four.
  const [version, owners, threshold, nonce] = await Promise.all([
    call<string>("VERSION"),
    call<string[]>("getOwners"),
    call<string>("getThreshold"),
    call<string>("nonce"),
  ]);

  return {
    address,
    chainId,
    version,
    owners,
    threshold: Number(threshold),
    nonce: Number(nonce),
  };
}

export async function readTokenBalance(
  token: string,
  holder: string,
  chainId: number,
): Promise<TokenBalance> {
  const call = <T>(functionName: string, args?: readonly unknown[]) =>
    readContract<T>({ address: token, chainId, functionName, args, abi: ERC20_ABI });

  const [symbol, decimals, raw] = await Promise.all([
    call<string>("symbol"),
    call<string | number>("decimals"),
    call<string>("balanceOf", [holder]),
  ]);

  return {
    address: token,
    symbol,
    decimals: Number(decimals),
    raw: String(raw),
    formatted: formatDisplay(String(raw), Number(decimals)),
  };
}
