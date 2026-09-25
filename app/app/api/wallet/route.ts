import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";
import { readExitTermsCached } from "@/lib/exit-terms.mjs";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/exit-terms.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const j = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));

type ParsedAccount = {
  pubkey: string;
  account: {
    data: {
      parsed?: { info?: Record<string, any> };
      program?: string;
    };
    owner?: string;
  };
};

/**
 * What the connected wallet actually holds.
 *
 * Balances come from the chain, one read per program, and every account is
 * reported with the mint, the program that owns it, its decimals and its raw
 * amount. There is no sample portfolio anywhere in this file: a wallet holding
 * nothing supported gets told exactly that.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") ?? "";
  const validate = url.searchParams.get("validate") !== "0";

  if (!BASE58.test(address)) {
    return NextResponse.json({ error: "address must be a base58 public key" }, { status: 400 });
  }

  // rpc() returns the JSON-RPC envelope, not its `result` — see lib/rpc.ts.
  let lamports: number | null = null;
  let slot: number | null = null;
  let epochInfo: any = null;
  try {
    // getBalance wraps its answer in a context envelope: {context, value}.
    const bal = await rpc<any>("getBalance", [address, { commitment: "confirmed" }]);
    lamports = typeof bal?.result?.value === "number" ? bal.result.value : null;
    const ei = await rpc<any>("getEpochInfo", [{ commitment: "confirmed" }]);
    epochInfo = ei?.result ?? null;
    slot = epochInfo?.absoluteSlot ?? null;
  } catch (e) {
    return NextResponse.json(
      { error: `RPC request failed: ${(e as Error).message}`, stage: "balance" },
      { status: 502 }
    );
  }

  const programs: Array<[string, string]> = [
    ["spl-token", TOKEN_PROGRAM],
    ["token-2022", TOKEN_2022_PROGRAM],
  ];

  const accounts: Array<Record<string, unknown>> = [];
  const programErrors: Record<string, string> = {};

  for (const [label, programId] of programs) {
    try {
      const res = await rpc<any>("getTokenAccountsByOwner", [
        address,
        { programId },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]);
      for (const item of res?.result?.value ?? []) {
        const info = item.account?.data?.parsed?.info ?? {};
        const amount = info.tokenAmount ?? {};
        const extensions = info.extensions ?? [];
        const feeExt = (extensions as any[]).find?.(
          (x) => x?.extension === "transferFeeAmount"
        );
        accounts.push({
          ata: item.pubkey,
          mint: info.mint ?? null,
          program: label,
          program_id: programId,
          owner: info.owner ?? address,
          decimals: amount.decimals ?? null,
          raw_amount: amount.amount ?? null,
          ui_amount: amount.uiAmountString ?? amount.uiAmount ?? null,
          state:
            (extensions as any[]).find?.((x) => x?.extension === "accountState")?.state ?? null,
          withheld_amount: feeExt?.state?.withheldAmount ?? null,
        });
      }
    } catch (e) {
      programErrors[label] = (e as Error).message;
    }
  }

  // Whether each holding can actually be analysed, decided by reading its mint
  // rather than by matching a symbol against a list.
  if (validate) {
    const mints = [...new Set(accounts.map((a) => a.mint).filter(Boolean))].slice(0, 24) as string[];
    const terms = await Promise.all(
      mints.map(async (mint) => {
        try {
          const t = await readExitTermsCached(mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
          const inForce = t.fee_effective ?? t.fee_older ?? null;
          return [
            mint,
            {
              readable: true,
              symbol: t.symbol ?? null,
              name: t.name ?? null,
              is_token_2022: t.is_token_2022 === true,
              decimals: t.decimals ?? null,
              fee_in_force_bps: inForce?.bps ?? null,
              fee_pending_bps: t.fee_pending?.bps ?? null,
              fee_pending_epoch: t.fee_pending?.epoch ?? null,
              paused: t.paused ?? null,
              // The product's premise is a scheduled transfer fee. Anything else
              // is readable but not supported, and says so.
              supported: t.is_token_2022 === true && (t.fee_older != null || t.fee_newer != null),
            },
          ] as const;
        } catch (e) {
          return [mint, { readable: false, error: (e as Error).message, supported: false }] as const;
        }
      })
    );
    const byMint = Object.fromEntries(terms);
    for (const a of accounts) {
      const key = a.mint ? String(a.mint) : "";
      const t = key ? (byMint as Record<string, any>)[key] : null;
      a.asset = t ?? null;
      a.supported = t?.supported === true;
    }
  }

  const supported = accounts.filter((a) => a.supported);
  const unsupported = accounts.filter((a) => !a.supported);

  return new NextResponse(
    j({
      ok: true,
      address,
      sol:
        lamports === null
          ? { lamports: null, sol: null, error: "the balance read returned no number" }
          : { lamports, sol: lamports / 1e9 },
      slot,
      epoch: epochInfo?.epoch ?? null,
      epoch_progress:
        epochInfo && epochInfo.slotsInEpoch
          ? { slot_index: epochInfo.slotIndex, slots_in_epoch: epochInfo.slotsInEpoch }
          : null,
      accounts,
      supported_count: supported.length,
      unsupported_count: unsupported.length,
      empty_reason:
        accounts.length === 0
          ? "this wallet holds no token accounts on either token program"
          : supported.length === 0
            ? "no supported tokenized-equity balances found"
            : null,
      program_errors: programErrors,
      read_at: new Date().toISOString(),
      source: {
        url: RPC_URL,
        host: new URL(RPC_URL).host,
        methods: [
          "getBalance",
          "getTokenAccountsByOwner (spl-token)",
          "getTokenAccountsByOwner (token-2022)",
          "getEpochInfo",
        ],
      },
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
