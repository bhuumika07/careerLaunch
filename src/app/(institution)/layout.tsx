import * as React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function InstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="institution">{children}</DashboardLayout>;
}
