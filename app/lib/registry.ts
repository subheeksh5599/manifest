import fs from "node:fs";
import path from "node:path";

export type RegistryEntry = {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  issuer_program: string;
  permanent_delegate: string | null;
  transfer_hook_authority: string | null;
  slot_read: number;
};

export function loadRegistry(): RegistryEntry[] {
  const p = path.join(process.cwd(), "data", "registry.json");
  const raw = fs.readFileSync(p, "utf8");
  return (JSON.parse(raw).entries as RegistryEntry[]) ?? [];
}
