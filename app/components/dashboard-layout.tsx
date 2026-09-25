import { ReactNode } from "react";

/**
 * The dashboards carry no navigation and no mark: the landing page is where the
 * destinations live, and every screen past it is one subject at a time.
 */
export default function DashboardLayout({ children }: { children: ReactNode; active?: string }) {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div className="gn-main">{children}</div>
    </div>
  );
}
