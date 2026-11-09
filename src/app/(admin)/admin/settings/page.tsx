"use client";

import * as React from "react";
import {
  Settings,
  Database,
  Shield,
  Key,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
  Activity,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const [resumeModel, setResumeModel] = React.useState("rule-based-nlp-v2");
  const [similarityThreshold, setSimilarityThreshold] = React.useState("85");
  const [duplicateAutoFlag, setDuplicateAutoFlag] = React.useState(true);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  React.useEffect(() => {
    // Mock or load audit logs
    setAuditLogs([
      {
        id: "log_1",
        action: "OPPORTUNITY_MODERATED",
        performedBy: "usr_admin_demo",
        details: "Listing TechCorp Frontend Engineer approved for publication",
        timestamp: "2026-11-09T08:15:00.000Z",
      },
      {
        id: "log_2",
        action: "INSTITUTION_VERIFIED",
        performedBy: "usr_admin_demo",
        details: "St. Jude Polytechnic accredited status verified after institutional license check",
        timestamp: "2026-11-09T08:00:00.000Z",
      },
      {
        id: "log_3",
        action: "SYSTEM_CONFIG_UPDATED",
        performedBy: "usr_admin_demo",
        details: "Duplicate detection threshold configured to 85% string similarity",
        timestamp: "2026-11-08T16:30:00.000Z",
      },
    ]);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Platform Configuration</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            Data Sources & System Settings
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Configure isolated service engines, duplicate detection sensitivity, and inspect administrative audit logs.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          System configuration saved and synced across microservice gateways!
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <h2 className="font-heading text-base font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
          <Server className="size-4 text-sand" />
          Intelligence Engine Connectors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Resume Intelligence Parser Engine
            </label>
            <select
              value={resumeModel}
              onChange={(e) => setResumeModel(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-border bg-card text-foreground"
            >
              <option value="rule-based-nlp-v2">Rule-Based NLP & Quality Checker (Isolated Engine)</option>
              <option value="neural-ats-v3">Neural ATS Vector Parser (Cloud Fallback)</option>
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Isolated service module at /lib/services/resume-parser
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Duplicate Opportunity Threshold (%)
            </label>
            <Input
              type="number"
              min="50"
              max="100"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Triggers warning banner on recruiter creation when similarity exceeds this score
            </p>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={duplicateAutoFlag}
              onChange={(e) => setDuplicateAutoFlag(e.target.checked)}
              className="rounded-sm border-border text-sand focus:ring-sand"
            />
            <span>Enable real-time duplicate warning during recruiter opportunity draft creation</span>
          </label>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button
            type="submit"
            className="bg-sand hover:bg-sand/90 text-ink font-semibold rounded-full text-xs"
          >
            <Save className="size-3.5 mr-1.5" />
            Save Platform Settings
          </Button>
        </div>
      </form>

      {/* Administrative Audit Logs Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-4 text-sand" />
            <h2 className="font-heading font-bold text-base text-foreground">
              Administrative Audit Logs Telemetry
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{auditLogs.length} events logged</span>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Admin Performer</th>
                  <th className="py-3 px-4">Audit Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-ink/[0.01]">
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{log.performedBy}</td>
                    <td className="py-3 px-4 text-foreground">{log.details}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
