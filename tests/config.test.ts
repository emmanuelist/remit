import { afterEach, describe, expect, it } from "vitest";
import { serviceStatuses, watchedSafe } from "@/lib/config";

const KEYS = [
  "SAFE_API_KEY",
  "NEXT_PUBLIC_SAFE_ADDRESS",
  "NEXT_PUBLIC_CHAIN_ID",
] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("environment presence", () => {
  it("treats an empty value as unset, not as a configured empty string", () => {
    process.env.SAFE_API_KEY = "";
    const safe = serviceStatuses().find((s) => s.name === "safe");
    expect(safe?.configured).toBe(false);
  });

  it("treats a whitespace-only value as unset", () => {
    process.env.NEXT_PUBLIC_SAFE_ADDRESS = "   ";
    expect(watchedSafe().address).toBeNull();
  });

  it("falls back to Sepolia when the chain id is present but empty", () => {
    process.env.NEXT_PUBLIC_CHAIN_ID = "";
    expect(watchedSafe().chainId).toBe(11155111);
  });

  it("reports a real value as configured", () => {
    process.env.SAFE_API_KEY = "a-value-that-is-present";
    const safe = serviceStatuses().find((s) => s.name === "safe");
    expect(safe?.configured).toBe(true);
  });
});
