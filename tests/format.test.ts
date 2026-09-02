import { describe, expect, it } from "vitest";
import { formatDisplay, formatUnits } from "@/lib/format";

describe("formatUnits — exact value, no floats", () => {
  it("converts minor units without losing precision", () => {
    expect(formatUnits("20000000", 6)).toBe("20");
    expect(formatUnits("12500000", 6)).toBe("12.5");
    expect(formatUnits("1", 6)).toBe("0.000001");
  });

  it("survives values beyond Number.MAX_SAFE_INTEGER", () => {
    // 10^24 wei = 1,000,000 ETH. Any float path mangles this.
    expect(formatUnits("1000000000000000000000000", 18)).toBe("1000000");
  });

  it("handles zero decimals and zero balance", () => {
    expect(formatUnits("42", 0)).toBe("42");
    expect(formatUnits("0", 6)).toBe("0");
  });
});

describe("formatDisplay — what a treasury balance reads as", () => {
  it("keeps trailing zeros, because they are information in money", () => {
    expect(formatDisplay("20000000", 6)).toBe("20.00");
    expect(formatDisplay("0", 6)).toBe("0.00");
  });

  it("groups thousands", () => {
    expect(formatDisplay("1234567890", 6)).toBe("1,234.56");
    expect(formatDisplay("1000000000000", 6)).toBe("1,000,000.00");
  });

  it("truncates rather than rounds, so a balance is never overstated", () => {
    expect(formatDisplay("12999999", 6)).toBe("12.99");
  });

  it("shows dust below the displayed precision as 0.00, not as nothing", () => {
    expect(formatDisplay("1", 6)).toBe("0.00");
    expect(formatUnits("1", 6)).toBe("0.000001");
  });
});
