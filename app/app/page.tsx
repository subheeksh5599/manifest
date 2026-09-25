import Link from "next/link";
import { loadRegistry } from "@/lib/registry";
import { readExitTerms } from "@/lib/exit-terms.mjs";
import { exitVerdict } from "@/lib/exit-engine.mjs";

export const dynamic = "force-dynamic";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUPITER_QUOTE = process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote";
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const fmt = (v: string | null | undefined) => {
  if (!v) return "—";
  try {
    return BigInt(v).toLocaleString("en-US");
  } catch {
    return String(v);
  }
};

/** One real read for the hero: the product's own claim, performed not described. */
async function heroRead() {
  const entries = loadRegistry();
  const entry = entries.find((e) => e.issuer === "PreStocks") ?? entries[0];
  if (!entry) return null;

  const size = (10n ** BigInt(entry.decimals + 3)).toString();
  try {
    const terms: any = await readExitTerms(entry.mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
    let quote: any = null;
    try {
      const r = await fetch(
        `${JUPITER_QUOTE}?inputMint=${entry.mint}&outputMint=${USDC}&amount=${size}&slippageBps=50`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (r.ok) {
        const d = await r.json();
        if (d?.outAmount) {
          const impact = Number(d.priceImpactPct ?? 0);
          quote = {
            venue: "pool",
            available: true,
            out_amount: d.outAmount,
            price_impact_bps: Number.isFinite(impact) ? Math.round(impact * 10000) : 0,
          };
        }
      }
    } catch {
      quote = null;
    }
    const verdict: any = exitVerdict(terms, quote, BigInt(size), {
      max_impact_bps: 300,
      max_total_cost_bps: 1000,
    });
    return { entry, size, terms, verdict };
  } catch {
    return null;
  }
}

export default async function Home() {
  const read = await heroRead();
  const landing = read?.verdict?.landing ?? null;
  const terms = read?.terms;
  const pending = terms?.fee_pending ?? null;

  return (
    <>
      {/* BEGIN: MainHeader */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#dedfe1]">
        <div className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-10">
            <Link className="text-xl font-bold tracking-tight text-black flex items-center" href="/">
              manifest
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <nav className="hidden md:flex items-center space-x-7 text-[13px] font-normal text-gray-700">
              <Link className="hover:text-black transition-colors" href="/exit">Exit Desk</Link>
              <Link className="hover:text-black transition-colors" href="/issuers">Issuers</Link>
              <Link className="hover:text-black transition-colors" href="/tape">Tape</Link>
              <Link className="hover:text-black transition-colors" href="/evidence">Evidence</Link>
              <a className="hover:text-black transition-colors" href="https://github.com/subheeksh5599/manifest">Source</a>
            </nav>
            <Link className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors shadow-sm" href="/exit">
              Open the desk
            </Link>
          </div>
        </div>
      </header>
      {/* END: MainHeader */}

      {/* BEGIN: HeroSection */}
      <section className="bg-[#edeff2] pt-16 pb-20 border-b border-[#dedfe1]">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] text-black">
                What lands<br />is not<br />what was<br />quoted
              </h1>
              <p className="text-[14px] text-gray-600 leading-relaxed max-w-[390px]">
                A swap quote is the pool's arithmetic. The mint then takes its transfer fee on the
                way out, so the holder receives less than the number on screen. Manifest reads the
                exit terms out of the mint itself and reports what actually lands.
              </p>
              <div className="pt-2 flex items-center gap-6">
                <Link className="inline-flex items-center text-[13px] font-medium text-black hover:underline group" href="/exit">
                  Open the exit desk
                  <span className="ml-1 tracking-normal transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
                <Link className="text-[13px] font-medium text-gray-500 hover:text-black transition-colors" href="/issuers">
                  Compare issuers
                </Link>
              </div>
            </div>

            {/* The live read itself, not an illustration of one */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-[#dedfe1] rounded-[2px] shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <span className="font-medium text-gray-900 text-[12px]">Exit reading</span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {read ? `${read.entry.symbol} · slot ${terms?.slot} · epoch ${terms?.epoch}` : "chain unavailable"}
                  </span>
                </div>

                {read && landing ? (
                  <div className="pt-4 space-y-3">
                    <Row label="quoted by the pool" value={fmt(landing.quoted_out)} />
                    <Row label={`withheld by the mint · ${landing.schedule_bps} bps`} value={fmt(landing.withheld)} accent />
                    <div className="border-t border-gray-100 pt-3">
                      <Row label="lands with the holder" value={fmt(landing.lands)} big />
                    </div>

                    {pending && (
                      <div className="mt-4 p-3 bg-amber-50 border-l-2 border-amber-500 text-[11px] leading-relaxed text-gray-700">
                        This mint carries a second schedule of <strong>{pending.bps} bps</strong> that
                        takes effect at epoch <strong>{pending.epoch}</strong>. The chain is at{" "}
                        <strong>{terms?.epoch}</strong>. The same exit would then withhold{" "}
                        <strong>{fmt(landing.withheld_after_pending)}</strong>.
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 font-mono pt-1">
                      size {fmt(read.size)} base units · read at request time · nothing cached
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 text-[12px] text-gray-500">
                    The chain read did not complete on this request. Open the desk to retry against
                    the mint directly.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* END: HeroSection */}

      {/* BEGIN: SocialProof */}
      <section className="py-12 bg-white border-b border-[#dedfe1]">
        <div className="max-w-[1240px] mx-auto px-6 text-center">
          <p className="text-[13px] font-medium text-gray-500 mb-8 tracking-normal">Reads</p>
          <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16 opacity-75 grayscale contrast-125">
            <span className="text-sm tracking-widest font-extrabold uppercase font-sans text-gray-900">SOLANA</span>
            <span className="text-sm font-semibold tracking-tight text-gray-900">TOKEN-2022 MINT ACCOUNTS</span>
            <span className="text-sm font-bold tracking-tight text-gray-900">JUPITER ROUTES</span>
            <span className="text-sm font-semibold tracking-tight text-gray-900">PUBLIC RPC</span>
          </div>
        </div>
      </section>
      {/* END: SocialProof */}

      {/* BEGIN: WhatItReads */}
      <section className="bg-[#1a1a1a] text-white py-24">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              The exit terms are in the mint
            </h2>
            <p className="text-[14px] text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Token-2022 lets an issuer attach a transfer fee, a permanent delegate, a freeze
              authority and a hook to the asset itself. Those values are public, and they are what
              determines what an exit is worth. Most surfaces show a price and stop there.
            </p>
          </div>

          <div className="flex justify-center items-center gap-8 sm:gap-16 mb-16 text-center divide-x divide-neutral-800">
            <div className="px-4">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">72</div>
              <div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">TESTS</div>
            </div>
            <div className="px-4 pl-8 sm:pl-16">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">6</div>
              <div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">EXIT CHECKS</div>
            </div>
            <div className="px-4 pl-8 sm:pl-16">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">2</div>
              <div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">ISSUERS READ</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white text-black p-7 rounded-[2px] flex flex-col justify-between">
              <div>
                <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold mb-3 rounded-[2px]">
                  READ FROM THE ACCOUNT BYTES
                </span>
                <h3 className="text-lg font-bold mb-1">Two schedules, one in force</h3>
                <p className="text-[12px] text-gray-600 mb-6 leading-normal">
                  A mint can carry a fee schedule that has not taken effect yet. The schedule in
                  force at epoch E is the newer one when E is at or past its epoch, otherwise the
                  older. Both are readable today.
                </p>
                <ul className="text-[12px] space-y-2 border-t border-gray-100 pt-4 text-gray-800">
                  <li><strong className="font-semibold">older</strong> — the schedule being charged now</li>
                  <li><strong className="font-semibold">newer</strong> — announced, not yet applied</li>
                  <li><strong className="font-semibold">maximum fee</strong> — a u64, and it can be 2^64-1</li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
                Parsed JSON returns u64 values as numbers, which cannot hold 2^64-1. The fee fields
                are lifted from the account bytes instead.
              </div>
            </div>

            <div className="bg-white text-black p-7 rounded-[2px] flex flex-col justify-between">
              <div>
                <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white font-semibold mb-3 rounded-[2px]">
                  PRICED, NOT ASSUMED
                </span>
                <h3 className="text-lg font-bold mb-1">What lands</h3>
                <p className="text-[12px] text-gray-600 mb-6 leading-normal">
                  The quote comes from an aggregator at the size being exited. The withheld amount
                  comes from the mint's schedule in force. What lands is the difference, and it is
                  the only number that describes a payout.
                </p>
                <ul className="text-[12px] space-y-2 border-t border-gray-100 pt-4 text-gray-800">
                  <li><strong className="font-semibold">quoted_out</strong> — the pool's arithmetic</li>
                  <li><strong className="font-semibold">withheld</strong> — the mint's cut</li>
                  <li><strong className="font-semibold">lands</strong> — quoted minus withheld</li>
                  <li><strong className="font-semibold">round trip</strong> — the fee applies twice</li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
                The second leg is levied on the amount the first leg leaves behind, so a round trip
                is slightly under twice the rate.
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* END: WhatItReads */}

      {/* BEGIN: RefusalIsAnAnswer */}
      <section className="py-24 bg-white border-b border-[#dedfe1]">
        <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
              When no exit is achievable, it says so
            </h2>
            <p className="text-[14px] text-gray-600 leading-relaxed max-w-lg">
              A paused mint cannot be transferred out of. An installed hook puts code on every
              transfer. A market with no route has no exit at any price. Each is a different answer
              and each gets its own name, rather than a zero that looks like a price.
            </p>
            <div className="pt-2">
              <Link className="text-[13px] font-medium text-blue-600 hover:underline" href="/exit">
                Open the exit desk →
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="w-full bg-white border border-[#dedfe1] p-6 rounded-[2px] shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-mono mb-4">
                Checked in this order · first failure is the verdict
              </div>
              {[
                ["mint_is_token_2022", "the owning program decides whether a fee can exist"],
                ["mint_not_paused", "a paused mint blocks every transfer"],
                ["no_transfer_hook_program", "a hook is arbitrary code on every transfer"],
                ["exit_route_exists", "an aggregator quote for this size"],
                ["impact_within_bound", "price impact at the size being exited"],
                ["fee_does_not_consume_position", "the fee against the size"],
              ].map(([id, why], i) => (
                <div key={id} className="flex gap-4 py-2.5 border-b border-gray-100 last:border-0">
                  <span className="text-[11px] text-gray-300 font-mono w-4">{i + 1}</span>
                  <div>
                    <div className="text-[12px] font-mono text-gray-900">{id}</div>
                    <div className="text-[11px] text-gray-500">{why}</div>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
                The rest are still recorded when the first one trips, because knowing which other
                conditions also fail is useful for fixing it.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* END: RefusalIsAnAnswer */}

      {/* BEGIN: Surfaces */}
      <section className="py-24 bg-[#edeff2] border-b border-[#dedfe1]">
        <div className="max-w-[1240px] mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black mb-12">
            Surfaces, each reading the chain
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                href: "/exit",
                t: "Exit Desk",
                b: "Pick a mint and a size. Three numbers: quoted, withheld, lands. Every check and every route below them.",
              },
              {
                href: "/issuers",
                t: "Issuer Board",
                b: "Every mint in the registry, read live, grouped by issuer. Two issuers of the same asset class do not offer the same exit.",
              },
              {
                href: "/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
                t: "Mint Inspector",
                b: "The full exit record for one mint: both fee schedules, what is withheld, and the key behind each authority.",
              },
              {
                href: "/tape",
                t: "Tape",
                b: "Append-only ledger of readings, each with the value that decided it and the slot it was read at.",
              },
            ].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="border border-[#dedfe1] rounded-[2px] p-5 bg-white hover:border-black transition-colors block"
              >
                <h4 className="text-[13px] font-bold text-gray-900 leading-snug mb-1">{s.t}</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{s.b}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* END: Surfaces */}

      {/* BEGIN: HonestyTable */}
      <section className="py-16 bg-[#1a1a1a] border-t border-neutral-800 text-white text-center">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              What is built. What is not. <span className="bg-[#e2e7fc] text-black px-1.5 py-0.5 rounded-[2px]">No ambiguity.</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left pt-6 text-[12px]">
              <div>
                <div className="font-bold text-white mb-3 text-[11px] uppercase tracking-wider">Done</div>
                <ul className="space-y-2 text-neutral-400">
                  <li>Exit terms read from the mint</li>
                  <li>Fee schedule selected by epoch</li>
                  <li>u64 fee fields read from bytes</li>
                  <li>Quote priced down to what lands</li>
                  <li>72 tests, 0 failures</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-white mb-3 text-[11px] uppercase tracking-wider">Not claimed</div>
                <ul className="space-y-2 text-neutral-400">
                  <li>Executing a swap on mainnet</li>
                  <li>An issuer redemption window</li>
                  <li>Underwriting or insurance</li>
                  <li>A second issuer for the same company</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-white mb-3 text-[11px] uppercase tracking-wider">Reproduce it</div>
                <ul className="space-y-2 text-neutral-400">
                  <li>node --test lib/*.test.mjs</li>
                  <li>GET /api/issuers</li>
                  <li>GET /api/exit</li>
                  <li>Visit any mint record</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* END: HonestyTable */}

      {/* BEGIN: Footer */}
      <footer className="bg-[#1a1a1a] text-white pt-16 pb-12">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-16 border-b border-neutral-800">
            <div className="col-span-2 space-y-4">
              <div className="text-xl font-bold tracking-tight text-white">manifest</div>
              <p className="text-[12px] text-neutral-400 leading-relaxed max-w-[280px]">
                Exit terms for tokenized equities on Solana, read from the mint at request time.
              </p>
              <div className="flex items-center space-x-4 text-neutral-400 pt-2">
                <a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"></path></svg>
                </a>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="text-[12px] font-bold uppercase tracking-wider text-white">Surfaces</h5>
              <ul className="space-y-2 text-[12px] text-neutral-400">
                <li><Link className="hover:text-white transition-colors" href="/exit">Exit Desk</Link></li>
                <li><Link className="hover:text-white transition-colors" href="/issuers">Issuer Board</Link></li>
                <li><Link className="hover:text-white transition-colors" href="/tape">Tape</Link></li>
                <li><Link className="hover:text-white transition-colors" href="/evidence">Evidence</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h5 className="text-[12px] font-bold uppercase tracking-wider text-white">Inspect</h5>
              <ul className="space-y-2 text-[12px] text-neutral-400">
                <li><Link className="hover:text-white transition-colors" href="/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB">TSLAx mint</Link></li>
                <li><Link className="hover:text-white transition-colors" href="/mint/PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB">ANDURIL mint</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h5 className="text-[12px] font-bold uppercase tracking-wider text-white">Source</h5>
              <ul className="space-y-2 text-[12px] text-neutral-400">
                <li><a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest">GitHub</a></li>
                <li><a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest/blob/main/README.md">README</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 text-center text-[11px] text-neutral-500">
            No wallet. No funds. No mocks. MIT — 2026
          </div>
        </div>
      </footer>
      {/* END: Footer */}
    </>
  );
}

function Row({ label, value, accent, big }: { label: string; value: string; accent?: boolean; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-mono">{label}</span>
      <span
        className={`font-mono tracking-tight ${big ? "text-2xl font-bold" : "text-base font-semibold"} ${
          accent ? "text-amber-700" : "text-black"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
