import { loadRegistry } from "@/lib/registry";
import ExitDesk from "@/components/exit-desk";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

/**
 * The desk takes its opening state from the URL, so a reading can be linked to
 * and re-verified by someone else rather than described in prose.
 */
export default async function ExitPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const entries = loadRegistry();
  return (
    <DashboardLayout active="exit">
      <ExitDesk entries={entries} initialMint={pick(sp.mint)} initialSize={pick(sp.size)} />
    </DashboardLayout>
  );
}
