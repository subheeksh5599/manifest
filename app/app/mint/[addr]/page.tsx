import { truthCard } from "@/lib/rpc";

export const dynamic = "force-dynamic";

export default async function MintPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  let card: Awaited<ReturnType<typeof truthCard>> | null = null;
  let err: string | null = null;
  try {
    card = await truthCard(addr);
  } catch (e) {
    err = (e as Error).message;
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">mint truth card</span>
        <h1 className="serif text-3xl">{card?.symbol ?? addr}</h1>
        <span className="mono text-xs text-[color:var(--color-ink-500)]">{addr}</span>
      </div>
      {err && <p className="text-[color:var(--color-refuse)]">{err}</p>}
      {card && (
        <div className="card p-6 grid gap-3">
          <KV k="name" v={card.name} />
          <KV k="decimals" v={card.decimals} />
          <KV k="supply" v={card.supply} />
          <KV k="multiplier" v={card.multiplier} />
          <KV k="next multiplier" v={card.next_multiplier} />
          <KV k="effective ts" v={card.effective_timestamp} />
          <KV k="paused" v={String(card.paused)} />
          <KV k="permanent delegate" v={card.permanent_delegate} />
          <KV k="transfer hook program" v={card.transfer_hook_program ?? "none"} />
          <KV k="transfer hook authority" v={card.transfer_hook_authority} />
          <KV k="slot read" v={card.slot} />
        </div>
      )}
      <p className="text-xs text-[color:var(--color-ink-500)]">
        The list above is exactly what the guard reads before it will let a plan touch this mint.
      </p>
    </div>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-baseline text-sm">
      <span className="text-[color:var(--color-ink-500)]">{k}</span>
      <span className="mono break-all">{v ?? "-"}</span>
    </div>
  );
}
