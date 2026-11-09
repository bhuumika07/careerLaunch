"use client";

import * as React from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  Info,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Badge } from "@/components/ui/badge";
import { ResumeRecord } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function StudentResumePage() {
  const [resumes, setResumes] = React.useState<ResumeRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadStepText, setUploadStepText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load existing resumes
  const fetchResumes = React.useCallback(async () => {
    try {
      const res = await fetch("/api/resume");
      const data = await res.json();
      if (res.ok && data.success) {
        setResumes(data.resumes);
      }
    } catch {
      setError("Failed to load your resume portfolio.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setError(null);
    setSuccessMessage(null);

    // 1. Validation
    const validExtensions = [".pdf", ".docx"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      setError("Unsupported format. Please upload a PDF (.pdf) or Word document (.docx).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit. Please upload a smaller document.");
      return;
    }

    // 2. Simulated multi-step parsing progress
    setUploading(true);
    setUploadProgress(15);
    setUploadStepText("Reading document text streams...");

    await new Promise((r) => setTimeout(r, 600));
    setUploadProgress(45);
    setUploadStepText("Parsing sections (Education, Projects, Skills)...");

    await new Promise((r) => setTimeout(r, 650));
    setUploadProgress(78);
    setUploadStepText("Running rule-based quality evaluation & ATS compatibility audit...");

    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || (fileExt === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
          rawText: `Sample parsed content for ${file.name} detailing technical proficiencies in TypeScript, Next.js, React, Node.js, and distributed architectures.`,
          isPrimary: resumes.length === 0,
        }),
      });

      const data = await res.json();
      setUploadProgress(100);
      setUploadStepText("Analysis finalized!");

      await new Promise((r) => setTimeout(r, 400));

      if (res.ok && data.success) {
        setSuccessMessage(`"${file.name}" analyzed successfully! View the 4-section breakdown below.`);
        fetchResumes();
      } else {
        setError(data.error || "Failed to process resume.");
      }
    } catch {
      setError("Network error occurred during resume analysis.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your portfolio?`)) return;

    try {
      const res = await fetch(`/api/resume/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setResumes((prev) => prev.filter((r) => r.id !== id));
        setSuccessMessage(`"${name}" removed successfully.`);
      } else {
        setError(data.error || "Failed to remove resume.");
      }
    } catch {
      setError("Network error occurred.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <FileText className="size-7 text-[#C4A885]" />
            Resume Intelligence & Upload
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Upload your resume to receive an indicative quality assessment, ATS parsing insights, and side-by-side profile prefilling with explicit approval.
          </p>
        </div>

        {/* ATS Disclaimer Chip */}
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 text-xs max-w-xs shrink-0">
          <Info className="size-4 shrink-0 text-amber-600" />
          <span>
            <strong>Indicative Assessment:</strong> Readability scores are advisory and do not guarantee interview selection.
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white shadow-xs cursor-pointer",
          dragActive
            ? "border-[#C4A885] bg-[#C4A885]/5 scale-[1.01]"
            : "border-slate-300 hover:border-[#C4A885]/60 hover:bg-slate-50/50"
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="max-w-md mx-auto space-y-4 py-4">
            <div className="size-14 rounded-full bg-[#C4A885]/15 text-[#C4A885] flex items-center justify-center mx-auto animate-pulse">
              <RefreshCw className="size-7 text-[#C4A885] animate-spin" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">Analyzing Resume Intelligence</h3>
              <p className="text-xs text-slate-500 mt-1">{uploadStepText}</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#C4A885] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600">{uploadProgress}%</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="size-16 rounded-2xl bg-[#C4A885]/10 text-[#C4A885] flex items-center justify-center mx-auto shadow-xs">
              <UploadCloud className="size-8" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">
                Drag and drop your resume file here
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Supports standard <strong className="text-slate-700">PDF (.pdf)</strong> or <strong className="text-slate-700">Word (.docx)</strong> documents up to 5MB.
              </p>
            </div>
            <div className="pt-2">
              <PillButton
                type="button"
                variant="primary"
                size="md"
                className="shadow-sm"
              >
                Browse From Computer
              </PillButton>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Resumes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-ink flex items-center gap-2">
            <FileCheck className="size-5 text-[#C4A885]" />
            Uploaded Documents ({resumes.length})
          </h2>
          <span className="text-xs text-slate-500">
            Click on any resume to view the 4-section intelligence audit
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="size-6 text-[#C4A885] animate-spin mx-auto mb-2" />
            Loading uploaded documents...
          </div>
        ) : resumes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <FileText className="size-10 text-slate-300 mx-auto" />
            <h3 className="font-heading font-semibold text-ink text-base">No resumes uploaded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your resume above to extract technical skills, audit ATS readability, and import verified project details.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#C4A885]/60 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-[#22343D]">
                    <FileText className="size-6 text-[#C4A885]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-heading font-bold text-ink text-sm sm:text-base">
                        {resume.fileName}
                      </h4>
                      {resume.isPrimary && (
                        <Badge variant="default" className="text-[10px] bg-[#C4A885] text-ink font-semibold">
                          Primary
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                        {(resume.fileSize / 1024).toFixed(0)} KB
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Uploaded on {new Date(resume.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap md:flex-nowrap justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  {/* Score Indicator */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Indicative Score
                      </div>
                      <div className="text-sm font-bold text-ink font-heading">
                        {resume.quality?.indicativeScore ?? 75}/100
                      </div>
                    </div>
                    <div
                      className={cn(
                        "size-3 rounded-full",
                        (resume.quality?.indicativeScore ?? 75) >= 80 ? "bg-emerald-500" : "bg-amber-500"
                      )}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/student/resume/${resume.id}/analysis`}>
                      <PillButton variant="primary" size="sm" icon={<ArrowRight className="size-3.5" />}>
                        View Analysis
                      </PillButton>
                    </Link>

                    <button
                      type="button"
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className="p-2 text-slate-400 hover:text-ink hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Replace file"
                    >
                      <RefreshCw className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(resume.id, resume.fileName)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete resume"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
