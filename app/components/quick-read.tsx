"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The export's newsletter band, made real: it takes a mint address and performs
 * a read instead of collecting an email it has nowhere to send.
 */
export default function QuickRead() {
  const [mint, setMint] = useState("");
  const router = useRouter();

  return (
    <form
      className="pt-4 flex flex-col sm:flex-row max-w-md mx-auto gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = mint.trim();
        if (!value) return;
        router.push(`/mint/${encodeURIComponent(value)}`);
      }}
    >
      <input
        className="flex-1 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 text-[13px] px-3.5 py-2.5 rounded-[2px] focus:outline-none focus:border-white"
        placeholder="Mint address"
        required
        value={mint}
        onChange={(e) => setMint(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      <button
        className="bg-white text-black hover:bg-neutral-200 text-[13px] font-medium px-4 py-2.5 rounded-[2px] whitespace-nowrap transition-colors"
        type="submit"
      >
        Read the exit terms
      </button>
    </form>
  );
}
