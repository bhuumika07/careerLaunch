"use client";

import React from "react";
import { CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";

export interface UploadStepperProps {
  status: {
    uploaded: boolean;
    validated: boolean;
    extracted: boolean;
    parsed: boolean;
    ready: boolean;
    error: string | null;
  };
}

const STEPS = [
  { key: "uploaded", label: "File Uploaded" },
  { key: "validated", label: "Format Validated" },
  { key: "extracted", label: "Text Extracted" },
  { key: "parsed", label: "Skills & Experience Parsed" },
  { key: "ready", label: "Portfolio Ready" },
] as const;

export function UploadStepper({ status }: UploadStepperProps) {
  return (
    <div className="mt-6 p-6 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Processing Pipeline
      </h3>

      {status.error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Processing Error</p>
            <p className="text-xs mt-0.5">{status.error}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const isDone = Boolean(status[step.key as keyof typeof status]);
          const isPreviousDone =
            idx === 0 || Boolean(status[STEPS[idx - 1].key as keyof typeof status]);
          const isCurrent = isPreviousDone && !isDone && !status.error;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-slate-800 dark:text-slate-200 font-medium"
                    : isCurrent
                    ? "text-sky-600 dark:text-sky-400 font-medium"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
