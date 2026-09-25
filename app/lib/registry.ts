import fs from "node:fs";
import path from "node:path";

export type RegistryEntry = {
  mint: string;
  symbol: string;
  name: string;
  /** Who issued it. The exit terms differ by issuer, so this is the axis. */
  issuer: string;
  decimals: number;
  issuer_program: string;
};

export function loadRegistry(): RegistryEntry[] {
  const p = path.join(process.cwd(), "data", "registry.json");
  const raw = fs.readFileSync(p, "utf8");
  return (JSON.parse(raw).entries as RegistryEntry[]) ?? [];
}
