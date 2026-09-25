// One devnet call, with the retry behaviour the mainnet helper already has, plus
// the epoch on a short clock.
//
// The routes that read the replica talk to the public devnet endpoint directly.
// It rate limits in bursts, and a single 429 used to travel all the way out as a
// 502 in front of whoever opened the page. Retrying costs a fraction of a second;
// a failed read costs the number.

const DEVNET_RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";

const USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let id = 0;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const rateLimited = (text: string) => /429|too many requests|rate limit/i.test(text);

export async function devnetRpc<T = any>(method: string, params: unknown[] = []): Promise<T> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params });
  const headers = { "content-type": "application/json", "user-agent": USER_AGENT };
  const attempts = Number(process.env.RPC_RETRIES || 4);
  let last: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const r = await fetch(DEVNET_RPC, { method: "POST", headers, body, cache: "no-store" });
      const text = await r.text();
      if (!r.ok) {
        last = new Error(`${method} returned ${r.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
        if (r.status === 429 || r.status >= 500) {
          await sleep(150 * 2 ** attempt + Math.floor(Math.random() * 120));
          continue;
        }
        throw last;
      }
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        last = new Error(`${method} returned something that is not JSON`);
        await sleep(150 * 2 ** attempt + Math.floor(Math.random() * 120));
        continue;
      }
      if (json?.error) {
        const message = String(json.error.message ?? "unknown");
        last = new Error(`${method}: ${message}`);
        // Providers also return their throttling as a JSON-RPC error, so the
        // message decides whether this is worth another attempt. A missing
        // account is not.
        if (rateLimited(message)) {
          await sleep(150 * 2 ** attempt + Math.floor(Math.random() * 120));
          continue;
        }
        throw last;
      }
      return json.result as T;
    } catch (e) {
      last = e;
      if (attempt === attempts - 1) break;
    }
  }
  throw last ?? new Error(`${method} failed`);
}

/**
 * The epoch, remembered for less than a minute.
 *
 * This is the one value in these routes that does not move with the request: an
 * epoch lasts about two days, and it is what picks which fee schedule is in
 * force. Remembering it briefly keeps a burst of reads from spending a call each
 * on the same answer. If the endpoint refuses, a value read minutes ago still
 * names the same schedule, so the read is answered from that rather than failed.
 */
let epochCache: { epoch: number | null; at: number } = { epoch: null, at: 0 };

const EPOCH_TTL_MS = Number(process.env.EPOCH_TTL_MS || 45_000);
const EPOCH_STALE_MS = Number(process.env.EPOCH_STALE_MS || 10 * 60_000);

export async function devnetEpoch(): Promise<number | null> {
  const now = Date.now();
  if (epochCache.epoch !== null && now - epochCache.at < EPOCH_TTL_MS) return epochCache.epoch;
  try {
    const info = await devnetRpc<{ epoch?: number }>("getEpochInfo", [{ commitment: "confirmed" }]);
    epochCache = { epoch: info?.epoch ?? null, at: now };
    return epochCache.epoch;
  } catch (e) {
    if (epochCache.epoch !== null && now - epochCache.at < EPOCH_STALE_MS) return epochCache.epoch;
    throw e;
  }
}
