"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
}

export function Dropzone({
  onFileSelect,
  accept = ".pdf,.docx",
  maxSizeMb = 5,
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragActive
          ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
          : "border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-900/40"
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div>
          <p className="font-semibold text-base text-slate-800 dark:text-slate-100">
            Click or drag &amp; drop to upload
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supports PDF and Word (.docx) up to {maxSizeMb}MB
          </p>
        </div>
        <Button type="button" variant="secondary" className="mt-2 text-sm">
          Browse File
        </Button>
      </div>
    </div>
  );
}
