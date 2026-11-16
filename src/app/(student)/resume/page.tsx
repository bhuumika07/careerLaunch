// src/app/(student)/resume/page.tsx

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { ResumeUploadClient } from "@/components/resume/ResumeUploadClient";

export const dynamic = "force-dynamic";

export default async function ResumeUploadPage() {
  let auth;
  try {
    auth = await requireRole(["student"]);
  } catch {
    redirect("/login?redirect=/resume");
  }

  return <ResumeUploadClient studentId={auth.user.id} />;
}
