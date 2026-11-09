import * as React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="faculty">{children}</DashboardLayout>;
}
