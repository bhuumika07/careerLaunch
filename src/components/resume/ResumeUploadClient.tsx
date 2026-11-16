"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dropzone } from "./Dropzone";
import { FileCard } from "./FileCard";
import { UploadStepper } from "./UploadStepper";

export function ResumeUploadClient({ studentId }: { studentId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [stepStatus, setStepStatus] = useState({
    uploaded: false,
    validated: false,
    extracted: false,
    parsed: false,
    ready: false,
    error: null as string | null,
  });

  // Poll version status
  useEffect(() => {
    if (!versionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/resume-versions/${versionId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStepStatus((prev) => ({
          ...prev,
          uploaded: data.status !== "uploaded" ? true : prev.uploaded,
          validated:
            data.status === "validating" ||
            data.status === "extracting" ||
            data.status === "parsing" ||
            data.status === "ready"
              ? true
              : prev.validated,
          extracted:
            data.status === "extracting" ||
            data.status === "parsing" ||
            data.status === "ready"
              ? true
              : prev.extracted,
          parsed:
            data.status === "parsing" || data.status === "ready"
              ? true
              : prev.parsed,
          ready:
            data.status === "ready" || data.status === "needs_review"
              ? true
              : prev.ready,
          error: data.status === "failed" ? data.failureReason ?? "Unknown error" : null,
        }));
        if (
          data.status === "ready" ||
          data.status === "needs_review" ||
          data.status === "failed"
        ) {
          clearInterval(interval);
        }
      } catch {
        // ignore polling network errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [versionId]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const allowedExt = [/\.pdf$/i, /\.docx$/i];
    const maxSize =
      Number(process.env.NEXT_PUBLIC_MAX_RESUME_UPLOAD_MB || 5) * 1024 * 1024;
    if (!allowedExt.some((re) => re.test(selectedFile.name))) {
      setStepStatus((s) => ({
        ...s,
        error: "Invalid file type. Only PDF and DOCX are allowed.",
      }));
      return;
    }
    if (selectedFile.size > maxSize) {
      setStepStatus((s) => ({
        ...s,
        error: `File too large. Max size is ${maxSize / (1024 * 1024)} MB.`,
      }));
      return;
    }
    setFile(selectedFile);

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("title", selectedFile.name.replace(/\.[^/.]+$/, "") || "My Resume");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/resumes");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 201) {
        try {
          const resp = JSON.parse(xhr.responseText);
          setVersionId(resp.versionId || resp.resume?.id || resp.id);
          setStepStatus((s) => ({ ...s, uploaded: true, error: null }));
        } catch {
          setStepStatus((s) => ({ ...s, uploaded: true, error: null }));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          setStepStatus((s) => ({ ...s, error: err.error || "Upload failed" }));
        } catch {
          setStepStatus((s) => ({ ...s, error: "Upload failed" }));
        }
      }
    };
    xhr.onerror = () => {
      setStepStatus((s) => ({ ...s, error: "Network error during upload" }));
    };
    xhr.send(form);
  }, []);

  const cancelUpload = () => {
    setFile(null);
    setUploadProgress(0);
    setVersionId(null);
    setStepStatus({
      uploaded: false,
      validated: false,
      extracted: false,
      parsed: false,
      ready: false,
      error: null,
    });
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-ink)" }}>
          Upload Resume
        </h1>
        <p className="text-sm" style={{ color: "var(--color-slate)" }}>
          Upload a resume to pre‑fill your profile. This helps us recommend jobs faster.
        </p>
      </header>

      {!file && <Dropzone onFileSelect={handleFileSelect} />}

      {file && (
        <FileCard file={file} progress={uploadProgress} onCancel={cancelUpload} />
      )}

      {versionId && <UploadStepper status={stepStatus} />}
    </main>
  );
}
