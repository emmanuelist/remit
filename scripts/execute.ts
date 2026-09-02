/**
 * Dry run, then execute, a threshold-met remit through KeeperHub.
 *
 * Run:  npx tsx scripts/execute.ts <safeTxHash> [--broadcast]
 *
 * The dry run uses the read-scoped key, which cannot broadcast: if the route ignored the
 * simulate flag (KeeperHub issues #1959 / #1929), the request would be refused rather than
 * sending a transaction. Broadcasting needs --broadcast and the write key, deliberately.
 */
import { EXEC_ABI, execArgs } from "../lib/safe/exec";

const BASE = "https://app.keeperhub.com/api";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

type Result = Record<string, unknown>;

async function contractCall(
  key: string,
  body: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<{ status: number; body: Result }> {
  const res = await fetch(`${BASE}/execute/contract-call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Result };
}

async function main() {
  const safeTxHash = process.argv[2];
  if (!safeTxHash?.startsWith("0x"))
    throw new Error("Usage: tsx scripts/execute.ts <safeTxHash> [--broadcast]");
  const broadcast = process.argv.includes("--broadcast");

  const safeAddress = required("NEXT_PUBLIC_SAFE_ADDRESS");
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

  const txRes = await fetch(
    `https://api.safe.global/tx-service/sep/api/v1/multisig-transactions/${safeTxHash}/`,
    { headers: { Authorization: `Bearer ${required("SAFE_API_KEY")}` } },
  );
  if (!txRes.ok) throw new Error(`Transaction Service returned ${txRes.status}`);
  const tx = (await txRes.json()) as Parameters<typeof execArgs>[0];

  const signed = tx.confirmations.length;
  if (signed < tx.confirmationsRequired) {
    throw new Error(
      `Only ${signed} of ${tx.confirmationsRequired} signatures — not executable yet.`,
    );
  }

  const args = execArgs(tx);
  const payload = {
    contractAddress: safeAddress,
    chainId,
    functionName: "execTransaction",
    functionArgs: JSON.stringify(args),
    abi: JSON.stringify(EXEC_ABI),
  };

  process.stdout.write(`signatures  ${signed} of ${tx.confirmationsRequired}\n`);
  process.stdout.write(
    `inner call  ${tx.to} · ${(tx.data ?? "0x").length / 2 - 1} bytes\n\n`,
  );

  const dry = await contractCall(required("KEEPERHUB_API_KEY_READ"), {
    ...payload,
    simulate: true,
  });
  process.stdout.write(
    `dry run     HTTP ${dry.status}\n${JSON.stringify(dry.body).slice(0, 400)}\n\n`,
  );

  if (!broadcast) {
    process.stdout.write("not broadcast. pass --broadcast to send it.\n");
    return;
  }
  if (dry.status !== 200)
    throw new Error("Dry run did not succeed; refusing to broadcast.");

  // The key identifies the work, not the attempt, so a retry sends the same one.
  const live = await contractCall(
    required("KEEPERHUB_API_KEY_WRITE"),
    payload,
    `remit-exec-${safeTxHash}`,
  );
  process.stdout.write(
    `broadcast   HTTP ${live.status}\n${JSON.stringify(live.body, null, 2)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
