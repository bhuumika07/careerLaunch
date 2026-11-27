export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/login");
  }
  if (auth.user.role !== "admin" && auth.user.onboardingCompleted === false) {
    redirect("/onboarding");
  }

  return <DashboardLayout role="student">{children}</DashboardLayout>;
}
