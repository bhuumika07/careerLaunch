"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState("student");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/${selectedRole}/dashboard`);
  };

  return (
    <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
          Sign In
        </h1>
        <p className="text-sm text-cream/60 mt-2">
          Enter your credentials to access your CareerLaunch portal
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email input */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-cream/15 text-cream placeholder:text-cream/35 text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-cream/70"
            >
              Password
            </label>
            <a
              href="#"
              className="text-xs text-sand/80 hover:text-sand transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-cream/15 text-cream placeholder:text-cream/35 text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all"
            />
          </div>
        </div>

        {/* Role Quick Selector for preview */}
        <div className="space-y-1.5">
          <label
            htmlFor="role-select"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Portal Role
          </label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-ink border border-cream/15 text-cream text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all cursor-pointer"
          >
            <option value="student">Student Portal</option>
            <option value="faculty">Faculty Portal</option>
            <option value="recruiter">Recruiter Portal</option>
            <option value="institution">Institution Portal</option>
            <option value="admin">Administrator Portal</option>
          </select>
        </div>

        {/* Sign In PillButton */}
        <div className="pt-2">
          <PillButton type="submit" variant="primary" size="lg" className="w-full font-semibold">
            Sign In <ArrowRight className="size-4" />
          </PillButton>
        </div>
      </form>

      {/* Register Link */}
      <div className="mt-8 text-center pt-6 border-t border-cream/10">
        <p className="text-sm text-cream/65">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-sand font-semibold hover:underline underline-offset-4"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
