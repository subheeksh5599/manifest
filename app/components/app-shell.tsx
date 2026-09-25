"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * The dashboard shell.
 *
 * Every screen past the landing page sits in this frame: the mark, the six
 * destinations, and the state of the sources the numbers depend on. The status
 * block is deliberately part of the chrome rather than a page of its own — if the
 * chain or the venue stops answering, that has to be visible from wherever you
 * are standing, not on a diagnostics screen you would have to go looking for.
 */

const NAV = [
  { href: "/app", key: "overview", label: "Overview" },
  { href: "/assets", key: "assets", label: "Assets" },
  { href: "/analyze", key: "analyze", label: "Analyze mint" },
  { href: "/settle", key: "settle", label: "Settlement" },
  { href: "/tx", key: "tx", label: "Transactions" },
  { href: "/proof", key: "proof", label: "Proof" },
];

type Status = {
  at: string;
  ok: boolean;
  ms: number;
  rpc: { ok: boolean; ms: number | null; slot: number | null; epoch: number | null; error: string | null };
  venue: { ok: boolean; ms: number | null; price: number | null; error: string | null };
};

const Dot = ({ ok }: { ok: boolean | null }) => (
  <span
    aria-hidden
    style={{
      display: "inline-block",
      width: 6,
      height: 6,
      borderRadius: 999,
      background: ok === null ? "var(--color-ash)" : ok ? "#16794c" : "var(--color-refuse)",
      flex: "none",
    }}
  />
);

export default function AppShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/status", { cache: "no-store" });
        if (!r.ok) throw new Error(`status returned ${r.status}`);
        const j = (await r.json()) as Status;
        if (alive) {
          setStatus(j);
          setStatusErr(null);
        }
      } catch (e) {
        if (alive) {
          setStatus(null);
          setStatusErr((e as Error).message);
        }
      }
    };
    void tick();
    const id = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const row = (label: string, ok: boolean | null, detail: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 11,
        color: "var(--color-graphite)",
      }}
    >
      <Dot ok={ok} />
      <span style={{ minWidth: 62 }}>{label}</span>
      <span className="mono" style={{ marginLeft: "auto", color: "var(--color-ash)" }}>
        {detail}
      </span>
    </div>
  );

  return (
    <div className="shell">
      <aside className="shell-rail">
        <div style={{ padding: "22px 20px 16px" }}>
          <Link href="/" className="shell-mark">
            Manifest
          </Link>
          <div className="label-mono" style={{ marginTop: 4, fontSize: 9 }}>
            settlement, priced honestly
          </div>
        </div>

        <nav style={{ display: "grid", gap: 1, padding: "0 10px" }}>
          {NAV.map((n) => {
            const on = n.key === active || pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`shell-link${on ? " shell-link-on" : ""}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "16px 20px 20px", display: "grid", gap: 7 }}>
          <div className="label-mono" style={{ fontSize: 9, marginBottom: 2 }}>
            sources
          </div>
          {row("RPC", status?.rpc.ok ?? (statusErr ? false : null), status?.rpc.slot ? String(status.rpc.slot) : status?.rpc.ok === false ? "down" : "…")}
          {row("Venue", status?.venue.ok ?? (statusErr ? false : null), status?.venue.ms != null ? `${status.venue.ms}ms` : status?.venue.ok === false ? "quotes off" : "…")}
          {status?.rpc.epoch != null && (
            <div className="mono" style={{ fontSize: 10, color: "var(--color-ash)" }}>
              epoch {status.rpc.epoch} · read {new Date(status.at).toISOString().slice(11, 19)}Z
            </div>
          )}
          {statusErr && (
            <div className="mono" style={{ fontSize: 10, color: "var(--color-refuse)" }}>
              status unreachable
            </div>
          )}
        </div>
      </aside>

      <main className="shell-main">{children}</main>
    </div>
  );
}
