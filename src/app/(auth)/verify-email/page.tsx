"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = React.useState(!!token);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  // Auto-verify if token is present
  React.useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.success) {
            setVerified(true);
          } else {
            setError(data.error || "Verification failed. Token may have expired.");
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setError("Network error occurred during verification.");
          setLoading(false);
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendMessage(
          data.verificationLink
            ? `New test link generated: ${data.verificationLink}`
            : "Verification email resent successfully!"
        );
      } else {
        setResendMessage(data.error || "Please sign in to resend verification.");
      }
    } catch {
      setResendMessage("Failed to resend. Please check your network.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full space-y-6 text-center">
      {/* 1. VERIFYING STATE */}
      {loading && (
        <div className="p-8 rounded-2xl border border-cream/15 bg-white/[0.04] space-y-4">
          <div className="size-12 rounded-full bg-sand/20 text-sand flex items-center justify-center mx-auto animate-pulse">
            <RefreshCw className="size-6 text-sand animate-spin" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-cream">
            Verifying Your Email...
          </h2>
          <p className="text-xs text-cream/70">
            Validating institutional security token against the directory.
          </p>
        </div>
      )}

      {/* 2. SUCCESS STATE */}
      {!loading && verified && (
        <div className="p-8 rounded-2xl border border-sand/40 bg-white/[0.04] space-y-5">
          <div className="size-14 rounded-full bg-sand/20 text-sand flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-8 text-sand" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cream">
              Email Verified Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-cream/70 max-w-sm mx-auto">
              Your institutional credentials have been verified. You can now access your role workspace.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/onboarding">
              <PillButton
                variant="primary"
                size="lg"
                className="w-full justify-center text-sm font-semibold shadow-md"
                icon={<ArrowRight className="size-4" />}
              >
                Continue to Onboarding
              </PillButton>
            </Link>
          </div>
        </div>
      )}

      {/* 3. PENDING STATE */}
      {!loading && !verified && (
        <div className="p-8 rounded-2xl border border-cream/15 bg-white/[0.04] space-y-5">
          <div className="size-14 rounded-full bg-sand/20 text-sand flex items-center justify-center mx-auto">
            <Mail className="size-8 text-sand" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cream">
              Verify Your Email Address
            </h2>
            <p className="text-xs sm:text-sm text-cream/70 max-w-sm mx-auto leading-relaxed">
              We&apos;ve sent a verification link to your registered email address. Click the link to complete verification.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-danger/40 bg-danger/10 text-cream text-xs flex items-center justify-center gap-2">
              <AlertCircle className="size-4 text-danger shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="p-3 rounded-xl border border-sand/30 bg-sand/10 text-cream text-xs break-all">
              {resendMessage}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <PillButton
              variant="secondary"
              size="md"
              disabled={resending}
              onClick={handleResend}
              className="w-full justify-center text-xs font-semibold"
              icon={<RefreshCw className={cn("size-3.5", resending && "animate-spin")} />}
            >
              {resending ? "Generating..." : "Resend Verification Link"}
            </PillButton>

            <Link href="/onboarding" className="block">
              <PillButton
                variant="primary"
                size="md"
                className="w-full justify-center text-xs font-semibold"
                icon={<ArrowRight className="size-3.5" />}
              >
                Proceed to Onboarding Anyway
              </PillButton>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[300px] flex items-center justify-center text-cream/40">Loading verification...</div>}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
