/**
 * Add a confirmation from a scripted owner.
 *
 * Run:  npx tsx scripts/confirm.ts <safeTxHash> [C|B]
 *
 * This is what the demo does instead of driving a browser wallet: the signature is real,
 * produced by a real owner key, and lands in the same Transaction Service queue the Safe's
 * owners see. Only the input device differs.
 */
import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function main() {
  const safeTxHash = process.argv[2];
  if (!safeTxHash?.startsWith("0x")) {
    throw new Error("Usage: tsx scripts/confirm.ts <safeTxHash> [C|B]");
  }
  const which = (process.argv[3] ?? "C").toUpperCase();
  const signerKey = required(`SAFE_OWNER_${which}_PRIVATE_KEY`) as `0x${string}`;

  const protocolKit = await Safe.init({
    provider: RPC,
    signer: signerKey,
    safeAddress: required("NEXT_PUBLIC_SAFE_ADDRESS"),
  });

  const signature = await protocolKit.signHash(safeTxHash);
  const api = new SafeApiKit({
    chainId: BigInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111"),
    apiKey: required("SAFE_API_KEY"),
  });

  await api.confirmTransaction(safeTxHash, signature.data);

  const tx = await api.getTransaction(safeTxHash);
  process.stdout.write(
    [
      `signed by     ${privateKeyToAccount(signerKey).address} (owner ${which})`,
      `safeTxHash    ${safeTxHash}`,
      `confirmations ${tx.confirmations?.length ?? 0} of ${tx.confirmationsRequired}`,
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
