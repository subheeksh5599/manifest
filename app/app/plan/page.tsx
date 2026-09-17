import { loadRegistry } from "@/lib/registry";
import PlanBuilder from "@/components/plan-builder";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const entries = loadRegistry();
  return (
    <DashboardLayout active="plans">
      <PlanBuilder entries={entries} />
    </DashboardLayout>
  );
}