import { loadRegistry } from "@/lib/registry";
import ExitDesk from "@/components/exit-desk";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

export default function ExitPage() {
  const entries = loadRegistry();
  return (
    <DashboardLayout active="exit">
      <ExitDesk entries={entries} />
    </DashboardLayout>
  );
}
