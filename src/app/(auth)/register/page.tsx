"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Users,
  Briefcase,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluatePasswordStrength } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    id: "student",
    title: "Student",
    badge: "Early Career",
    icon: GraduationCap,
    description: "Build verified skill profiles, identify gaps, and land internships or jobs.",
  },
  {
    id: "faculty",
    title: "Faculty",
    badge: "Educator & Mentor",
    icon: Users,
    description: "Align curriculum with industry demands, assign benchmark evaluations, and guide students.",
  },
  {
    id: "recruiter",
    title: "Recruiter",
    badge: "Talent Partner",
    icon: Briefcase,
    description: "Discover pre-vetted campus talent with transparent, explainable skill matching.",
  },
  {
    id: "institution",
    title: "Institution",
    badge: "University & Admin",
    icon: Building2,
    description: "Track department career outcomes, accreditation metrics, and corporate partnerships.",
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "student";

  const [step, setStep] = React.useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = React.useState<string>(initialRole);

  // Form fields
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Status
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleNextStep = () => {
    setError(null);
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (passwordStrength.score < 2) {
      setError("Please choose a stronger password before proceeding.");
      return;
    }

    if (!termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: selectedRole,
          termsAccepted: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Successful registration -> route directly to onboarding wizard
      router.push("/onboarding");
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Step Indicator Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-cream/60">
          <span>{step === 1 ? "Step 1: Choose Your Role" : "Step 2: Account Credentials"}</span>
          <span className="text-sand">Step {step} of 2</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-sand transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-cream text-xs flex items-center gap-2.5">
          <AlertCircle className="size-4 text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CHOOSE ROLE */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
              Select Your Role
            </h1>
            <p className="text-xs sm:text-sm text-cream/60">
              Each stakeholder accesses specialized tools and workflows tailored to their objectives.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={cn(
                    "text-left p-4 rounded-[18px] border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 relative group",
                    isSelected
                      ? "border-sand bg-white/[0.08] shadow-lg shadow-sand/10 ring-1 ring-sand"
                      : "border-cream/15 bg-white/[0.03] hover:border-cream/35 hover:bg-white/[0.05]"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center transition-colors",
                        isSelected ? "bg-sand text-ink" : "bg-white/[0.06] text-cream"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        isSelected
                          ? "bg-sand/20 text-sand"
                          : "bg-white/[0.06] text-cream/50 group-hover:text-cream/70"
                      )}
                    >
                      {r.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-base text-cream">
                        {r.title}
                      </span>
                      {isSelected && <CheckCircle2 className="size-4 text-sand" />}
                    </div>
                    <p className="text-xs text-cream/60 leading-relaxed line-clamp-2">
                      {r.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <PillButton
            variant="primary"
            size="lg"
            className="w-full justify-center text-sm font-semibold shadow-md cursor-pointer"
            onClick={handleNextStep}
            icon={<ArrowRight className="size-4" />}
          >
            Continue as {ROLES.find((r) => r.id === selectedRole)?.title}
          </PillButton>

          <p className="text-center text-xs text-cream/60">
            Already have an account?{" "}
            <Link href="/login" className="text-sand hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      )}

      {/* STEP 2: CREDENTIALS & VALIDATION */}
      {step === 2 && (
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs text-cream/60 hover:text-cream mb-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Change Role ({ROLES.find((r) => r.id === selectedRole)?.title})</span>
            </button>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-cream/60">
              Set up your profile credentials for the{" "}
              <span className="text-sand capitalize">{selectedRole}</span> portal.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
              Full Name
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="reg-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="pl-10 h-11 bg-white/[0.05] border-cream/15 text-cream placeholder:text-cream/35 rounded-xl focus:border-sand"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  selectedRole === "recruiter"
                    ? "name@company.com"
                    : selectedRole === "institution"
                    ? "admin@university.edu"
                    : "student@university.edu"
                }
                className="pl-10 h-11 bg-white/[0.05] border-cream/15 text-cream placeholder:text-cream/35 rounded-xl focus:border-sand"
              />
            </div>
          </div>

          {/* Password with Strength Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reg-password" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
                Password
              </Label>
              {password.length > 0 && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.label}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="reg-password"
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

            {/* Password Strength Meter Bars */}
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
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-cream/55 pt-0.5">
                  <span className={cn(passwordStrength.checks.length && "text-success")}>
                    ✓ 8+ chars
                  </span>
                  <span
                    className={cn(
                      passwordStrength.checks.hasUppercase &&
                        passwordStrength.checks.hasLowercase &&
                        "text-success"
                    )}
                  >
                    ✓ Upper & lowercase
                  </span>
                  <span className={cn(passwordStrength.checks.hasNumber && "text-success")}>
                    ✓ Number
                  </span>
                  <span className={cn(passwordStrength.checks.hasSpecial && "text-success")}>
                    ✓ Symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm" className="text-xs font-semibold text-cream/80 uppercase tracking-wider">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
              <Input
                id="reg-confirm"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="pl-10 h-11 bg-white/[0.05] border-cream/15 text-cream placeholder:text-cream/35 rounded-xl focus:border-sand"
              />
            </div>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <p className="text-[11px] text-danger">Passwords do not match.</p>
            )}
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="terms"
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="size-4 mt-0.5 rounded-sm border-cream/30 bg-white/5 text-sand accent-sand cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-cream/70 leading-relaxed cursor-pointer">
              I agree to the{" "}
              <span className="text-sand underline underline-offset-2">Terms of Service</span> and{" "}
              <span className="text-sand underline underline-offset-2">Privacy Policy</span>, and consent to career readiness credential verification.
            </label>
          </div>

          {/* Submit Button */}
          <PillButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full justify-center text-sm font-semibold shadow-lg shadow-sand/15 cursor-pointer mt-2"
          >
            {loading ? "Creating Account..." : "Complete Registration"}
          </PillButton>

          <p className="text-center text-xs text-cream/60 pt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-sand hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[420px] flex items-center justify-center text-cream/40">Loading registration...</div>}>
      <RegisterForm />
    </React.Suspense>
  );
}
