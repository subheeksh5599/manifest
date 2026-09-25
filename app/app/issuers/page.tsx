import IssuerBoard from "@/components/issuer-board";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

export default function IssuersPage() {
  return (
    <DashboardLayout active="issuers">
      <IssuerBoard />
    </DashboardLayout>
  );
}
