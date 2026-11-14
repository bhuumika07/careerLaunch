"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { role: "Student", email: "student@careerlaunch.com", label: "Student" },
  { role: "Faculty", email: "faculty@careerlaunch.com", label: "Faculty" },
  { role: "Recruiter", email: "recruiter@careerlaunch.com", label: "Recruiter" },
  { role: "Institution", email: "institution@careerlaunch.com", label: "Institution" },
  { role: "Admin", email: "admin@careerlaunch.com", label: "Admin" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = React.useState<number | null>(null);

  // Countdown timer if rate limited
  React.useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to sign in.");
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.retryAfter !== undefined) {
          setLockoutSeconds(data.retryAfter);
        }
        setLoading(false);
        return;
      }

      // Successful login -> route to target or role dashboard
      const target = redirectTarget || data.redirectTo || `/${data.user.role}/dashboard`;
      router.push(target);
    } catch {
      setError("Network error occurred. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Sign In
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Access your personalized career telemetry and readiness workspace.
        </p>
      </div>

      {/* Error or Rate Limit Alert */}
      {error && (
        <div className="p-3.5 rounded-xl border border-danger/50 bg-danger/15 text-foreground text-xs space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-danger shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          {remainingAttempts !== null && remainingAttempts > 0 && (
            <p className="text-[11px] text-muted-foreground pl-6">
              You have {remainingAttempts} attempt(s) remaining before account lockout.
            </p>
          )}
          {lockoutSeconds !== null && lockoutSeconds > 0 && (
            <p className="text-[11px] text-danger font-medium pl-6">
              Account locked due to rate limiting. Retry in {lockoutSeconds}s.
            </p>
          )}
        </div>
      )}

      {/* Quick Demo Login Fillers */}
      <div className="p-4 rounded-2xl border border-border bg-white/[0.03] space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber">
          <Sparkles className="size-3.5" />
          <span>Quick Demo One-Click Fill (Password: Password123!)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => fillDemoAccount(acc.email)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-white/[0.04] text-foreground/85 hover:text-foreground hover:border-amber/50 hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email input */}
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-xs font-semibold text-foreground/85 uppercase tracking-wider">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              className="pl-10 h-11 bg-white/[0.05] border-border bg-white/[0.05] text-foreground placeholder:text-muted-foreground/80 rounded-xl focus:border-ring"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-xs font-semibold text-foreground/85 uppercase tracking-wider">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-link hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10 h-11 bg-white/[0.05] border-border bg-white/[0.05] text-foreground placeholder:text-muted-foreground/80 rounded-xl focus:border-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded-sm border-sky/30 bg-white/5 text-amber accent-amber cursor-pointer"
            />
            <span>Remember this device for 7 days</span>
          </label>
        </div>

        {/* Submit */}
        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading || (lockoutSeconds !== null && lockoutSeconds > 0)}
          className="w-full justify-center text-sm font-semibold shadow-lg shadow-primary/20 cursor-pointer"
          icon={<ArrowRight className="size-4" />}
        >
          {loading ? "Signing In..." : "Sign In to Portal"}
        </PillButton>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="text-link hover:underline font-semibold">
            Create an Account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[420px] flex items-center justify-center text-muted-foreground">Loading portal...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
