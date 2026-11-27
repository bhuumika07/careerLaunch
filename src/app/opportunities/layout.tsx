import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { Role } from "@/components/dashboard/nav-config";

export default async function OpportunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // STRICT SECURITY INVARIANT: Validate real active session from database
  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/login?redirect=/opportunities");
  }

  const role: Role = auth.user.role === "admin" ? "admin" : "student";
  return (
    <DashboardLayout role={role} title="Explore Opportunities">
      {children}
    </DashboardLayout>
  );
}
