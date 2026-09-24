import Link from "next/link";

export default function Home() {
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
<div className="relative group cursor-pointer flex items-center gap-1 hover:text-black transition-colors">
<span>Products</span>
<svg className="w-3.5 h-3.5 text-gray-500 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<Link className="hover:text-black transition-colors" href="/plan">Plan</Link>
<Link className="hover:text-black transition-colors" href="/tape">Tape</Link>
<a className="hover:text-black transition-colors" href="https://github.com/subheeksh5599/manifest">Source</a>
</nav>
<Link className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors shadow-sm" href="/plan">
          Launch App
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
            Scheduled<br/>equity buys<br/>that verify<br/>or refuse
</h1>
<p className="text-[14px] text-gray-600 leading-relaxed max-w-[390px]">
            Every recurring buy is checked against live Token-2022 mint state before execution. If any of 7 invariant checks fails, the trade is refused and the refusal becomes a permanent on-chain receipt.
</p>
<div className="pt-2">
<Link className="inline-flex items-center text-[13px] font-medium text-black hover:underline group" href="/plan">
              Launch app
              <span className="ml-1 tracking-normal transition-transform group-hover:translate-x-0.5">→</span>
</Link>
</div>
</div>
{/* Right Hero Chart UI Mockup */}
<div className="lg:col-span-7">
<div className="bg-white border border-[#dedfe1] rounded-[2px] shadow-sm p-4 text-[11px]">
{/* Chart Header Controls */}
<div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
<div className="flex items-center space-x-2">
<span className="font-medium text-gray-900 border-b border-black pb-0.5">Preflight verdicts</span>
</div>
<div className="flex items-center space-x-3 text-gray-500">
<button className="flex items-center gap-1 hover:text-gray-900">
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Compare
</button>
<button className="flex items-center gap-1 hover:text-gray-900">
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Favorite
</button>
<button className="flex items-center gap-1 hover:text-gray-900">
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Create alert
</button>
</div>
</div>
{/* Chart Filter & Selector Row */}
<div className="py-2.5 flex items-center justify-between">
<div className="flex items-center space-x-2">
<span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-[2px] font-medium text-gray-800 text-[10px]">
<span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 inline-block"></span>
                  xStock Equities
</span>
<div className="relative">
<input className="text-[11px] py-0.5 px-2 bg-gray-50 border border-gray-200 rounded-[2px] w-28 text-gray-700" readOnly type="text" defaultValue="preflight"/>
<svg className="w-3 h-3 text-gray-400 absolute right-1.5 top-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
</div>
</div>
<div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono">
<span>1D</span>
<span className="text-black font-semibold">1W</span>
<span>1M</span>
<span>1Y</span>
<span>ALL</span>
</div>
</div>
{/* Chart Visual Area */}
<div className="h-64 w-full bg-white relative overflow-hidden rounded-[2px] border border-gray-100 flex flex-col justify-end">
<div className="absolute inset-0 grid grid-rows-5 grid-cols-6 border-b border-gray-100">
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-gray-50/80"></div>
</div>
<svg className="w-full h-full preserve-3d" preserveAspectRatio="none" viewBox="0 0 600 240">
<defs>
<linearGradient id="grad-red" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ef4444" stopOpacity="0.9"></stop>
<stop offset="100%" stopColor="#dc2626" stopOpacity="0.8"></stop>
</linearGradient>
<linearGradient id="grad-orange" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#f97316" stopOpacity="0.8"></stop>
<stop offset="100%" stopColor="#ea580c" stopOpacity="0.7"></stop>
</linearGradient>
<linearGradient id="grad-amber" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7"></stop>
<stop offset="100%" stopColor="#d97706" stopOpacity="0.6"></stop>
</linearGradient>
<linearGradient id="grad-yellow" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6"></stop>
<stop offset="100%" stopColor="#fcd34d" stopOpacity="0.5"></stop>
</linearGradient>
<linearGradient id="grad-blue" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5"></stop>
<stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4"></stop>
</linearGradient>
<linearGradient id="grad-purple" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#a855f7" stopOpacity="0.4"></stop>
<stop offset="100%" stopColor="#c084fc" stopOpacity="0.3"></stop>
</linearGradient>
</defs>
<path d="M 0,240 L 0,80 Q 75,120 150,90 T 300,60 T 450,40 T 600,20 L 600,240 Z" fill="url(#grad-purple)"></path>
<path d="M 0,240 L 0,110 Q 80,140 160,110 T 320,80 T 470,60 T 600,45 L 600,240 Z" fill="url(#grad-blue)"></path>
<path d="M 0,240 L 0,140 Q 90,170 170,130 T 340,110 T 490,90 T 600,70 L 600,240 Z" fill="url(#grad-yellow)"></path>
<path d="M 0,240 L 0,165 Q 100,195 190,150 T 370,135 T 510,120 T 600,95 L 600,240 Z" fill="url(#grad-amber)"></path>
<path d="M 0,240 L 0,190 Q 110,215 210,180 T 390,160 T 530,145 T 600,125 L 600,240 Z" fill="url(#grad-orange)"></path>
<path d="M 0,240 L 0,210 Q 120,230 230,205 T 410,185 T 550,170 T 600,155 L 600,240 Z" fill="url(#grad-red)"></path>
<path d="M 0,190 Q 60,160 120,130 T 240,110 T 360,95 T 480,45 T 600,30" fill="none" stroke="#000" strokeWidth="1.5"></path>
</svg>
<div className="flex justify-between text-[9px] text-gray-400 px-3 py-1.5 bg-white border-t border-gray-100 font-mono">
<span>2016</span>
<span>2018</span>
<span>2020</span>
<span>2022</span>
<span>2024</span>
<span>2026</span>
</div>
</div>
</div>
</div>
</div>
</div>
</section>
{/* END: HeroSection */}

{/* BEGIN: SocialProof */}
<section className="py-12 bg-white border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6 text-center">
<p className="text-[13px] font-medium text-gray-500 mb-8 tracking-normal">
        Built with
</p>
<div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16 opacity-75 grayscale contrast-125">
<span className="text-sm tracking-widest font-extrabold uppercase font-sans text-gray-900">SOLANA</span>
<div className="flex items-center space-x-1 font-semibold text-sm tracking-wider text-gray-900">
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>
<span className="tracking-tight">TOKEN-2022</span>
</div>
<span className="text-sm font-semibold tracking-tight text-gray-900">Anchor</span>
<div className="flex items-center text-sm font-bold text-gray-900">
<span>Jupiter</span>
<span className="text-[10px] ml-1 uppercase font-normal tracking-widest bg-gray-100 px-1 rounded-[1px]">V3</span>
</div>
<span className="text-sm font-bold tracking-tight text-gray-900">Backed Finance</span>
</div>
</div>
</section>
{/* END: SocialProof */}

{/* BEGIN: UnifiedDataLayer */}
<section className="bg-[#1a1a1a] text-white py-24">
<div className="max-w-[1240px] mx-auto px-6">
<div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          The preflight guard for tokenized equities
</h2>
<p className="text-[14px] text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Tokenized stock mints on Solana carry live issuer state in Token-2022 extensions. Manifest reads that state at request time and gates every buy against 7 invariant checks before any equity moves.
</p>
</div>
<div className="flex justify-center items-center gap-8 sm:gap-16 mb-16 text-center divide-x divide-neutral-800">
<div className="px-4">
<div className="text-2xl sm:text-3xl font-bold tracking-tight">554</div>
<div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">TESTS</div>
</div>
<div className="px-4 pl-8 sm:pl-16">
<div className="text-2xl sm:text-3xl font-bold tracking-tight">7</div>
<div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">INVARIANT CHECKS</div>
</div>
<div className="px-4 pl-8 sm:pl-16">
<div className="text-2xl sm:text-3xl font-bold tracking-tight">5</div>
<div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">xSTOCK MINTS</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
{/* Card 1: Off-Chain */}
<div className="bg-white text-black p-7 rounded-[2px] flex flex-col justify-between">
<div>
<span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold mb-3 rounded-[2px]">
              OFF-CHAIN
</span>
<h3 className="text-lg font-bold mb-1">Preflight evaluation</h3>
<p className="text-[12px] text-gray-600 mb-6 leading-normal">
              Pure function that takes a plan, a registry entry, and a live mint card. Returns ACCEPT or REFUSE with the named check that tripped. No side effects, no network on the hot path.
</p>
<ul className="text-[12px] space-y-2 border-t border-gray-100 pt-4 text-gray-800">
<li><strong className="font-semibold">mint_identity</strong> — registry entry exists, symbol matches</li>
<li><strong className="font-semibold">multiplier_freshness</strong> — snapshot == live multiplier</li>
<li><strong className="font-semibold">issuer_levers</strong> — not paused, no transfer hook</li>
<li><strong className="font-semibold">reference_regime</strong> — last print age within tolerance</li>
<li><strong className="font-semibold">exit_at_size</strong> — round-trip cost within bound</li>
<li><strong className="font-semibold">policy</strong> — size within per-trade cap</li>
</ul>
</div>
<div className="pt-6 mt-6 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
            Reads live Token-2022 extension state from Solana mainnet RPC.
</div>
</div>
{/* Card 2: On-Chain */}
<div className="bg-white text-black p-7 rounded-[2px] flex flex-col justify-between">
<div>
<span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white font-semibold mb-3 rounded-[2px]">
              ON-CHAIN
</span>
<div className="mb-5">
<h3 className="text-lg font-bold mb-1">Anchor program</h3>
<p className="text-[12px] text-gray-600 mb-3 leading-normal">
                Deployed on Solana devnet. Creates PDA-bound plans, runs preflight checks against Token-2022 extension data, records fills and refusals as permanent on-chain receipts.
</p>
<ul className="text-[12px] space-y-1.5 text-gray-800">
<li><strong className="font-semibold">• create_plan</strong> — PDA-bound plan with mint + snapshot</li>
<li><strong className="font-semibold">• preflight</strong> — reads pausable, transfer_hook, multiplier</li>
<li><strong className="font-semibold">• record_fill</strong> — writes fill receipt to chain</li>
<li><strong className="font-semibold">• record_refusal</strong> — writes refusal with reason code</li>
</ul>
</div>
<div className="border-t border-gray-100 pt-4">
<h3 className="text-base font-bold mb-1">Devnet artifacts</h3>
<p className="text-[12px] text-gray-600 mb-3 leading-normal">
                All four instructions verified on-chain. Plans, fills, and refusals are readable in Solana Explorer.
</p>
<ul className="text-[12px] space-y-1.5 text-gray-800">
<li><strong className="font-semibold">• Program</strong> — pTpaE75ubNyv...yVTN</li>
<li><strong className="font-semibold">• Plan (filled)</strong> — rDt5XPbutXYP...oxh3</li>
<li><strong className="font-semibold">• Fill receipt</strong> — 67t8p3Kmxt...ESsA</li>
<li><strong className="font-semibold">• Refusal receipt</strong> — 7hBCzAdqrs...msj</li>
</ul>
</div>
</div>
<div className="pt-6 mt-6 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
            Deployed via cargo-build-sbf + solana program deploy.
</div>
</div>
</div>
<div className="text-center mt-12 space-y-3">
<div>
<a className="text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors" href="https://explorer.solana.com/address/pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA?cluster=devnet">
            View on Solana Explorer →
</a>
</div>
<p className="text-[12px] text-gray-500">
          You can access the data through <span className="text-gray-300">Plan Builder</span>, <span className="text-gray-300">Tape</span> or the <span className="text-gray-300">Mint Inspector</span>.
</p>
</div>
</div>
</section>
{/* END: UnifiedDataLayer */}

{/* BEGIN: FlagshipStudioSection */}
<section className="py-24 bg-white border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
<div className="lg:col-span-6 space-y-6">
<div className="flex items-center space-x-1.5 text-sm font-semibold">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-500">app</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            What you can inspect
</h2>
<p className="text-[14px] text-gray-600 leading-relaxed max-w-lg">
            Every surface reads live state from Solana mainnet. Nothing is mocked or cached beyond a single request. The plan builder, refusal tape, mint inspector, and evidence pack are all live.
</p>
<ul className="space-y-3 text-[13px] text-gray-700">
<li className="flex items-start gap-2.5">
<span className="mt-0.5 text-gray-400">⊡</span>
<span>Plan builder: compose a plan in 7 bounds, evaluate against live state.</span>
</li>
<li className="flex items-start gap-2.5">
<span className="mt-0.5 text-gray-400">⊞</span>
<span>No-Trade Tape: every refusal with the check, the value, and the slot.</span>
</li>
<li className="flex items-start gap-2.5">
<span className="mt-0.5 text-gray-400">⊠</span>
<span>Mint truth cards: live Token-2022 extension state per issuer mint.</span>
</li>
</ul>
<div className="pt-4 flex items-center space-x-5">
<Link className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors" href="/plan">
              Launch App
</Link>
<a className="text-[13px] font-medium text-blue-600 hover:underline" href="https://github.com/subheeksh5599/manifest">
              View source →
</a>
</div>
</div>
{/* 3D Isometric Data Plane Graphic Mockup */}
<div className="lg:col-span-6 flex justify-center">
<div className="w-full max-w-[480px] h-64 relative flex items-center justify-center">
<svg className="w-full h-full text-blue-500/20" fill="none" viewBox="0 0 400 240">
<path d="M 200,20 L 360,110 L 200,200 L 40,110 Z" fill="#f8fafc" stroke="#2563eb" strokeOpacity="0.3" strokeWidth="1.2"></path>
<path d="M 200,50 L 330,125 L 200,180 L 70,125 Z" fill="#ffffff" stroke="#2563eb" strokeOpacity="0.25" strokeWidth="1"></path>
<line stroke="#3b82f6" strokeDasharray="3 3" strokeWidth="1.5" x1="80" x2="200" y1="120" y2="60"></line>
<line stroke="#3b82f6" strokeWidth="1.5" x1="200" x2="320" y1="60" y2="120"></line>
<line stroke="#3b82f6" strokeWidth="1.5" x1="200" x2="200" y1="60" y2="170"></line>
<circle cx="200" cy="60" fill="#2563eb" r="4"></circle>
<circle cx="150" cy="90" fill="#3b82f6" r="3"></circle>
<circle cx="270" cy="100" fill="#1d4ed8" r="3.5"></circle>
<circle cx="200" cy="170" fill="#60a5fa" r="4"></circle>
<circle cx="240" cy="140" fill="#3b82f6" r="2.5"></circle>
<polygon fill="#3b82f6" fillOpacity="0.6" points="190,40 210,40 210,50 190,50"></polygon>
<polygon fill="#3b82f6" fillOpacity="0.6" points="290,85 305,85 305,95 290,95"></polygon>
</svg>
</div>
</div>
</div>
{/* Studio 4 Metric Cards */}
<div className="relative">
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
{/* Card 1 */}
<div className="border border-[#dedfe1] rounded-[2px] p-4 bg-white flex flex-col justify-between">
<div>
<div className="h-28 bg-gray-50 border border-gray-100 rounded-[2px] mb-3 overflow-hidden flex items-end">
<svg className="w-full h-full text-red-400" viewBox="0 0 200 80">
<path d="M 0,60 Q 40,30 80,45 T 140,20 T 200,35" fill="none" stroke="#f43f5e" strokeWidth="2"></path>
<path d="M 0,70 Q 50,55 100,50 T 170,40 T 200,60" fill="none" stroke="#000" strokeDasharray="2 2" strokeWidth="1.5"></path>
</svg>
</div>
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">Plan Builder</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Compose a plan with 7 bounds. Evaluate against live Token-2022 state, Jupiter routes, and policy limits.
</p>
</div>
</div>
{/* Card 2 */}
<div className="border border-[#dedfe1] rounded-[2px] p-4 bg-white flex flex-col justify-between">
<div>
<div className="h-28 bg-gray-50 border border-gray-100 rounded-[2px] mb-3 overflow-hidden flex items-end">
<svg className="w-full h-full" viewBox="0 0 200 80">
<rect fill="#22c55e" height="30" opacity="0.8" width="8" x="20" y="30"></rect>
<rect fill="#22c55e" height="20" opacity="0.8" width="8" x="35" y="40"></rect>
<rect fill="#ef4444" height="15" opacity="0.8" width="8" x="50" y="50"></rect>
<rect fill="#22c55e" height="40" opacity="0.8" width="8" x="65" y="20"></rect>
<rect fill="#ef4444" height="15" opacity="0.8" width="8" x="80" y="45"></rect>
<rect fill="#22c55e" height="50" opacity="0.8" width="8" x="95" y="10"></rect>
<rect fill="#22c55e" height="30" opacity="0.8" width="8" x="110" y="30"></rect>
<rect fill="#ef4444" height="10" opacity="0.8" width="8" x="125" y="55"></rect>
<rect fill="#22c55e" height="35" opacity="0.8" width="8" x="140" y="25"></rect>
<line stroke="#dedfe1" x1="0" x2="200" y1="60" y2="60"></line>
</svg>
</div>
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">No-Trade Tape</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Append-only ledger of every verdict. Green bars are accepted fills, red bars are refusals with named checks.
</p>
</div>
</div>
{/* Card 3 */}
<div className="border border-[#dedfe1] rounded-[2px] p-4 bg-white flex flex-col justify-between">
<div>
<div className="h-28 bg-gray-50 border border-gray-100 rounded-[2px] mb-3 overflow-hidden flex items-end">
<svg className="w-full h-full" viewBox="0 0 200 80">
<path d="M 10,75 L 30,70 L 40,40 L 50,75 L 80,75 L 90,30 L 100,75 L 140,75 L 150,15 L 160,75 L 190,75" fill="none" stroke="#6366f1" strokeWidth="1.8"></path>
</svg>
</div>
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">Mint Inspector</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Live Token-2022 extension state per xStock mint: multiplier, paused status, permanent delegate, transfer hook.
</p>
</div>
</div>
{/* Card 4 */}
<div className="border border-[#dedfe1] rounded-[2px] p-4 bg-white flex flex-col justify-between">
<div>
<div className="h-28 bg-gray-50 border border-gray-100 rounded-[2px] mb-3 overflow-hidden flex items-end">
<svg className="w-full h-full" viewBox="0 0 200 80">
<path d="M 0,80 Q 50,30 100,60 T 200,20 L 200,80 Z" fill="#93c5fd" opacity="0.3"></path>
<path d="M 0,80 Q 50,45 100,65 T 200,40 L 200,80 Z" fill="#60a5fa" opacity="0.4"></path>
<path d="M 0,80 Q 50,60 100,70 T 200,55 L 200,80 Z" fill="#2563eb" opacity="0.5"></path>
</svg>
</div>
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">Evidence Pack</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Every claim maps to a runnable command. Adversarial tests: tampered tape, stale mirrors, guard-less ablation.
</p>
</div>
</div>
</div>
<div className="text-center mt-6">
<Link className="text-[12px] font-medium text-gray-500 hover:text-black transition-colors underline" href="/plan">
            554 tests passing, 0 failures.
</Link>
</div>
</div>
</div>
</section>
{/* END: FlagshipStudioSection */}

{/* BEGIN: VectorSection */}
<section className="py-24 bg-[#edeff2] border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
<div className="lg:col-span-6 space-y-6">
<div className="flex items-center space-x-1.5 text-sm font-semibold">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-500">guard</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            The Default Answer<br/>Is No.
</h2>
<p className="text-[14px] text-gray-600 leading-relaxed max-w-lg">
            A recurring buy that passes all 7 checks fills normally. A buy that fails any single check is publicly refused. The refusal is the product. A silent retry is unfalsifiable — a public refusal is evidence.
</p>
<div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
<Link className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors" href="/plan">
              Try a plan
</Link>
<Link className="text-[13px] font-medium text-blue-600 hover:underline" href="/tape">
              View the refusal tape →
</Link>
</div>
</div>
{/* Right Vector Framework Preview Mockup */}
<div className="lg:col-span-6 flex justify-center">
<div className="w-full max-w-[440px] bg-white border border-[#dedfe1] p-6 rounded-[2px] shadow-sm">
<div className="flex justify-between items-center text-[10px] text-gray-400 font-mono mb-4">
<span>LAST EVALUATED 2 MIN AGO</span>
<span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
</div>
<div className="flex items-center justify-center space-x-3 py-6">
<span className="w-3.5 h-3.5 rounded-full bg-red-400"></span>
<span className="text-3xl font-extrabold tracking-tight">Trade</span>
<span className="text-3xl font-extrabold tracking-tight text-gray-400">REFUSED</span>
</div>
<div className="grid grid-cols-4 gap-1 py-4 text-[9px] text-center font-mono uppercase tracking-wider text-gray-400">
<div className="bg-gray-100 py-1.5 rounded-[1px]">mint_id</div>
<div className="bg-gray-100 py-1.5 rounded-[1px]">multiplier</div>
<div className="bg-gray-300 text-black font-semibold py-1.5 rounded-[1px]">ref_age</div>
<div className="bg-gray-100 py-1.5 rounded-[1px]">policy</div>
</div>
<div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
<span className="font-medium text-gray-700">TRIPPED CHECK</span>
<span className="text-gray-400 font-mono text-[10px]">reference_regime (47h &gt; 6h)</span>
</div>
</div>
</div>
</div>
{/* Signal Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-white border border-[#dedfe1] p-5 rounded-[2px]">
<div className="text-[13px] font-bold text-gray-900">ACCEPT — all 7 checks passed</div>
<div className="text-[11px] text-gray-500 mt-0.5">TSLAx · slot 447,185,677</div>
<div className="mt-4">
<Link className="text-[12px] font-medium text-blue-600 hover:underline" href="/tape">View on tape →</Link>
</div>
</div>
<div className="bg-white border border-[#dedfe1] p-5 rounded-[2px]">
<div className="text-[13px] font-bold text-gray-900">REFUSE — multiplier_freshness</div>
<div className="text-[11px] text-gray-500 mt-0.5">GOOGLx · slot 447,185,680</div>
<div className="mt-4">
<Link className="text-[12px] font-medium text-orange-600 hover:underline" href="/tape">View on tape →</Link>
</div>
</div>
<div className="bg-white border border-[#dedfe1] p-5 rounded-[2px]">
<div className="text-[13px] font-bold text-gray-900">REFUSE — exit_at_size</div>
<div className="text-[11px] text-gray-500 mt-0.5">NVDAx · slot 447,185,683</div>
<div className="mt-4">
<Link className="text-[12px] font-medium text-orange-600 hover:underline" href="/tape">View on tape →</Link>
</div>
</div>
</div>
</div>
</section>
{/* END: VectorSection */}

{/* BEGIN: NewsletterBanner → Honesty Table */}
<section className="py-16 bg-[#1a1a1a] border-t border-neutral-800 text-white text-center">
<div className="max-w-[1240px] mx-auto px-6">
<div className="max-w-xl mx-auto space-y-4">
<h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
          What is built. What is not. <span className="bg-[#e2e7fc] text-black px-1.5 py-0.5 rounded-[2px]">No ambiguity.</span>
</h3>
<div className="grid grid-cols-3 gap-6 text-left pt-6 text-[12px]">
<div>
<div className="font-bold text-white mb-3 text-[11px] uppercase tracking-wider">Done</div>
<ul className="space-y-2 text-neutral-400">
<li>Reads live mainnet state</li>
<li>Preflight evaluation</li>
<li>554 tests, 0 failures</li>
<li>Anchor program deployed</li>
<li>Plan + fill + refusal on-chain</li>
</ul>
</div>
<div>
<div className="font-bold text-white mb-3 text-[11px] uppercase tracking-wider">Not claimed</div>
<ul className="space-y-2 text-neutral-400">
<li>Real mainnet broadcast</li>
<li>Wallet integration</li>
<li>Production keeper / cron</li>
</ul>
</div>
<div>
<div className="font-bold text-white mb-3 text-[11px] uppercase tracking-wider">Verifiable</div>
<ul className="space-y-2 text-neutral-400">
<li>node --test lib/*.test.mjs</li>
<li>Visit any mint truth card</li>
<li>POST to /api/preflight</li>
<li>View on Solana Explorer</li>
</ul>
</div>
</div>
</div>
</div>
</section>
{/* END: NewsletterBanner */}

{/* BEGIN: Footer */}
<footer className="bg-[#1a1a1a] text-white pt-16 pb-12">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-16 border-b border-neutral-800">
<div className="col-span-2 space-y-4">
<div className="text-xl font-bold tracking-tight text-white">manifest</div>
<div className="flex items-center space-x-4 text-neutral-400 pt-2">
<a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest">
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"></path></svg>
</a>
<a className="hover:text-white transition-colors" href="#">
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
</a>
</div>
</div>
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">Product</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><Link className="hover:text-white transition-colors" href="/plan">Plan builder</Link></li>
<li><Link className="hover:text-white transition-colors" href="/tape">No-Trade Tape</Link></li>
<li><Link className="hover:text-white transition-colors" href="/evidence">Evidence pack</Link></li>
</ul>
</div>
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">On-chain</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><a className="hover:text-white transition-colors" href="https://explorer.solana.com/address/pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA?cluster=devnet">Program</a></li>
<li><a className="hover:text-white transition-colors" href="https://explorer.solana.com/address/rDt5XPbutXYPtMgox2AGepKGtDVvBkuhaHiCgU3oxh3?cluster=devnet">Plan (filled)</a></li>
<li><a className="hover:text-white transition-colors" href="https://explorer.solana.com/address/7hBCzAdqrsNUmQ4VGEvvHjjSGMurQARVB5emjbYHVmsj?cluster=devnet">Refusal receipt</a></li>
</ul>
</div>
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">Inspect</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><Link className="hover:text-white transition-colors" href="/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB">TSLAx mint</Link></li>
<li><Link className="hover:text-white transition-colors" href="/mint/Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh">NVDAx mint</Link></li>
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
