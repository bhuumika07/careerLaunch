"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminVerificationsPage() {
  const [recruiters, setRecruiters] = React.useState<any[]>([]);
  const [institutions, setInstitutions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rejectModalItem, setRejectModalItem] = React.useState<{ userId: string; type: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const fetchVerifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/verifications");
      const data = await res.json();
      if (data.success) {
        setRecruiters(data.pendingRecruiters || []);
        setInstitutions(data.pendingInstitutions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleApprove = async (userId: string, type: "recruiter" | "institution", name: string) => {
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type, decision: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Verified ${name} successfully! Account granted full publishing access.`);
        fetchVerifications();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem || !rejectionReason.trim()) return;
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: rejectModalItem.userId,
          type: rejectModalItem.type,
          decision: "reject",
          reason: rejectionReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Verification for ${rejectModalItem.name} rejected with reason logged.`);
        setRejectModalItem(null);
        setRejectionReason("");
        fetchVerifications();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Trust & Verification</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Company & Institution Verification Queues
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Review corporate credentials, university accreditation licenses, and authorized contact attestations.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Recruiter Verification Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-sand" />
            <h2 className="font-heading font-bold text-base text-foreground">
              Corporate Employers & Recruiters Queue
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{recruiters.length} entities</span>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Company Name</th>
                  <th className="py-3.5 px-4">Official Contact</th>
                  <th className="py-3.5 px-4">Industry & Website</th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recruiters.map((rec) => (
                  <tr key={rec.userId} className="hover:bg-ink/[0.01]">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {rec.companyName}
                      <div className="text-[10px] text-muted-foreground font-normal">{rec.recruiterDesignation}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-foreground">{rec.userName}</div>
                      <div className="text-[10px] text-muted-foreground">{rec.officialEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-foreground">{rec.industry}</div>
                      <a href={rec.website} target="_blank" rel="noreferrer" className="text-[10px] text-sand hover:underline inline-flex items-center gap-0.5">
                        {rec.website} <ExternalLink className="size-2.5" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          rec.verificationStatus === "verified"
                            ? "bg-success/15 text-success"
                            : rec.verificationStatus === "rejected"
                            ? "bg-danger/15 text-danger"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {rec.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {rec.verificationStatus !== "verified" ? (
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(rec.userId, "recruiter", rec.companyName)}
                            className="h-7 text-[10px] bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRejectModalItem({
                                userId: rec.userId,
                                type: "recruiter",
                                name: rec.companyName,
                              })
                            }
                            className="h-7 text-[10px] border-danger text-danger hover:bg-danger/10 rounded-full"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-success font-semibold flex items-center justify-end gap-1">
                          <ShieldCheck className="size-3.5" /> Verified Partner
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Institution Verification Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-sand" />
            <h2 className="font-heading font-bold text-base text-foreground">
              Colleges & Higher Education Institutions Queue
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{institutions.length} entities</span>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Institution Name</th>
                  <th className="py-3.5 px-4">Dean / Administrator</th>
                  <th className="py-3.5 px-4">Accreditation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {institutions.map((inst) => (
                  <tr key={inst.userId} className="hover:bg-ink/[0.01]">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {inst.name}
                      <div className="text-[10px] text-muted-foreground font-normal">{inst.location}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-foreground">{inst.adminName}</div>
                      <div className="text-[10px] text-muted-foreground">{inst.adminDesignation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {inst.accreditation || "Pending Verification"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inst.verificationStatus === "verified"
                            ? "bg-success/15 text-success"
                            : inst.verificationStatus === "rejected"
                            ? "bg-danger/15 text-danger"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {inst.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inst.verificationStatus !== "verified" ? (
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(inst.userId, "institution", inst.name)}
                            className="h-7 text-[10px] bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRejectModalItem({
                                userId: inst.userId,
                                type: "institution",
                                name: inst.name,
                              })
                            }
                            className="h-7 text-[10px] border-danger text-danger hover:bg-danger/10 rounded-full"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-success font-semibold flex items-center justify-end gap-1">
                          <ShieldCheck className="size-3.5" /> Accredited Institution
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* REJECT MODAL (Prompt 9 requirement: mandatory reason) */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-foreground border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-foreground">
                Reject Verification Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="size-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed">
              Please specify the compliance reason for rejecting{" "}
              <span className="font-bold text-foreground">{rejectModalItem.name}</span>. This reason will be
              sent directly to the organization administrator.
            </div>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete institutional documentation or unofficial domain address provided..."
              className="w-full text-xs p-3 rounded-xl border border-border bg-ink/5 text-foreground focus:outline-hidden focus:border-sand"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="bg-danger hover:bg-danger/90 text-white font-semibold text-xs rounded-full"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
