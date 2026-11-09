import * as React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="recruiter">{children}</DashboardLayout>;
}
