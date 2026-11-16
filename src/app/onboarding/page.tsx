"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  User,
  Upload,
  AlertCircle,
  Save,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [user, setUser] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: "student" | "job_seeker" | "admin";
  } | null>(null);

  const [step, setStep] = React.useState<1 | 2>(1);

  // Common shared fields
  const [avatarUrl, setAvatarUrl] = React.useState<string>("");
  const [phone, setPhone] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [location, setLocation] = React.useState("");

  // Student-specific fields
  const [institution, setInstitution] = React.useState("St. Jude Institute of Technology");
  const [department, setDepartment] = React.useState("Computer Science & Engineering");
  const [degree, setDegree] = React.useState("B.Tech in Computer Science");
  const [gradYear, setGradYear] = React.useState("2026");
  const [cgpa, setCgpa] = React.useState("8.8");

  // Job Seeker-specific fields
  const [currentStatus, setCurrentStatus] = React.useState<string>("employed");
  const [totalExperience, setTotalExperience] = React.useState("2 years");
  const [currentRole, setCurrentRole] = React.useState("Junior Software Engineer");
  const [targetRoles, setTargetRoles] = React.useState("Full Stack Developer, Cloud Engineer");
  const [preferredLocations, setPreferredLocations] = React.useState("Remote, Bengaluru, Mumbai");
  const [expectedCompensation, setExpectedCompensation] = React.useState("$80,000 / year");

  React.useEffect(() => {
    let mounted = true;
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/onboarding");
        const data = await res.json();
        if (mounted && data.success && data.user) {
          setUser(data.user);
          if (data.profile) {
            setPhone(data.profile.phone || "");
            setBio(data.profile.bio || "");
            setLocation(data.profile.location || "");
            if (data.profile.avatarUrl) setAvatarUrl(data.profile.avatarUrl);
            if (data.profile.institution) setInstitution(data.profile.institution);
            if (data.profile.college) setInstitution(data.profile.college);
            if (data.profile.department) setDepartment(data.profile.department);
            if (data.profile.branch) setDepartment(data.profile.branch);
            if (data.profile.degree) setDegree(data.profile.degree);
            if (data.profile.graduationYear) setGradYear(String(data.profile.graduationYear));
            if (data.profile.cgpa) setCgpa(String(data.profile.cgpa));
            if (data.profile.currentStatus) setCurrentStatus(data.profile.currentStatus);
            if (data.profile.totalExperience) setTotalExperience(data.profile.totalExperience);
            if (data.profile.currentRole) setCurrentRole(data.profile.currentRole);
            if (data.profile.targetRoles) setTargetRoles(data.profile.targetRoles.join(", "));
            if (data.profile.preferredLocations) setPreferredLocations(data.profile.preferredLocations.join(", "));
            if (data.profile.expectedCompensation) setExpectedCompensation(data.profile.expectedCompensation);
          }
        }
      } catch {
        if (mounted) setError("Failed to load user profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUserData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveOnboarding = async (completeOnboarding: boolean) => {
    setSubmitting(true);
    setError(null);

    const isStudent = user?.role === "student";

    const payloadData: any = {
      phone,
      bio,
      location,
      avatarUrl,
    };

    if (isStudent) {
      payloadData.institution = institution;
      payloadData.department = department;
      payloadData.degree = degree;
      payloadData.graduationYear = gradYear;
      payloadData.cgpa = cgpa;
    } else {
      payloadData.currentStatus = currentStatus;
      payloadData.totalExperience = totalExperience;
      payloadData.currentRole = currentRole;
      payloadData.targetRoles = targetRoles.split(",").map((s) => s.trim()).filter(Boolean);
      payloadData.preferredLocations = preferredLocations.split(",").map((s) => s.trim()).filter(Boolean);
      payloadData.expectedCompensation = expectedCompensation;
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payloadData, completeOnboarding }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setError(resData.error || "Failed to save profile.");
        setSubmitting(false);
        return;
      }

      router.push(resData.redirectTo || "/student/dashboard");
    } catch {
      setError("An unexpected network error occurred.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-foreground">
        <div className="size-8 border-2 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = user?.role || "student";
  const isStudent = role === "student";

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-navy-950 text-foreground py-12 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <Compass className="size-4" />
            </div>
            <span className="font-heading font-bold text-lg text-foreground">
              Career<span className="text-amber">Launch</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => saveOnboarding(false)}
            disabled={submitting}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber transition-colors font-medium"
          >
            <Save className="size-3.5" />
            <span>Save &amp; continue later</span>
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="capitalize">{isStudent ? "Student Profile Setup" : "Job Seeker Profile Setup"}</span>
            <span className="text-amber">Step {step} of 2</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-destructive/50 bg-destructive/15 text-destructive text-xs flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Card */}
        <div className="p-8 sm:p-10 rounded-3xl glass-card border border-sky/20 shadow-2xl space-y-8 bg-navy-950/80">
          {step === 1 ? (
            /* STEP 1: Personal Contact & Shared Info */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber/15 text-amber text-[11px] font-semibold mb-1">
                  {isStudent ? <GraduationCap className="size-3.5" /> : <Briefcase className="size-3.5" />}
                  <span>{isStudent ? "Academic Identity" : "Professional Identity"}</span>
                </div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  Contact &amp; Bio Information
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This forms your base discovery identity for automated match scoring.
                </p>
              </div>

              {/* Avatar Upload */}
              <div className="flex items-center gap-5 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <div className="size-16 rounded-full bg-navy-900 flex items-center justify-center text-foreground font-bold overflow-hidden border border-white/[0.1] shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <User className="size-7 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground block">Profile Photo</span>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-foreground transition-colors border border-white/[0.08]">
                    <Upload className="size-3.5" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-10 text-xs bg-white/[0.04]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs">Location / City</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA or Remote"
                    className="h-10 text-xs bg-white/[0.04]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs">Short Bio / Executive Summary</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your background, aspirational roles, and core passions..."
                  className="h-24 text-xs bg-white/[0.04] resize-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                <PillButton variant="primary" size="md" onClick={() => setStep(2)}>
                  <span>Continue to {isStudent ? "Academic Details" : "Career Background"}</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </PillButton>
              </div>
            </div>
          ) : (
            /* STEP 2: Role-Specific Details */
            <div className="space-y-6">
              {isStudent ? (
                /* Student Specific */
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                      Academic Credentials
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Used to match mandatory degree criteria and graduation batch cutoffs.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inst" className="text-xs">College / University Name</Label>
                      <Input
                        id="inst"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        className="h-10 text-xs bg-white/[0.04]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="degree" className="text-xs">Degree Program</Label>
                        <Input
                          id="degree"
                          value={degree}
                          onChange={(e) => setDegree(e.target.value)}
                          placeholder="B.Tech, B.S., M.S., etc."
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dept" className="text-xs">Department / Major</Label>
                        <Input
                          id="dept"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Computer Science, IT, Data, etc."
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="gradYear" className="text-xs">Graduation Year</Label>
                        <Input
                          id="gradYear"
                          value={gradYear}
                          onChange={(e) => setGradYear(e.target.value)}
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cgpa" className="text-xs">Current CGPA / Grade (out of 10.0)</Label>
                        <Input
                          id="cgpa"
                          value={cgpa}
                          onChange={(e) => setCgpa(e.target.value)}
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Job Seeker Specific */
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                      Professional Background
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Configures full-time role recommendations and target compensation filters.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Current Employment Status</Label>
                        <Select value={currentStatus} onValueChange={setCurrentStatus}>
                          <SelectTrigger className="h-10 text-xs bg-white/[0.04]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-navy-950 border-border text-foreground">
                            <SelectItem value="employed">Employed full-time</SelectItem>
                            <SelectItem value="unemployed">Actively seeking</SelectItem>
                            <SelectItem value="freelancing">Freelancing / Contract</SelectItem>
                            <SelectItem value="switching_careers">Switching Careers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="totExp" className="text-xs">Total Experience</Label>
                        <Input
                          id="totExp"
                          value={totalExperience}
                          onChange={(e) => setTotalExperience(e.target.value)}
                          placeholder="e.g. 3 years, Fresh Graduate"
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currRole" className="text-xs">Current / Recent Role</Label>
                      <Input
                        id="currRole"
                        value={currentRole}
                        onChange={(e) => setCurrentRole(e.target.value)}
                        placeholder="e.g. Frontend Engineer, Analyst"
                        className="h-10 text-xs bg-white/[0.04]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="targetRoles" className="text-xs">Target Roles (comma separated)</Label>
                      <Input
                        id="targetRoles"
                        value={targetRoles}
                        onChange={(e) => setTargetRoles(e.target.value)}
                        placeholder="Full Stack Engineer, Cloud Architect, DevOps"
                        className="h-10 text-xs bg-white/[0.04]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="prefLoc" className="text-xs">Preferred Locations</Label>
                        <Input
                          id="prefLoc"
                          value={preferredLocations}
                          onChange={(e) => setPreferredLocations(e.target.value)}
                          placeholder="Remote, Bengaluru, New York"
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="comp" className="text-xs">Target Compensation (Optional)</Label>
                        <Input
                          id="comp"
                          value={expectedCompensation}
                          onChange={(e) => setExpectedCompensation(e.target.value)}
                          placeholder="e.g. $90,000 / yr or ₹18 LPA"
                          className="h-10 text-xs bg-white/[0.04]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.08]">
                <PillButton variant="secondary" size="md" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4 mr-1.5" />
                  <span>Back</span>
                </PillButton>

                <PillButton
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  onClick={() => saveOnboarding(true)}
                  className="shadow-lg shadow-primary/20"
                >
                  <CheckCircle2 className="size-4 mr-1.5" />
                  <span>{submitting ? "Saving..." : "Complete Setup & Launch Dashboard"}</span>
                </PillButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
