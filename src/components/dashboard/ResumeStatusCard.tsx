import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeVersion {
  id: string;
  status: string;
  createdAt: string;
}

export default function ResumeStatusCard() {
  const [version, setVersion] = useState<ResumeVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/resumes');
        const data = await res.json();
        if (res.ok && data.resumes?.length) {
          // Assuming API returns resumes with versions array sorted desc
          const latestVersion = data.resumes[0].versions?.[0];
          setVersion(latestVersion ?? null);
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card animate-pulse h-24" />
    );
  }

  const status = version?.status ?? 'none';
  const statusMap: Record<string, { label: string; color: string; cta?: string }> = {
    uploaded: { label: 'Uploaded', color: 'bg-sky-500', cta: '/student/resume' },
    processing: { label: 'Processing', color: 'bg-amber-500' },
    needs_review: { label: 'Needs Review', color: 'bg-amber-500', cta: `/student/resume/${version?.id}/review` },
    ready: { label: 'Ready', color: 'bg-success-500', cta: `/student/resume/${version?.id}/review` },
    failed: { label: 'Failed', color: 'bg-danger-500' },
  }[status] ?? { label: 'No Resume', color: 'bg-muted' };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3">
        {status === 'ready' ? (
          <CheckCircle className="size-5 text-success" />
        ) : status === 'failed' ? (
          <AlertCircle className="size-5 text-danger" />
        ) : null}
        <span className={cn('font-medium', statusMap.color)}>{statusMap.label}</span>
      </div>
      {statusMap.cta && (
        <Link href={statusMap.cta} className={cn('text-sm font-medium text-primary hover:underline')}>Review</Link>
      )}
    </div>
  );
}
