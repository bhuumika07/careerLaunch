"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

export interface SignupTeaserFormProps {
  className?: string;
}

export function SignupTeaserForm({ className }: SignupTeaserFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState("student");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams = new URLSearchParams({
      name: fullName,
      email: email,
      phone: phone,
      role: role,
    });
    router.push(`/register?${queryParams.toString()}`);
  };

  return (
    <div
      className={cn(
        "bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6 sm:p-8 md:p-10 max-w-lg mx-auto shadow-2xl shadow-black/40",
        className
      )}
    >
      {/* Form Header */}
      <div className="text-center sm:text-left mb-6 sm:mb-8">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cream tracking-tight">
          Start Your Journey
        </h2>
        <p className="text-sm text-cream/70 mt-2 leading-relaxed">
          Create your free account and take the first step toward career readiness.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-cream text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            required
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 bg-white/[0.06] border-cream/[0.12] text-cream placeholder:text-cream/40 focus-visible:border-sand focus-visible:ring-sand/30 rounded-xl px-4 text-sm"
          />
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-cream text-sm font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="john@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-white/[0.06] border-cream/[0.12] text-cream placeholder:text-cream/40 focus-visible:border-sand focus-visible:ring-sand/30 rounded-xl px-4 text-sm"
          />
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-cream text-sm font-medium">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 bg-white/[0.06] border-cream/[0.12] text-cream placeholder:text-cream/40 focus-visible:border-sand focus-visible:ring-sand/30 rounded-xl px-4 text-sm"
          />
        </div>

        {/* Role Select Field */}
        <div className="space-y-2">
          <Label htmlFor="role" className="text-cream text-sm font-medium">
            Role
          </Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger
              id="role"
              className="w-full h-11 bg-white/[0.06] border-cream/[0.12] text-cream focus:border-sand focus:ring-sand/30 rounded-xl px-4 text-sm data-[placeholder]:text-cream/40"
            >
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent className="bg-ink/95 backdrop-blur-xl border border-cream/[0.15] text-cream rounded-xl p-1 shadow-2xl">
              <SelectItem
                value="student"
                className="cursor-pointer text-cream/90 focus:bg-sand focus:text-ink rounded-lg py-2 px-3 text-sm"
              >
                Student
              </SelectItem>
              <SelectItem
                value="faculty"
                className="cursor-pointer text-cream/90 focus:bg-sand focus:text-ink rounded-lg py-2 px-3 text-sm"
              >
                Faculty
              </SelectItem>
              <SelectItem
                value="recruiter"
                className="cursor-pointer text-cream/90 focus:bg-sand focus:text-ink rounded-lg py-2 px-3 text-sm"
              >
                Recruiter
              </SelectItem>
              <SelectItem
                value="institution"
                className="cursor-pointer text-cream/90 focus:bg-sand focus:text-ink rounded-lg py-2 px-3 text-sm"
              >
                Institution
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submit / Register PillButton */}
        <div className="pt-2">
          <PillButton
            asChild
            variant="primary"
            size="lg"
            className="w-full text-center justify-center font-bold text-base shadow-lg shadow-sand/20 cursor-pointer"
          >
            <Link href="/register">Register Now</Link>
          </PillButton>
        </div>

        {/* Legal micro-copy */}
        <p className="text-center text-xs text-cream/45 mt-3">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-cream">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-cream">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}

export default SignupTeaserForm;
