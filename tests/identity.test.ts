import { encodeEventTopics, pad, toHex } from "viem";
import { describe, expect, it } from "vitest";
import { attestation, type MinimalLog, SAFE_EXEC_EVENTS } from "@/lib/identity";

const SAFE = "0xA4A12cCA345853A041C423fcA45Eb991B0FbAD11" as const;
const IMPOSTOR = "0x000000000000000000000000000000000000dEaD";
const SIGNED =
  "0x4d324cd7e6fe87e640c7bb241e6bb3b91651ae0f450001f6346e2da0a2bb1ccb" as `0x${string}`;
const OTHER =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`;

function log(
  address: string,
  eventName: "ExecutionSuccess" | "ExecutionFailure",
  txHash: `0x${string}`,
): MinimalLog {
  return {
    address,
    // encodeEventTopics types its result for filters, where a wildcard topic may be null.
    // A real receipt log never carries one, so narrow to what the chain actually returns.
    topics: encodeEventTopics({
      abi: SAFE_EXEC_EVENTS,
      eventName,
      args: { txHash },
    }).filter((t): t is `0x${string}` => typeof t === "string"),
    data: pad(toHex(0n), { size: 32 }),
  };
}

describe("attestation", () => {
  it("is identical when the Safe reports success for the signed hash", () => {
    const v = attestation([log(SAFE, "ExecutionSuccess", SIGNED)], SAFE, SIGNED);
    expect(v.kind).toBe("identical");
  });

  it("matches regardless of address casing", () => {
    const v = attestation(
      [log(SAFE.toLowerCase(), "ExecutionSuccess", SIGNED)],
      SAFE,
      SIGNED,
    );
    expect(v.kind).toBe("identical");
  });

  it("is reverted when the Safe reports failure for the signed hash", () => {
    const v = attestation([log(SAFE, "ExecutionFailure", SIGNED)], SAFE, SIGNED);
    expect(v.kind).toBe("reverted");
  });

  it("is a mismatch when the Safe executed some other transaction", () => {
    const v = attestation([log(SAFE, "ExecutionSuccess", OTHER)], SAFE, SIGNED);
    expect(v.kind).toBe("mismatch");
    if (v.kind === "mismatch") expect(v.attested).toEqual([OTHER.toLowerCase()]);
  });

  it("is absent when no Safe execution event is present", () => {
    expect(attestation([], SAFE, SIGNED).kind).toBe("absent");
  });

  it("ignores an identical event emitted by any other contract", () => {
    // A contract that is not the Safe can emit this event with any hash it likes.
    // Only the Safe's own log may attest on the Safe's behalf.
    const v = attestation([log(IMPOSTOR, "ExecutionSuccess", SIGNED)], SAFE, SIGNED);
    expect(v.kind).toBe("absent");
  });

  it("finds the Safe's event among unrelated logs", () => {
    const noise: MinimalLog = { address: IMPOSTOR, topics: ["0xdeadbeef"], data: "0x" };
    const v = attestation(
      [
        noise,
        log(IMPOSTOR, "ExecutionSuccess", OTHER),
        log(SAFE, "ExecutionSuccess", SIGNED),
      ],
      SAFE,
      SIGNED,
    );
    expect(v.kind).toBe("identical");
  });
});
