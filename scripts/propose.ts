/**
 * Propose a remit to the Safe, and sign it as one scripted owner.
 *
 * Run:  npx tsx scripts/propose.ts "pay the contractor 12.50 USDC" 12.50
 *
 * Signing keys never leave this machine, which is why this is a script and not a route
 * in the deployed app. A visitor to the live site can read and propose; only whoever
 * holds the owner keys can sign.
 */
import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import { privateKeyToAccount } from "viem/accounts";
import { COMPOSER, composeTransfer } from "../lib/remit/compose";
import { encodeOrigin, intentBudget } from "../lib/remit/origin";

const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function main() {
  const intentText = process.argv[2] ?? "pay the contractor 12.50 USDC";
  process.stdout.write(`intent budget ${intentBudget(COMPOSER)} characters\n`);
  const amount = process.argv[3] ?? "12.50";

  const safeAddress = required("NEXT_PUBLIC_SAFE_ADDRESS");
  const token = required("NEXT_PUBLIC_USDC_ADDRESS") as `0x${string}`;
  const chainId = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");
  const signerKey = required("SAFE_OWNER_B_PRIVATE_KEY") as `0x${string}`;
  const recipient = required("SAFE_OWNER_C_ADDRESS") as `0x${string}`;

  const call = composeTransfer({
    text: intentText,
    token,
    recipient,
    amount,
    decimals: 6,
  });

  const protocolKit = await Safe.init({
    provider: RPC,
    signer: signerKey,
    safeAddress,
  });

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      { to: call.to, value: call.value, data: call.data, operation: call.operation },
    ],
  });

  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const signature = await protocolKit.signHash(safeTxHash);
  const sender = privateKeyToAccount(signerKey).address;

  const api = new SafeApiKit({ chainId, apiKey: required("SAFE_API_KEY") });

  await api.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: sender,
    senderSignature: signature.data,
    origin: encodeOrigin({
      name: "Remit",
      intent: intentText,
      composer: COMPOSER,
    }),
  });

  process.stdout.write(
    [
      `intent      ${intentText}`,
      `to          ${call.to}`,
      `data        ${call.data}`,
      `bytes       ${(call.data.length - 2) / 2}`,
      `safeTxHash  ${safeTxHash}`,
      `signed by   ${sender}`,
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  // The Transaction Service puts the useful part in the body, not the status text.
  const detail =
    error && typeof error === "object" && "body" in error
      ? JSON.stringify((error as { body: unknown }).body)
      : "";
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n${detail}\n${
      error instanceof Error ? (error.stack ?? "") : ""
    }\n`,
  );
  process.exit(1);
});
