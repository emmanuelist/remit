/**
 * Money formatting. Pure, no I/O, no `server-only` — so it is directly testable,
 * which for the code that renders a treasury balance is the point.
 *
 * Everything here takes minor units as a string and returns a string. No value
 * passes through `number`: a uint256 balance does not survive a float.
 */

/** Minor units to an exact decimal string. Loses nothing. */
export function formatUnits(raw: string, decimals: number): string {
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals === 0 ? "" : digits.slice(digits.length - decimals);
  const trimmed = fraction.replace(/0+$/, "");
  const body = trimmed ? `${whole}.${trimmed}` : whole;
  return negative ? `-${body}` : body;
}

/**
 * Minor units at a fixed number of decimal places, for display.
 *
 * A treasury balance reads "20.00", never "20" — trailing zeros in money are
 * information. Thousands are grouped. The fraction is **truncated, not rounded**,
 * so a displayed balance is never larger than the balance actually held.
 */
export function formatDisplay(raw: string, decimals: number, places = 2): string {
  const exact = formatUnits(raw, decimals);
  const [whole = "0", fraction = ""] = exact.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return places === 0
    ? grouped
    : `${grouped}.${fraction.padEnd(places, "0").slice(0, places)}`;
}
