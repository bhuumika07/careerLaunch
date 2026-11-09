"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluatePasswordStrength } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing or invalid. Please request a new link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (passwordStrength.score < 2) {
      setError("Please choose a stronger password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
          Create New Password
        </h1>
        <p className="text-xs sm:text-sm text-cream/60">
          Ensure your new password meets institutional security requirements.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-cream text-xs flex items-center gap-2.5">
          <AlertCircle className="size-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-6 rounded-2xl border border-sand/30 bg-white/[0.04] space-y-4 text-center">
          <div className="size-12 rounded-full bg-sand/20 text-sand flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-6 text-sand" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-cream">Password Reset Complete</h3>
            <p className="text-xs text-cream/70">
              Your password has been securely updated. Redirecting to sign in...
            </p>
          </div>
          <Link href="/login">
            <PillButton variant="primary" size="md" className="w-full justify-center">
              Sign In Now
            </PillButton>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
                New Password
              </Label>
              {password.length > 0 && (
                <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="pl-10 pr-10 h-11 bg-white/[0.05] border-cream/15 text-cream placeholder:text-cream/35 rounded-xl focus:border-sand"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {password.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          index <= passwordStrength.score - 1
                            ? passwordStrength.color
                            : "rgba(232, 223, 212, 0.12)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="confirm-new-password"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="pl-10 h-11 bg-white/[0.05] border-cream/15 text-cream placeholder:text-cream/35 rounded-xl focus:border-sand"
              />
            </div>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <p className="text-[11px] text-danger">Passwords do not match.</p>
            )}
          </div>

          <PillButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full justify-center text-sm font-semibold shadow-lg shadow-sand/15 cursor-pointer"
            icon={<ArrowRight className="size-4" />}
          >
            {loading ? "Updating Password..." : "Reset Password"}
          </PillButton>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[420px] flex items-center justify-center text-cream/40">Loading password reset...</div>}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
