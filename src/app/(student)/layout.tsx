export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="student">{children}</DashboardLayout>;
}
