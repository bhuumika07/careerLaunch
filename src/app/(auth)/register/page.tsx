"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("student");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/${role}/dashboard`);
  };

  return (
    <div className="bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-8 shadow-2xl">
      <div className="text-center mb-7">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
          Create Account
        </h1>
        <p className="text-sm text-cream/60 mt-1.5">
          Join CareerLaunch to accelerate career readiness
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-cream/15 text-cream placeholder:text-cream/35 text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-email"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.edu"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-cream/15 text-cream placeholder:text-cream/35 text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-cream/15 text-cream placeholder:text-cream/35 text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-password"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40" />
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-cream/15 text-cream placeholder:text-cream/35 text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all"
            />
          </div>
        </div>

        {/* Role Select */}
        <div className="space-y-1.5">
          <label
            htmlFor="role"
            className="text-xs font-semibold uppercase tracking-wider text-cream/70"
          >
            Select Your Role
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-cream/40 pointer-events-none" />
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-ink border border-cream/15 text-cream text-sm focus:outline-hidden focus:border-sand focus:ring-1 focus:ring-sand transition-all cursor-pointer"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty / Educator</option>
              <option value="recruiter">Recruiter / Employer</option>
              <option value="institution">University / Institution</option>
            </select>
          </div>
        </div>

        {/* Submit PillButton */}
        <div className="pt-3">
          <PillButton type="submit" variant="primary" size="lg" className="w-full font-semibold">
            Register Account <ArrowRight className="size-4" />
          </PillButton>
        </div>
      </form>

      {/* Link to login */}
      <div className="mt-6 text-center pt-5 border-t border-cream/10">
        <p className="text-sm text-cream/65">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-sand font-semibold hover:underline underline-offset-4"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
