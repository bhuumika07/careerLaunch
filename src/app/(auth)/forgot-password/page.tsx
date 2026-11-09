"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<{ message: string; resetLink?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to process request.");
        setLoading(false);
        return;
      }

      setSuccessData(data);
      setLoading(false);
    } catch {
      setError("An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-xs text-cream/60 hover:text-cream transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        <span>Back to Sign In</span>
      </Link>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
          Reset Password
        </h1>
        <p className="text-xs sm:text-sm text-cream/60">
          Enter your registered email address and we&apos;ll generate a secure reset link.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-cream text-xs flex items-center gap-2.5">
          <AlertCircle className="size-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successData ? (
        <div className="p-6 rounded-2xl border border-sand/30 bg-white/[0.04] space-y-4 text-center">
          <div className="size-12 rounded-full bg-sand/20 text-sand flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-6 text-sand" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-cream">Check Your Inbox</h3>
            <p className="text-xs text-cream/70 leading-relaxed max-w-sm mx-auto">
              {successData.message}
            </p>
          </div>

          {successData.resetLink && (
            <div className="p-3 rounded-xl bg-white/[0.05] border border-cream/10 text-xs space-y-2 text-left">
              <span className="text-[10px] uppercase font-semibold text-sand tracking-wider block">
                Development Test Link:
              </span>
              <Link
                href={successData.resetLink}
                className="text-xs text-sand hover:underline font-mono break-all block"
              >
                {successData.resetLink}
              </Link>
            </div>
          )}

          <div className="pt-2">
            <Link href="/login">
              <PillButton variant="secondary" size="md" className="w-full justify-center">
                Return to Sign In
              </PillButton>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="pl-10 h-11 bg-white/[0.05] border-cream/15 text-cream placeholder:text-cream/35 rounded-xl focus:border-sand"
              />
            </div>
          </div>

          <PillButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full justify-center text-sm font-semibold shadow-lg shadow-sand/15 cursor-pointer"
            icon={<ArrowRight className="size-4" />}
          >
            {loading ? "Generating Link..." : "Send Reset Link"}
          </PillButton>
        </form>
      )}
    </div>
  );
}
