import { truthCard } from "@/lib/rpc";
import DashboardLayout from "@/components/dashboard-layout";

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
    <DashboardLayout active="mints">
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Mint</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>{card?.symbol ?? "Mint detail"}</h1>
        <code className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", marginTop: 6, display: "block" }}>{addr}</code>
      </div>
      {err && (
        <div style={{ padding: "12px 16px", background: "rgba(255, 77, 77, 0.06)", borderRadius: 8, fontSize: 13, color: "var(--color-refuse)" }}>
          {err}
        </div>
      )}
      {card && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["Name", card.name],
              ["Decimals", card.decimals],
              ["Supply", card.supply],
              ["Multiplier", card.multiplier],
              ["Next multiplier", card.next_multiplier],
              ["Effective ts", card.effective_timestamp],
              ["Paused", String(card.paused)],
              ["Permanent delegate", card.permanent_delegate],
              ["Transfer hook program", card.transfer_hook_program ?? "none"],
              ["Transfer hook authority", card.transfer_hook_authority],
              ["Slot read", card.slot],
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, fontSize: 13, alignItems: "baseline" }}>
                <span className="label-mono" style={{ fontSize: 10 }}>{k}</span>
                <code className="mono" style={{ wordBreak: "break-all", color: "var(--color-onyx)" }}>{v ?? "—"}</code>
              </div>
            ))}
          </div>
        </div>
      )}
      <p style={{ marginTop: 20, fontSize: 13, color: "var(--color-graphite)", maxWidth: "56ch" }}>
        The list above is exactly what the guard reads before it will let a plan touch this mint.
      </p>
    </DashboardLayout>
  );
}