import { readExitTerms } from "@/lib/exit-terms.mjs";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

export default async function MintPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;

  let terms: any = null;
  let err: string | null = null;
  try {
    terms = await readExitTerms(addr, {
      rpcUrl: process.env.RPC_URL,
      ua: process.env.RPC_USER_AGENT,
    });
  } catch (e) {
    err = (e as Error).message;
  }

  const rows: [string, unknown][] = terms
    ? [
        ["Name", terms.name],
        ["Symbol", terms.symbol],
        ["Decimals", terms.decimals],
        ["Supply", terms.supply],
        ["Owning program", terms.owner],
        ["Token-2022", terms.is_token_2022 === null ? "unknown" : String(terms.is_token_2022)],
        ["Epoch at read", terms.epoch],
        ["Fee in force", terms.fee_effective ? `${terms.fee_effective.bps} bps @ epoch ${terms.fee_effective.epoch}` : "none"],
        ["Fee not yet in force", terms.fee_pending ? `${terms.fee_pending.bps} bps @ epoch ${terms.fee_pending.epoch}` : "none"],
        ["Fee schedule source", terms.fee_exact ? "account bytes" : "parsed values"],
        ["Older maximum fee", terms.fee_older?.maximum_fee],
        ["Newer maximum fee", terms.fee_newer?.maximum_fee],
        ["Withheld so far", terms.withheld_amount],
        ["Paused", String(terms.paused)],
        ["Permanent delegate", terms.permanent_delegate],
        ["Transfer hook program", terms.transfer_hook_program ?? "none"],
        ["Transfer hook authority", terms.transfer_hook_authority],
        ["Multiplier", terms.multiplier],
        ["Slot read", terms.slot],
      ]
    : [];

  return (
    <DashboardLayout active="mints">
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Mint</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>{terms?.symbol ?? "Mint detail"}</h1>
        <code className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", marginTop: 6, display: "block" }}>{addr}</code>
      </div>

      {err && (
        <div style={{ padding: "12px 16px", background: "rgba(255,77,77,0.06)", borderRadius: 8, fontSize: 13, color: "var(--color-refuse)" }}>
          {err}
        </div>
      )}

      {terms && (
        <>
          <div className="card" style={{ padding: 28, marginBottom: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, fontSize: 13, alignItems: "baseline" }}>
                  <span className="label-mono" style={{ fontSize: 10 }}>{k}</span>
                  <code className="mono" style={{ wordBreak: "break-all", color: "var(--color-onyx)" }}>
                    {v === null || v === undefined ? "—" : String(v)}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 14 }}>
              Authorities · {terms.authority.total_levers} levers behind {terms.authority.distinct_keys} key{terms.authority.distinct_keys === 1 ? "" : "s"}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {terms.authority.levers.map((l: { lever: string; key: string }) => (
                <div key={l.lever} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>{l.lever}</code>
                  <code className="mono" style={{ color: "var(--color-graphite)", wordBreak: "break-all" }}>{l.key}</code>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
