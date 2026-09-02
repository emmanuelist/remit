/**
 * The Safe Transaction Service carries an `origin` string on every proposal. Remit puts
 * the human intent there rather than in a database of its own.
 *
 * That is deliberate: the intent then lives in the same record the owners are signing,
 * travels to Safe{Wallet}, and survives without Remit being up. A separate store would
 * let our copy of the intent drift from the proposal it describes.
 *
 * The cost is a hard ceiling. `origin` is capped at 200 characters — measured, not
 * guessed: a 212-character envelope is rejected with 422, a 188-character one is
 * accepted. The envelope is kept minimal so as much of that budget as possible belongs
 * to the intent, and an intent that does not fit is **refused, never trimmed**. A product
 * whose claim is fidelity does not quietly shorten what a person said.
 */

export const ORIGIN_MAX = 200;

export type RemitOrigin = {
  readonly name: "Remit";
  /** What a human asked for. */
  readonly intent: string;
  /** Which composer produced the bytes, so the record says who to hold responsible. */
  readonly composer: string;
};

export class IntentTooLong extends Error {
  constructor(
    readonly length: number,
    readonly budget: number,
  ) {
    super(
      `Intent does not fit the Safe Transaction Service origin field: the envelope is ` +
        `${length} characters against a ${ORIGIN_MAX} limit, leaving ${budget} for the ` +
        `intent. Shorten it, or persist intents in a store of our own.`,
    );
    this.name = "IntentTooLong";
  }
}

export function encodeOrigin(o: RemitOrigin): string {
  const encoded = JSON.stringify(o);
  if (encoded.length > ORIGIN_MAX) {
    const overhead = JSON.stringify({ ...o, intent: "" }).length;
    throw new IntentTooLong(encoded.length, ORIGIN_MAX - overhead);
  }
  return encoded;
}

/** How many characters of intent will fit alongside a given composer name. */
export function intentBudget(composer: string): number {
  return ORIGIN_MAX - JSON.stringify({ name: "Remit", intent: "", composer }).length;
}

/** Origin is written by whoever proposed, so treat it as untrusted text. */
export function decodeOrigin(raw: string | null | undefined): RemitOrigin | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RemitOrigin>;
    if (parsed?.name !== "Remit" || typeof parsed.intent !== "string") return null;
    return {
      name: "Remit",
      intent: parsed.intent,
      composer: typeof parsed.composer === "string" ? parsed.composer : "unknown",
    };
  } catch {
    return null;
  }
}
