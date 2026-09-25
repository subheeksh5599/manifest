import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * The tape, as a log rather than a fixture.
 *
 * Two sources, kept apart on purpose:
 *
 *   data/readings.jsonl   appended by the verifier program (scripts/prove_onchain.mjs)
 *   data/tape.jsonl       appended by this endpoint, once per read made at the desk
 *
 * A serverless function cannot write into the deployed bundle, so when the
 * repository directory is not writable the desk's reads go to a temporary file
 * for the life of that instance. The page reports which file each row came from
 * rather than implying the two are the same thing.
 */

const REPO_TAPE = path.join(process.cwd(), "data", "tape.jsonl");
const TMP_TAPE = path.join(process.env.TMPDIR || "/tmp", "manifest-desk-tape.jsonl");
const READINGS = path.join(process.cwd(), "data", "readings.jsonl");

export type TapeRecord = {
  ts: number;
  symbol: string | null;
  mint: string;
  slot: number;
  epoch: number | null;
  source: string;
  fee_in_force_bps: number | null;
  fee_pending_bps: number | null;
  fee_pending_epoch: number | null;
  withheld_amount: string | null;
};

function readJsonl(file: string, origin: string): (TapeRecord & { origin: string })[] {
  try {
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return { ...(JSON.parse(l) as TapeRecord), origin };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as (TapeRecord & { origin: string })[];
  } catch {
    return [];
  }
}

function writable(): string {
  try {
    fs.mkdirSync(path.dirname(REPO_TAPE), { recursive: true });
    fs.accessSync(path.dirname(REPO_TAPE), fs.constants.W_OK);
    return REPO_TAPE;
  } catch {
    return TMP_TAPE;
  }
}

export async function GET() {
  const merged = [...readJsonl(READINGS, "the verifier"), ...readJsonl(writable(), "this desk")]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 200);
  return NextResponse.json(
    { records: merged, count: merged.length, desk_file: writable() },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: Request) {
  let body: Partial<TapeRecord>;
  try {
    body = (await req.json()) as Partial<TapeRecord>;
  } catch {
    return NextResponse.json({ error: "body must be json" }, { status: 400 });
  }
  if (!body.mint || typeof body.mint !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.mint)) {
    return NextResponse.json({ error: "mint must be a base58 address" }, { status: 400 });
  }

  const record: TapeRecord = {
    ts: typeof body.ts === "number" ? body.ts : Math.floor(Date.now() / 1000),
    symbol: body.symbol ?? null,
    mint: body.mint,
    slot: typeof body.slot === "number" ? body.slot : 0,
    epoch: typeof body.epoch === "number" ? body.epoch : null,
    source: typeof body.source === "string" ? body.source : "desk_read",
    fee_in_force_bps: body.fee_in_force_bps ?? null,
    fee_pending_bps: body.fee_pending_bps ?? null,
    fee_pending_epoch: body.fee_pending_epoch ?? null,
    withheld_amount: body.withheld_amount ?? null,
  };

  const file = writable();
  try {
    // One line, one read. Appending never rewrites what is already there.
    fs.appendFileSync(file, JSON.stringify(record) + "\n", "utf8");
  } catch (e) {
    return NextResponse.json({ error: `could not append: ${(e as Error).message}` }, { status: 500 });
  }

  return NextResponse.json(
    { appended: true, file, record },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}
