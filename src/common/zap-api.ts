/**
 * Browser-only invoice request policy. No LNbits credential belongs in the UI.
 * The API origin is configured at build time, not inferred from an arbitrary
 * browser location or silently redirected to the visitor's localhost.
 */
export const DEFAULT_MAX_INVOICE_SATS = 100000;

export function parseMaxSats(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return DEFAULT_MAX_INVOICE_SATS;
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const max = Number(raw);
  return Number.isSafeInteger(max) ? max : null;
}

export function resolveZapEndpoint(
  rawOrigin: string | undefined,
  allowLocalHttp = false
): string | null {
  if (!rawOrigin || rawOrigin.trim() !== rawOrigin) return null;
  try {
    const url = new URL(rawOrigin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" &&
        !(allowLocalHttp && url.protocol === "http:" && local)) return null;
    if (url.username || url.password || url.search || url.hash ||
        url.pathname !== "/") return null;
    return url.origin + "/zap";
  } catch (_) {
    return null;
  }
}

export function validateInvoice(
  amountText: string,
  memo: string,
  maximum: number
): { amount: number; memo: string } | null {
  if (!/^[1-9][0-9]*$/.test(amountText)) return null;
  const amount = Number(amountText);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > maximum) return null;
  if (typeof memo !== "string" || new TextEncoder().encode(memo).length > 200 ||
      Array.from(memo).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  return { amount, memo };
}

export async function requestInvoice(
  endpoint: string,
  amountText: string,
  memo: string,
  maxSats: number,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const payload = validateInvoice(amountText, memo, maxSats);
  if (!payload) throw new Error("Enter a valid whole-satoshi amount and a memo of at most 200 bytes.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (_) {
    throw new Error("Unable to contact the invoice service. Try again later.");
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 429) throw new Error("Too many requests. Try again later.");
  if (response.status === 503) throw new Error("Invoice service is busy. Try again later.");
  if (!response.ok) throw new Error("Unable to create an invoice. Try again later.");

  let data: unknown;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error("Invoice service returned an invalid response.");
  }
  if (typeof data !== "object" || data === null ||
      !("payment_hash" in data) ||
      typeof data.payment_hash !== "string" ||
      !/^[a-fA-F0-9]{64}$/.test(data.payment_hash)) {
    throw new Error("Invoice service returned an invalid response.");
  }
  return data.payment_hash;
}

/** Read-only history endpoint on the same explicitly trusted backend origin. */
export function resolveHistoryEndpoint(
  rawOrigin: string | undefined,
  allowLocalHttp = false
): string | null {
  const zapEndpoint = resolveZapEndpoint(rawOrigin, allowLocalHttp);
  return zapEndpoint === null ? null : zapEndpoint.slice(0, -3) + "history";
}
