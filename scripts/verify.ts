/** Verify a remit: does the chain attest that the signed call is the one that executed? */
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { attestation } from "../lib/identity";

const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

async function main() {
  const safeTxHash = process.argv[2];
  const txHash = process.argv[3] as `0x${string}`;
  if (!safeTxHash || !txHash)
    throw new Error("Usage: tsx scripts/verify.ts <safeTxHash> <txHash>");

  const safeAddress = process.env.NEXT_PUBLIC_SAFE_ADDRESS ?? "";

  const res = await fetch(
    `https://api.safe.global/tx-service/sep/api/v1/multisig-transactions/${safeTxHash}/`,
    { headers: { Authorization: `Bearer ${process.env.SAFE_API_KEY ?? ""}` } },
  );
  const signed = (await res.json()) as { to: string; data: string };

  const client = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const tx = await client.getTransaction({ hash: txHash });
  const receipt = await client.getTransactionReceipt({ hash: txHash });

  const verdict = attestation(receipt.logs, safeAddress, safeTxHash);

  const lines = [
    `signed        ${safeTxHash}`,
    `  to          ${signed.to}`,
    `  data        ${signed.data}`,
    "",
    `executed      ${txHash}`,
    `  broadcaster ${tx.from}`,
    `  entrypoint  ${tx.to}   ${tx.to?.toLowerCase() === safeAddress.toLowerCase() ? "(the Safe)" : "(a relayer, not the Safe)"}`,
    `  receipt     ${receipt.status}, gas ${receipt.gasUsed}`,
    "",
    `verdict       ${verdict.kind.toUpperCase()}`,
  ];
  if (verdict.kind === "identical") {
    lines.push(
      "              the Safe emitted ExecutionSuccess for the hash the owners signed",
    );
    lines.push("              signed bytes ≡ executed bytes, attested on chain");
  }
  if (verdict.kind === "mismatch")
    lines.push(`              chain attested ${verdict.attested.join(", ")}`);
  if (verdict.kind === "absent") lines.push(`              ${verdict.reason}`);

  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
