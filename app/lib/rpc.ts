// Server-side RPC helper. Always sends a browser UA (public mainnet RPC 403s without one).

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function endpoints(): string[] {
  const p = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  const f = process.env.RPC_URL_FALLBACK;
  const out = [p];
  if (f && f !== p) out.push(f);
  return out;
}

export async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": process.env.RPC_USER_AGENT || DEFAULT_UA,
  };
  const retries = Number(process.env.RPC_RETRIES || 4);
  let last: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const url of endpoints()) {
      try {
        const r = await fetch(url, { method: "POST", headers, body, cache: "no-store" });
        if (!r.ok) {
          last = new Error(`rpc ${r.status} on ${method}`);
          // The public endpoints rate limit aggressively when several mints are
          // read at once. Backing off and retrying is cheaper than showing a
          // board with holes in it.
          if (r.status === 429 || r.status >= 500) continue;
          continue;
        }
        const json = (await r.json()) as { result?: T; error?: { message?: string } };
        if (json.error) {
          last = new Error(`rpc error on ${method}: ${json.error.message ?? "unknown"}`);
          continue;
        }
        return json as T;
      } catch (e) {
        last = e;
      }
    }
    if (attempt < retries - 1) {
      const wait = 200 * 2 ** attempt + Math.floor(Math.random() * 150);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  throw last ?? new Error("rpc failed");
}

/** Run async work with a ceiling on how much is in flight, so a burst of
 *  reads does not trip the public endpoint's rate limit. */
export async function mapLimit<A, B>(
  items: A[],
  limit: number,
  fn: (item: A) => Promise<B>,
): Promise<B[]> {
  const out = new Array<B>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export type MintCard = {
  mint: string;
  slot: number;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  supply: string | null;
  multiplier: string | null;
  next_multiplier: string | null;
  effective_timestamp: number | null;
  paused: boolean | null;
  permanent_delegate: string | null;
  transfer_hook_program: string | null;
  transfer_hook_authority: string | null;
};

export async function truthCard(mint: string): Promise<MintCard> {
  const resp = await rpc<any>("getAccountInfo", [
    mint,
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  const val = resp?.result?.value;
  if (!val) throw new Error(`mint not found: ${mint}`);
  const info = val.data?.parsed?.info ?? {};
  const exts: Record<string, any> = {};
  for (const e of info.extensions ?? []) exts[e.extension] = e.state ?? {};
  return {
    mint,
    slot: resp.result.context.slot,
    symbol: exts.tokenMetadata?.symbol ?? null,
    name: exts.tokenMetadata?.name ?? null,
    decimals: info.decimals ?? null,
    supply: info.supply ?? null,
    multiplier: exts.scaledUiAmountConfig?.multiplier ?? null,
    next_multiplier: exts.scaledUiAmountConfig?.newMultiplier ?? null,
    effective_timestamp: exts.scaledUiAmountConfig?.newMultiplierEffectiveTimestamp ?? null,
    paused: exts.pausableConfig?.paused ?? null,
    permanent_delegate: exts.permanentDelegate?.delegate ?? null,
    transfer_hook_program: exts.transferHook?.programId ?? null,
    transfer_hook_authority: exts.transferHook?.authority ?? null,
  };
}
