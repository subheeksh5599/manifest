import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = path.join(process.cwd(), "data", "tape.jsonl");
  if (!fs.existsSync(p)) return NextResponse.json({ records: [] });
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(Boolean);
  const records = lines.map((l) => JSON.parse(l));
  return NextResponse.json({ records });
}
