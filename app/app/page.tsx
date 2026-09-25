/* The landing page, ported from the supplied export: the design is the export's,
   the letters are ours. Section map and copy table: docs/PORT.md. */
import QuickRead from "@/components/quick-read";

export default function Page() {
  return (
    <>
{/* BEGIN: MainHeader */}
<header className="sticky top-0 z-50 bg-white border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between">
{/* Brand Logo */}
<div className="flex items-center space-x-10">
<a className="text-xl font-bold tracking-tight text-black flex items-center" href="/">
          manifest
        </a>
</div>
{/* Navigation Links & CTA */}
<div className="flex items-center space-x-8">
<nav className="hidden md:flex items-center space-x-7 text-[13px] font-normal text-gray-700">
<div className="relative group cursor-pointer flex items-center gap-1 hover:text-black transition-colors">
<span>The desk</span>
<svg className="w-3.5 h-3.5 text-gray-500 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
</div>
<a className="hover:text-black transition-colors" href="/issuers">Issuers</a>
<a className="hover:text-black transition-colors" href="/tape">Tape</a>
<a className="hover:text-black transition-colors" href="/evidence">Evidence</a>
</nav>
<a className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors shadow-sm" href="/exit">
          Open the exit desk
        </a>
</div>
</div>
</header>
{/* END: MainHeader */}

{/* BEGIN: HeroSection */}
<section className="bg-[#edeff2] pt-16 pb-20 border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
{/* Left Hero Content */}
<div className="lg:col-span-5 space-y-6">
<h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] text-black">
            Every issuer's
<br/>
            
            exit terms,
<br/>
            read from the mint
          </h1>
<p className="text-[14px] text-gray-600 leading-relaxed max-w-[390px]">
            Built for anyone holding a tokenized position. The desk reads the issuer's own terms out of the mint account, prices your size against the venue's own liquidity, and reports what actually lands instead of what was quoted.</p>
<div className="pt-2">
<a className="inline-flex items-center text-[13px] font-medium text-black hover:underline group" href="/exit">
            Open the exit desk
 
              <span className="ml-1 tracking-normal transition-transform group-hover:translate-x-0.5">→</span>
</a>
</div>
</div>
{/* Right Hero Chart UI Mockup */}
<div className="lg:col-span-7">
<div className="bg-white border border-[#dedfe1] rounded-[2px] shadow-sm p-4 text-[11px]">
{/* Chart Header Controls */}
<div className="flex flex-wrap items-center justify-between pb-3 border-b border-gray-100 gap-2">
<div className="flex items-center space-x-2">
<span className="font-medium text-gray-900 border-b border-black pb-0.5">Fee in force, by size</span>
</div>
<div className="flex items-center space-x-3 text-gray-500">
<button className="flex items-center gap-1 hover:text-gray-900">
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Compare issuers
                </button>
<button className="flex items-center gap-1 hover:text-gray-900">
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Pin reading
                </button>
<button className="flex items-center gap-1 hover:text-gray-900">
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                  Watch the fee
                </button>
</div>
</div>
{/* Chart Filter & Selector Row */}
<div className="py-2.5 flex items-center justify-between">
<div className="flex items-center space-x-2">
<span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-[2px] font-medium text-gray-800 text-[10px]">
<span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 inline-block"></span>
                  Token-2022 exit terms
                </span>
<div className="relative">
<input className="text-[11px] py-0.5 px-2 bg-gray-50 border border-gray-200 rounded-[2px] w-28 text-gray-700"  readOnly type="text" value="fee in force, by size"/>
<svg className="w-3 h-3 text-gray-400 absolute right-1.5 top-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
</div>
</div>
<div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-mono">
<span>FEE</span>
<span className="text-black font-semibold">AMOUNT</span>
<span>PRICE</span>
<span>IMPACT</span>
<span>ALL</span>
</div>
</div>
{/* Chart Visual Area (SVG Layered Area representation) */}
<div className="h-64 w-full bg-white relative overflow-hidden rounded-[2px] border border-gray-100 flex flex-col justify-end">
{/* Grid Lines */}
<div className="absolute inset-0 grid grid-rows-5 grid-cols-6 border-b border-gray-100">
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-r border-gray-50/80"></div>
<div className="border-b border-gray-50/80"></div>
</div>
{/* SVG Wave Chart Graphic */}
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
{/* Layer 1: Base */}
<path d="M 0,240 L 0,80 Q 75,120 150,90 T 300,60 T 450,40 T 600,20 L 600,240 Z" fill="url(#grad-purple)"></path>
{/* Layer 2: Long term */}
<path d="M 0,240 L 0,110 Q 80,140 160,110 T 320,80 T 470,60 T 600,45 L 600,240 Z" fill="url(#grad-blue)"></path>
{/* Layer 3: Mid term */}
<path d="M 0,240 L 0,140 Q 90,170 170,130 T 340,110 T 490,90 T 600,70 L 600,240 Z" fill="url(#grad-yellow)"></path>
{/* Layer 4: Short-mid term */}
<path d="M 0,240 L 0,165 Q 100,195 190,150 T 370,135 T 510,120 T 600,95 L 600,240 Z" fill="url(#grad-amber)"></path>
{/* Layer 5: Short term */}
<path d="M 0,240 L 0,190 Q 110,215 210,180 T 390,160 T 530,145 T 600,125 L 600,240 Z" fill="url(#grad-orange)"></path>
{/* Layer 6: Very short term */}
<path d="M 0,240 L 0,210 Q 120,230 230,205 T 410,185 T 550,170 T 600,155 L 600,240 Z" fill="url(#grad-red)"></path>
{/* Black metric line overlaid */}
<path d="M 0,190 Q 60,160 120,130 T 240,110 T 360,95 T 480,45 T 600,30" fill="none" stroke="#000" strokeWidth="1.5"></path>
</svg>
{/* Timestamp Axis Mockup */}
<div className="flex justify-between text-[9px] text-gray-400 px-3 py-1.5 bg-white border-t border-gray-100 font-mono">
<span>0 BPS</span>
<span>100 BPS</span>
<span>300 BPS</span>
<span>500 BPS</span>
<span>ROUND TRIP</span>
<span>LANDS</span>
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
        Six checks, one command, no trust required
      </p>
{/* Monochrome Partner Logos */}
<div className="flex flex-wrap items-center justify-center gap-12 sm:gap-16 opacity-75 grayscale contrast-125">
<span className="text-sm tracking-widest font-extrabold uppercase font-sans text-gray-900">TOKEN-2022</span>
<div className="flex items-center space-x-1 font-semibold text-sm tracking-wider text-gray-900">
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>
<span className="tracking-tight">READ FROM THE MINT</span>
</div>
<span className="text-sm font-semibold tracking-tight text-gray-900">31 RECEIPT CHECKS</span>
<div className="flex items-center text-sm font-bold text-gray-900">
<span>6 NAMED REFUSALS</span>
<span className="text-[10px] ml-1 uppercase font-normal tracking-widest bg-gray-100 px-1 rounded-[1px]">NO ADMIN KEYS</span>
</div>
<span className="text-sm font-bold tracking-tight text-gray-900">423 TESTS</span>
</div>
</div>
</section>
{/* END: SocialProof */}

{/* BEGIN: UnifiedDataLayer */}
<section className="bg-[#1a1a1a] text-white py-24">
<div className="max-w-[1240px] mx-auto px-6">
{/* Section Heading */}
<div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          The terms that decide whether you can leave
        </h2>
<p className="text-[14px] text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Every tokenized stock carries its issuer's terms inside the mint itself: the fee it charges on a transfer, the change it has already announced, and the epoch that change lands in. The desk reads them there, prices your own size against the venue, and reports the cost of leaving as a number.</p>
</div>
{/* Quantitative Metrics Row */}
<div className="flex justify-center items-center gap-8 sm:gap-16 mb-16 text-center divide-x divide-neutral-800">
<div className="px-4">
<div className="text-2xl sm:text-3xl font-bold tracking-tight">423</div>
<div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">TESTS</div>
</div>
<div className="px-4 pl-8 sm:pl-16">
<div className="text-2xl sm:text-3xl font-bold tracking-tight">31</div>
<div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">RECEIPT CHECKS</div>
</div>
<div className="px-4 pl-8 sm:pl-16">
<div className="text-2xl sm:text-3xl font-bold tracking-tight">6</div>
<div className="text-[10px] tracking-widest font-mono text-gray-400 uppercase mt-1">REFUSALS, NAMED</div>
</div>
</div>
{/* Dual Category Cards: Off-Chain vs On-Chain */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
{/* Card 1: Off-Chain */}
<div className="bg-white text-black p-7 rounded-[2px] flex flex-col justify-between">
<div>
<span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold mb-3 rounded-[2px]">
              ANNOUNCED
            </span>
<h3 className="text-lg font-bold mb-1">The schedule</h3>
<p className="text-[12px] text-gray-600 mb-6 leading-normal">
              What the issuer says it will charge, and the epoch it takes effect. Announced is a promise until the epoch arrives, and the desk treats it as exactly that.</p>
<ul className="text-[12px] space-y-2 border-t border-gray-100 pt-4 text-gray-800">
<li><strong className="font-semibold">Announced</strong> - the fee the issuer says is coming</li>
<li><strong className="font-semibold">In force</strong> - the fee the mint charges right now</li>
<li><strong className="font-semibold">Effective epoch</strong> - when the announced change takes hold</li>
<li><strong className="font-semibold">Transfer fee</strong> - what one move of the token costs</li>
<li><strong className="font-semibold">Permanent delegate</strong> - who can move your tokens without you</li>
<li><strong className="font-semibold">Transfer hook</strong> - code that runs on every transfer</li>
<li><strong className="font-semibold">Extensions</strong> - every Token-2022 extension the mint carries</li>
<li><strong className="font-semibold">Decimals</strong> - the scale every amount is read at</li>
</ul>
</div>
<div className="pt-6 mt-6 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
            Read from the mint account itself. No indexer, no API key, no trusted party.
          </div>
</div>
{/* Card 2: On-Chain */}
<div className="bg-white text-black p-7 rounded-[2px] flex flex-col justify-between">
<div>
<span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white font-semibold mb-3 rounded-[2px]">
              IN FORCE
            </span>
<div className="mb-5">
<h3 className="text-lg font-bold mb-1">What actually leaves</h3>
<p className="text-[12px] text-gray-600 mb-3 leading-normal">
                The fee is charged on the way out, and a round trip is charged twice. These are the four numbers the desk reports instead of a headline price.</p>
<ul className="text-[12px] space-y-1.5 text-gray-800">
<li><strong className="font-semibold">• Withheld</strong> - the amount the vault keeps on the way out</li>
<li><strong className="font-semibold">• Lands</strong> - the amount that reaches your wallet</li>
<li><strong className="font-semibold">• Round trip</strong> - both legs priced, never one</li>
<li><strong className="font-semibold">• Impact</strong> - what your own size does to the price</li>
</ul>
</div>
<div className="border-t border-gray-100 pt-4">
<h3 className="text-base font-bold mb-1">The three routes</h3>
<p className="text-[12px] text-gray-600 mb-3 leading-normal">
                The issuer rarely leaves one door open. The desk prices every route it can see and takes the one that actually carries the position.</p>
<ul className="text-[12px] space-y-1.5 text-gray-800">
<li><strong className="font-semibold">• Pool</strong> - the venue's own liquidity, quoted at your size</li>
<li><strong className="font-semibold">• Across issuers</strong> - two venues, settled in one transaction</li>
<li><strong className="font-semibold">• Issuer redemption</strong> - the issuer's own door, priced like any other</li>
<li><strong className="font-semibold">• Refusal</strong> - a named reason when not one of them works</li>
</ul>
</div>
</div>
<div className="pt-6 mt-6 border-t border-gray-100 text-[10px] text-gray-400 font-sans">
            Measured by the desk's own reads, then checked against the venue's client library.
          </div>
</div>
</div>
{/* Links & Callout Below Cards */}
<div className="text-center mt-12 space-y-3">
<div>
<a className="text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors" href="/verify">
            Read how a reading works →
          </a>
</div>
<p className="text-[12px] text-gray-500">
          You can reach all of it from the <span className="text-gray-300">exit desk</span>, <span className="text-gray-300">tape</span> or <span className="text-gray-300">one command in the repository.</span>.
        </p>
</div>
</div>
</section>
{/* END: UnifiedDataLayer */}

{/* BEGIN: FlagshipStudioSection */}
<section className="py-24 bg-white border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
{/* Studio Intro Header Row */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
<div className="lg:col-span-6 space-y-6">
<div className="flex items-center space-x-1.5 text-sm font-semibold">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-500">desk</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            One route in, three ways out
          </h2>
<p className="text-[14px] text-gray-600 leading-relaxed max-w-lg">
            The desk reads the issuer's own terms out of the mint, prices your size against the venue's own liquidity, and refuses out loud — by name — when there is no exit to take.</p>
<ul className="space-y-3 text-[13px] text-gray-700">
<li className="flex items-start gap-2.5">
<span className="mt-0.5 text-gray-400">⊡</span>
<span>Read the fee schedule from the mint, not from a dashboard someone else keeps.</span>
</li>
<li className="flex items-start gap-2.5">
<span className="mt-0.5 text-gray-400">⊞</span>
<span>Price your own size, at both issuers, against the venue's own quote.</span>
</li>
<li className="flex items-start gap-2.5">
<span className="mt-0.5 text-gray-400">⊠</span>
<span>Every reading produces a receipt you can verify yourself, by command.</span>
</li>
</ul>
<div className="pt-4 flex items-center space-x-5">
<a className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors" href="/exit">
              Open the desk
            </a>
<a className="text-[13px] font-medium text-blue-600 hover:underline" href="/verify">
              See the checks →
            </a>
</div>
</div>
{/* 3D Isometric Data Plane Graphic Mockup */}
<div className="lg:col-span-6 flex justify-center">
<div className="w-full max-w-[480px] h-64 relative flex items-center justify-center">
<svg className="w-full h-full text-blue-500/20" fill="none" viewBox="0 0 400 240">
{/* Isometric Grid Lattice */}
<path d="M 200,20 L 360,110 L 200,200 L 40,110 Z" fill="#f8fafc" stroke="#2563eb" stroke-opacity="0.3" strokeWidth="1.2"></path>
<path d="M 200,50 L 330,125 L 200,180 L 70,125 Z" fill="#ffffff" stroke="#2563eb" stroke-opacity="0.25" strokeWidth="1"></path>
{/* Points & Connections */}
<line stroke="#3b82f6" strokeDasharray="3 3" strokeWidth="1.5" x1="80" x2="200" y1="120" y2="60"></line>
<line stroke="#3b82f6" strokeWidth="1.5" x1="200" x2="320" y1="60" y2="120"></line>
<line stroke="#3b82f6" strokeWidth="1.5" x1="200" x2="200" y1="60" y2="170"></line>
<circle cx="200" cy="60" fill="#2563eb" r="4"></circle>
<circle cx="150" cy="90" fill="#3b82f6" r="3"></circle>
<circle cx="270" cy="100" fill="#1d4ed8" r="3.5"></circle>
<circle cx="200" cy="170" fill="#60a5fa" r="4"></circle>
<circle cx="240" cy="140" fill="#3b82f6" r="2.5"></circle>
{/* Data floating cubes */}
<polygon fill="#3b82f6" fillOpacity="0.6" points="190,40 210,40 210,50 190,50"></polygon>
<polygon fill="#3b82f6" fillOpacity="0.6" points="290,85 305,85 305,95 290,95"></polygon>
</svg>
</div>
</div>
</div>
{/* Studio 4 Metric Cards Carousel Strip */}
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
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">Announced fee</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                The fee the issuer says is coming, and the epoch it takes effect.</p>
</div>
</div>
{/* Card 2 */}
<div className="border border-[#dedfe1] rounded-[2px] p-4 bg-white flex flex-col justify-between">
<div>
<div className="h-28 bg-gray-50 border border-gray-100 rounded-[2px] mb-3 overflow-hidden flex items-end">
<svg className="w-full h-full" viewBox="0 0 200 80">
{/* Green/Red Bars */}
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
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">Fee in force</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                The fee the mint charges right now, read out of the account itself.</p>
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
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">Withheld</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                What the vault keeps when the tokens move, measured on the transfer.</p>
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
<h4 className="text-[13px] font-bold text-gray-900 leading-snug">What lands</h4>
<p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                The amount that reaches your wallet, after every fee in the path.</p>
</div>
</div>
</div>
<div className="text-center mt-6">
<a className="text-[12px] font-medium text-gray-500 hover:text-black transition-colors underline" href="/evidence">
            Six refusals, each published by name.
          </a>
</div>
</div>
</div>
</section>
{/* END: FlagshipStudioSection */}

{/* BEGIN: VectorSection */}
<section className="py-24 bg-[#edeff2] border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
{/* Left Text */}
<div className="lg:col-span-6 space-y-6">
<div className="flex items-center space-x-1.5 text-sm font-semibold">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-500">tape</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Know when a position has an exit.<br/>
            Know when it does not.
          </h2>
<p className="text-[14px] text-gray-600 leading-relaxed max-w-lg">
            Once per reading, the tape prices the position against every route the issuer leaves open and returns one of four answers: pool, across issuers, issuer redemption, or a refusal by name.</p>
<div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
<a className="bg-black text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors" href="/tape">
              Read the tape
            </a>
<a className="text-[13px] font-medium text-blue-600 hover:underline" href="/verify">
              How a reading works →
            </a>
</div>
</div>
{/* Right Vector Framework Preview Mockup */}
<div className="lg:col-span-6 flex justify-center">
<div className="w-full max-w-[440px] bg-white border border-[#dedfe1] p-6 rounded-[2px] shadow-sm">
<div className="flex justify-between items-center text-[10px] text-gray-400 font-mono mb-4">
<span>UPDATED ON EVERY READ</span>
<span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
</div>
{/* Gauge Title / State */}
<div className="flex items-center justify-center space-x-3 py-6">
<span className="w-3.5 h-3.5 rounded-full bg-neutral-400"></span>
<span className="text-3xl font-extrabold tracking-tight">Route</span>
<span className="text-3xl font-extrabold tracking-tight text-gray-400">REFUSED</span>
</div>
{/* Segmented Gauge Bar */}
<div className="grid grid-cols-4 gap-1 py-4 text-[9px] text-center font-mono uppercase tracking-wider text-gray-400">
<div className="bg-gray-300 text-black font-semibold py-1.5 rounded-[1px]">Refused</div>
<div className="bg-gray-100 py-1.5 rounded-[1px]">Redemption</div>
<div className="bg-gray-100 py-1.5 rounded-[1px]">Across issuers</div>
<div className="bg-gray-100 py-1.5 rounded-[1px]">Pool</div>
</div>
<div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
<span className="font-medium text-gray-700">IT REFUSED THE LAST ONE</span>
<span className="text-gray-400 font-mono text-[10px]">an announced change, not yet in force</span>
</div>
</div>
</div>
</div>
{/* Vector Signal Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/* Signal 1 */}
<div className="bg-white border border-[#dedfe1] p-5 rounded-[2px]">
<div className="text-[13px] font-bold text-gray-900">Pool · real liquidity</div>
<div className="text-[11px] text-gray-500 mt-0.5">quoted at the size you hold</div>
<div className="mt-4">
<a className="text-[12px] font-medium text-blue-600 hover:underline" href="/exit">Learn more →</a>
</div>
</div>
{/* Signal 2 */}
<div className="bg-white border border-[#dedfe1] p-5 rounded-[2px]">
<div className="text-[13px] font-bold text-gray-900">Across issuers · one transaction</div>
<div className="text-[11px] text-gray-500 mt-0.5">two venues, one confirmation</div>
<div className="mt-4">
<a className="text-[12px] font-medium text-orange-600 hover:underline" href="/exit">Learn more →</a>
</div>
</div>
{/* Signal 3 */}
<div className="bg-white border border-[#dedfe1] p-5 rounded-[2px] opacity-70">
<div className="text-[13px] font-bold text-gray-900">A second issuer, once one exists</div>
<div className="text-[11px] text-gray-500 mt-0.5">not observed at this mint yet</div>
<div className="mt-4 text-[12px] text-gray-500 flex items-center gap-1 font-mono">
<span>Not observed</span>
<span>⏳</span>
</div>
</div>
</div>
</div>
</section>
{/* END: VectorSection */}

{/* BEGIN: ResearchSection */}
<section className="py-24 bg-[#1a1a1a] text-white">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
{/* Left Wireframe Visualization Graphic */}
<div className="lg:col-span-6 flex justify-center">
<div className="w-full max-w-[440px] h-64 relative flex items-center justify-center">
<svg className="w-full h-full text-neutral-600" fill="none" viewBox="0 0 320 200">
{/* Dark 3D Mesh Ribbons */}
<path d="M 20,160 L 100,100 L 220,140 L 300,80" stroke="#404040" strokeWidth="1"></path>
<path d="M 20,140 L 100,80 L 220,120 L 300,60" stroke="#525252" strokeWidth="1"></path>
<path d="M 20,120 L 100,60 L 220,100 L 300,40" stroke="#737373" strokeWidth="1"></path>
{/* Cross meshes */}
<line stroke="#404040" strokeWidth="1" x1="20" x2="20" y1="160" y2="120"></line>
<line stroke="#525252" strokeWidth="1" x1="100" x2="100" y1="100" y2="60"></line>
<line stroke="#525252" strokeWidth="1" x1="220" x2="220" y1="140" y2="100"></line>
<line stroke="#737373" strokeWidth="1" x1="300" x2="300" y1="80" y2="40"></line>
{/* Subtle glow line */}
<path d="M 20,130 Q 110,40 180,90 T 300,30" stroke="#2563eb" stroke-opacity="0.7" strokeWidth="1.5"></path>
</svg>
</div>
</div>
{/* Right Content */}
<div className="lg:col-span-6 space-y-6">
<div className="flex items-center space-x-1.5 text-sm font-semibold">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-400">evidence</span>
</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Every claim in this project,<br/>
            checkable by command
          </h2>
<p className="text-[14px] text-gray-400 leading-relaxed max-w-lg">
            None of these numbers are prose. Each one is produced by a command you can run yourself: the receipt check, the clone, the comparison, and the ablation that shows what the naive read misses.</p>
<div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
<a className="border border-neutral-600 text-white text-[13px] font-medium px-4 py-2 rounded-[2px] hover:bg-neutral-800 transition-colors" href="/evidence">
              Read the evidence
            </a>
<a className="text-[13px] font-medium text-blue-400 hover:underline" href="/verify">
              Run the checks →
            </a>
</div>
</div>
</div>
{/* Top-tier Collaborations Subheading */}
<div className="text-center mb-12">
<h3 className="text-xl font-bold tracking-tight text-white">What can be checked, and what can be refused</h3>
</div>
{/* 4 Collaborative Report Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
{/* Report 1 */}
<div className="bg-neutral-900 border border-neutral-800 rounded-[2px] overflow-hidden flex flex-col">
<div className="h-32 bg-neutral-950 p-4 border-b border-neutral-800 flex flex-col justify-between">
<span className="text-[9px] font-mono uppercase text-neutral-400">PROOF</span>
<div className="text-[12px] font-semibold text-white tracking-tight">manifest · receipts</div>
</div>
<div className="p-4 flex-1 flex flex-col justify-between">
<div>
<h4 className="text-[13px] font-bold text-white mb-2 leading-snug">Every address in the repository, resolved</h4>
<p className="text-[11px] text-neutral-400 leading-relaxed">
                Each mint, pool and account quoted in this repository is resolved and compared. Clean state passes all 31 checks; one changed character fails.</p>
</div>
</div>
</div>
{/* Report 2 */}
<div className="bg-neutral-900 border border-neutral-800 rounded-[2px] overflow-hidden flex flex-col">
<div className="h-32 bg-neutral-950 p-4 border-b border-neutral-800 flex flex-col justify-between">
<span className="text-[9px] font-mono uppercase text-neutral-400">PROOF</span>
<div className="text-[12px] font-semibold text-white tracking-tight">manifest · clone</div>
</div>
<div className="p-4 flex-1 flex flex-col justify-between">
<div>
<h4 className="text-[13px] font-bold text-white mb-2 leading-snug">Real network state, held in a validator</h4>
<p className="text-[11px] text-neutral-400 leading-relaxed">
                The accounts are pulled into a local validator and compared byte for byte against the live ones: 13 checks, and a tampered fixture that must fail.</p>
</div>
</div>
</div>
{/* Report 3 */}
<div className="bg-neutral-900 border border-neutral-800 rounded-[2px] overflow-hidden flex flex-col">
<div className="h-32 bg-neutral-950 p-4 border-b border-neutral-800 flex flex-col justify-between">
<span className="text-[9px] font-mono uppercase text-neutral-400">PROOF</span>
<div className="text-[12px] font-semibold text-white tracking-tight">manifest · comparison</div>
</div>
<div className="p-4 flex-1 flex flex-col justify-between">
<div>
<h4 className="text-[13px] font-bold text-white mb-2 leading-snug">One company, priced at both issuers</h4>
<p className="text-[11px] text-neutral-400 leading-relaxed">
                The same size at each venue, with the spot price set against what actually lands after the fee in force — and the difference between them.</p>
</div>
</div>
</div>
{/* Report 4 */}
<div className="bg-neutral-900 border border-neutral-800 rounded-[2px] overflow-hidden flex flex-col">
<div className="h-32 bg-neutral-950 p-4 border-b border-neutral-800 flex flex-col justify-between">
<span className="text-[9px] font-mono uppercase text-neutral-400">PROOF</span>
<div className="text-[12px] font-semibold text-white tracking-tight">manifest · ablation</div>
</div>
<div className="p-4 flex-1 flex flex-col justify-between">
<div>
<h4 className="text-[13px] font-bold text-white mb-2 leading-snug">What the naive read gets wrong</h4>
<p className="text-[11px] text-neutral-400 leading-relaxed">
                Reading an announced fee as if it were already in force overstates an exit by 39.2 million on a billion. That is the gap the desk refuses to close with a guess.</p>
</div>
</div>
</div>
</div>
</div>
</section>
{/* END: ResearchSection */}

{/* BEGIN: NewsletterBanner */}
<section className="py-16 bg-[#1a1a1a] border-t border-neutral-800 text-white text-center">
<div className="max-w-[1240px] mx-auto px-6">
<div className="max-w-xl mx-auto space-y-4">
<h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Paste a mint, <span className="bg-[#e2e7fc] text-black px-1.5 py-0.5 rounded-[2px]">read its terms</span>
        </h3>
<p className="text-[13px] text-neutral-400">
          No account, no email, no key. The read happens on the mint you paste, out of the account itself.</p>
{/* Flush Form Input */}
<QuickRead />
<p className="text-[10px] text-neutral-500 pt-1">
          Nothing is stored and nothing is signed. The page you land on performs the read.
        </p>
</div>
</div>
</section>
{/* END: NewsletterBanner */}

{/* BEGIN: PillarsSection */}
<section className="py-24 bg-[#edeff2] border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
<div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
<h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
          Tokenized equity solved the way in.<br/>
          Here's what happens when you want out.
        </h2>
</div>
{/* 5 Pillars Layout: Top Row 3, Bottom Row 2 */}
<div className="space-y-12">
{/* Top 3 Items */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
{/* Pillar 1 */}
<div className="flex flex-col items-center space-y-3">
<div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700">
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
</div>
<h4 className="text-[14px] font-bold text-gray-900">Read from the mint</h4>
<p className="text-[12px] text-gray-600 leading-relaxed max-w-xs">
              The fee schedule, the extensions and the delegate are read from the mint account itself. No indexer, no third party, nothing taken on faith.</p>
</div>
{/* Pillar 2 */}
<div className="flex flex-col items-center space-y-3">
<div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700">
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
</div>
<h4 className="text-[14px] font-bold text-gray-900">Priced at your size</h4>
<p className="text-[12px] text-gray-600 leading-relaxed max-w-xs">
              Quoted against the venue's own liquidity at the amount you actually hold, not at a headline price somewhere else.</p>
</div>
{/* Pillar 3 */}
<div className="flex flex-col items-center space-y-3">
<div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700">
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
</div>
<h4 className="text-[14px] font-bold text-gray-900">Both legs, not one</h4>
<p className="text-[12px] text-gray-600 leading-relaxed max-w-xs">
              Leaving and coming back are charged separately. The desk prices the round trip and shows the difference it makes.</p>
</div>
</div>
{/* Bottom 2 Items */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center max-w-2xl mx-auto">
{/* Pillar 4 */}
<div className="flex flex-col items-center space-y-3">
<div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700">
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
</div>
<h4 className="text-[14px] font-bold text-gray-900">Refused by name</h4>
<p className="text-[12px] text-gray-600 leading-relaxed max-w-xs">
              When no route can carry the position, the desk refuses and publishes the reason. Six refusals, each one a name rather than a shrug.</p>
</div>
{/* Pillar 5 */}
<div className="flex flex-col items-center space-y-3">
<div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700">
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
</div>
<h4 className="text-[14px] font-bold text-gray-900">No admin keys</h4>
<p className="text-[12px] text-gray-600 leading-relaxed max-w-xs">
              The program's authority cannot move a user's tokens. The desk reads state, prices it, and publishes what it read.</p>
</div>
</div>
</div>
</div>
</section>
{/* END: PillarsSection */}

{/* BEGIN: SolutionsComparison */}
<section className="py-24 bg-white border-b border-[#dedfe1]">
<div className="max-w-[1240px] mx-auto px-6">
<div className="text-center max-w-xl mx-auto mb-16 space-y-2">
<h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
          An exit needs three answers at once.<br/>
          This is what the desk returns.
        </h2>
</div>
{/* 3 Product Cards Strip */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/* Product 1: Studio */}
<div className="bg-gray-50 border border-[#dedfe1] rounded-[2px] p-6 flex flex-col justify-between">
<div>
<div className="flex items-center space-x-1.5 text-sm font-semibold mb-2">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-500">terms</span>
</div>
<h3 className="text-base font-bold text-gray-900 mb-2">What the mint says</h3>
<p className="text-[12px] text-gray-600 leading-relaxed mb-4">
              The issuer's own terms, read out of the account: the fee in force, the change already announced, and the epoch that change lands in.</p>
<div className="mb-6">
<a className="text-[12px] font-semibold text-blue-600 hover:underline" href="/exit">Open the desk →</a>
</div>
</div>
{/* Mini UI Mockup Studio */}
<div className="bg-white border border-gray-200 rounded-[2px] p-3 text-[10px] space-y-2 shadow-sm">
<div className="flex items-center space-x-2 pb-2 border-b border-gray-100 text-gray-500">
<span className="font-medium text-black">Transfer fee</span>
<span>Announced</span>
<span>In force</span>
<span>Extensions</span>
</div>
<div className="h-16 bg-gray-50 rounded-[1px] flex items-center justify-center text-gray-400 font-mono text-[9px]">
              [ Read from the mint account ]
            </div>
</div>
</div>
{/* Product 2: Research */}
<div className="bg-gray-50 border border-[#dedfe1] rounded-[2px] p-6 flex flex-col justify-between">
<div>
<div className="flex items-center space-x-1.5 text-sm font-semibold mb-2">
<span className="font-bold">manifest</span>
<span className="font-light text-gray-400">price</span>
</div>
<h3 className="text-base font-bold text-gray-900 mb-2">What your size does</h3>
<p className="text-[12px] text-gray-600 leading-relaxed mb-4">
              Your own amount set against the venue's liquidity, with the impact and the round trip shown as numbers rather than adjectives.</p>
<div className="mb-6">
<a className="text-[12px] font-semibold text-blue-600 hover:underline" href="/exit">Price a position →</a>
</div>
</div>
{/* Mini UI Mockup Research */}
<div className="bg-neutral-900 text-white rounded-[2px] p-3 text-[10px] space-y-2 shadow-sm">
<div className="text-[9px] font-mono text-neutral-400">The tape</div>
<div className="h-16 bg-neutral-800 rounded-[1px] p-2 flex items-center justify-between text-[9px] text-neutral-300">
<span className="font-bold">Pool<br/>Across issuers</span>
<span className="text-[8px] text-neutral-500 font-mono">Every read</span>
</div>
</div>
</div>
{/* Product 3: Vector */}
<div className="bg-[#eef2ff] border border-blue-100 rounded-[2px] p-6 flex flex-col justify-between">
<div>
<div className="flex items-center space-x-1.5 text-sm font-semibold mb-2">
<span className="font-bold">manifest</span>
<span className="font-light text-blue-600">refusal</span>
</div>
<h3 className="text-base font-bold text-gray-900 mb-2">When there is no exit, say so</h3>
<p className="text-[12px] text-gray-600 leading-relaxed mb-4">
              If no route can carry the position, the desk returns a named refusal instead of an invented number.</p>
<div className="mb-6">
<a className="text-[12px] font-semibold text-blue-600 hover:underline" href="/evidence">Read the refusals →</a>
</div>
</div>
{/* Mini UI Mockup Vector */}
<div className="bg-white border border-blue-100 rounded-[2px] p-3 text-[10px] space-y-2 shadow-sm">
<div className="flex justify-between items-center text-[8px] text-gray-400 font-mono">
<span>REFUSED</span>
<span>Named reason</span>
</div>
<div className="h-16 bg-gray-50 rounded-[1px] flex flex-col items-center justify-center">
<span className="text-xs font-bold text-gray-800">REFUSED</span>
<span className="text-[8px] text-gray-400 mt-0.5 font-mono">READING SCHEDULE CHANGED</span>
</div>
</div>
</div>
</div>
</div>
</section>
{/* END: SolutionsComparison */}

{/* BEGIN: Footer */}
<footer className="bg-[#1a1a1a] text-white pt-16 pb-12">
<div className="max-w-[1240px] mx-auto px-6">
<div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-16 border-b border-neutral-800">
{/* Left Logo & Social Icons */}
<div className="col-span-2 space-y-4">
<div className="text-xl font-bold tracking-tight text-white">
            manifest
          </div>
{/* Social Icons */}
<div className="flex items-center space-x-4 text-neutral-400 pt-2">
{/* Github */}
<a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest" target="_blank" rel="noopener">
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"></path></svg>
</a>
{/* X */}
<a className="hover:text-white transition-colors" href="https://x.com/KomariS18774" target="_blank" rel="noopener">
<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
</a>
{/* accounts we do not have are not linked */}
</div>
</div>
{/* Col 1: Use cases */}
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">The desk</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><a className="hover:text-white transition-colors" href="/exit">Exit desk</a></li>
<li><a className="hover:text-white transition-colors" href="/issuers">Issuers</a></li>
<li><a className="hover:text-white transition-colors" href="/tape">Tape</a></li>
</ul>
</div>
{/* Col 2: Resources */}
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">The read</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><a className="hover:text-white transition-colors" href="/evidence">Evidence</a></li>
<li><a className="hover:text-white transition-colors" href="/verify">Verification</a></li>
<li><a className="hover:text-white transition-colors" href="/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB">Mint inspector</a></li>
<li><a className="hover:text-white transition-colors" href="/evidence">Named refusals</a></li>
<li><a className="hover:text-white transition-colors" href="/verify">Checks</a></li>
</ul>
</div>
{/* Col 3: About us */}
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">The source</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest">Repository</a></li>
<li><a className="hover:text-white transition-colors" href="https://github.com/subheeksh5599/manifest/commits/main">Commits</a></li>
</ul>
</div>
{/* Col 4: Legal */}
<div className="space-y-3">
<h5 className="text-[12px] font-bold uppercase tracking-wider text-white">Status</h5>
<ul className="space-y-2 text-[12px] text-neutral-400">
<li><span className="hover:text-white transition-colors">Reads live and test networks</span></li>
<li><span className="hover:text-white transition-colors">Deployed and exercised on a public testnet</span></li>
<li><span className="hover:text-white transition-colors">No admin keys over user funds</span></li>
<li><span className="hover:text-white transition-colors">Every claim produced by a command</span></li>
</ul>
</div>
</div>
{/* Copyright Sub-Footer */}
<div className="pt-8 text-center text-[11px] text-neutral-500">
        © 2026 manifest.
      </div>
</div>
</footer>
{/* END: Footer */}

    </>
  );
}
