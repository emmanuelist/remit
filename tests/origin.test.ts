import { describe, expect, it } from "vitest";
import { COMPOSER } from "@/lib/remit/compose";
import {
  decodeOrigin,
  encodeOrigin,
  IntentTooLong,
  intentBudget,
  ORIGIN_MAX,
} from "@/lib/remit/origin";

const base = { name: "Remit", composer: COMPOSER } as const;

describe("origin envelope", () => {
  it("round-trips an intent", () => {
    const encoded = encodeOrigin({ ...base, intent: "pay the contractor 12.50 USDC" });
    expect(decodeOrigin(encoded)?.intent).toBe("pay the contractor 12.50 USDC");
  });

  it("fits inside the Transaction Service limit at the full budget", () => {
    const intent = "x".repeat(intentBudget(COMPOSER));
    expect(encodeOrigin({ ...base, intent }).length).toBeLessThanOrEqual(ORIGIN_MAX);
  });

  it("refuses an over-long intent rather than trimming it", () => {
    const intent = "x".repeat(intentBudget(COMPOSER) + 1);
    expect(() => encodeOrigin({ ...base, intent })).toThrow(IntentTooLong);
  });
});

describe("origin is untrusted input", () => {
  it("returns null for malformed JSON", () => {
    expect(decodeOrigin("{not json")).toBeNull();
  });

  it("returns null for another app's origin", () => {
    expect(
      decodeOrigin(JSON.stringify({ name: "SomeOtherApp", intent: "hi" })),
    ).toBeNull();
  });

  it("returns null for a Remit envelope with no intent", () => {
    expect(decodeOrigin(JSON.stringify({ name: "Remit" }))).toBeNull();
  });

  it("returns null for absent origin", () => {
    expect(decodeOrigin(null)).toBeNull();
    expect(decodeOrigin(undefined)).toBeNull();
  });
});
