import { NextResponse } from "next/server";
import { evaluate, type Plan } from "@/lib/preflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const plan = (await req.json()) as Plan;
    const result = await evaluate(plan);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
