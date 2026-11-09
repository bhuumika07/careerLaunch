"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  AlertCircle,
  FileCheck,
  Building2,
  GraduationCap,
  Users,
  Briefcase,
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
    role: "student" | "faculty" | "recruiter" | "institution" | "admin";
  } | null>(null);

  const [step, setStep] = React.useState<1 | 2>(1);

  // Common fields
  const [avatarUrl, setAvatarUrl] = React.useState<string>("");

  // Student fields
  const [studentPhone, setStudentPhone] = React.useState("");
  const [studentBio, setStudentBio] = React.useState("");
  const [studentLocation, setStudentLocation] = React.useState("");
  const [studentInstitution, setStudentInstitution] = React.useState("St. Jude Institute of Technology");
  const [studentDepartment, setStudentDepartment] = React.useState("Computer Science & Engineering");
  const [studentDegree, setStudentDegree] = React.useState("B.Tech in Computer Science");
  const [studentGradYear, setStudentGradYear] = React.useState("2026");
  const [studentCgpa, setStudentCgpa] = React.useState("8.8");

  // Faculty fields
  const [facultyDesignation, setFacultyDesignation] = React.useState("Associate Professor");
  const [facultyDepartment, setFacultyDepartment] = React.useState("Computer Science & Engineering");
  const [facultyInstitution, setFacultyInstitution] = React.useState("St. Jude Institute of Technology");
  const [facultyQualifications, setFacultyQualifications] = React.useState("Ph.D. in Computer Science");
  const [facultyExpertise, setFacultyExpertise] = React.useState("Distributed Systems, Cloud Architecture");

  // Recruiter fields
  const [companyName, setCompanyName] = React.useState("Apex Cloud Solutions");
  const [companyWebsite, setCompanyWebsite] = React.useState("https://apexcloud.example.com");
  const [companyIndustry, setCompanyIndustry] = React.useState("Cloud Computing & Enterprise SaaS");
  const [companySize, setCompanySize] = React.useState("500-1000 employees");
  const [recruiterDesignation, setRecruiterDesignation] = React.useState("Lead Technical Recruiter");
  const [officialEmail, setOfficialEmail] = React.useState("");
  const [recruiterDocUploaded, setRecruiterDocUploaded] = React.useState(false);

  // Institution fields
  const [instName, setInstName] = React.useState("St. Jude Institute of Technology");
  const [instType, setInstType] = React.useState<"University" | "Autonomous College" | "Institute of Technology" | "Polytechnic">("Autonomous College");
  const [instLocation, setInstLocation] = React.useState("Austin, Texas");
  const [instWebsite, setInstWebsite] = React.useState("https://stjude-tech.edu");
  const [adminName, setAdminName] = React.useState("");
  const [adminDesignation, setAdminDesignation] = React.useState("Dean of Career & Academic Affairs");
  const [adminContact, setAdminContact] = React.useState("+1 (555) 902-1849");
  const [instDocUploaded, setInstDocUploaded] = React.useState(false);

  // Fetch initial profile data on mount
  React.useEffect(() => {
    let mounted = true;
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/onboarding");
        const data = await res.json();
        if (mounted && res.ok && data.success) {
          setUser(data.user);
          if (data.user.role === "recruiter") {
            setOfficialEmail(data.user.email);
          }
          if (data.user.role === "institution") {
            setAdminName(data.user.name);
          }
          // Pre-populate if profile exists
          if (data.profile) {
            const p = data.profile;
            if (p.phone) setStudentPhone(p.phone);
            if (p.bio) setStudentBio(p.bio);
            if (p.institution) setStudentInstitution(p.institution);
            if (p.department) setStudentDepartment(p.department);
            if (p.degree) setStudentDegree(p.degree);
            if (p.graduationYear) setStudentGradYear(String(p.graduationYear));
            if (p.cgpa) setStudentCgpa(String(p.cgpa));
            if (p.designation) setFacultyDesignation(p.designation);
            if (p.companyName) setCompanyName(p.companyName);
            if (p.name) setInstName(p.name);
          }
        } else if (mounted) {
          // If not logged in, redirect to login
          router.push("/login?redirect=/onboarding");
        }
      } catch {
        if (mounted) setError("Failed to load onboarding profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUserData();
    return () => {
      mounted = false;
    };
  }, [router]);

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

    const role = user?.role;
    let payloadData: any = {};

    if (role === "student") {
      payloadData = {
        phone: studentPhone,
        bio: studentBio,
        location: studentLocation,
        institution: studentInstitution,
        department: studentDepartment,
        degree: studentDegree,
        graduationYear: studentGradYear,
        cgpa: studentCgpa,
        avatarUrl,
      };
    } else if (role === "faculty") {
      payloadData = {
        designation: facultyDesignation,
        department: facultyDepartment,
        institution: facultyInstitution,
        qualifications: facultyQualifications,
        expertise: facultyExpertise,
        avatarUrl,
      };
    } else if (role === "recruiter") {
      payloadData = {
        companyName,
        website: companyWebsite,
        industry: companyIndustry,
        companySize,
        recruiterDesignation,
        officialEmail,
        verificationDocument: recruiterDocUploaded ? "corporate_tax_registration.pdf" : undefined,
      };
    } else if (role === "institution") {
      payloadData = {
        name: instName,
        type: instType,
        location: instLocation,
        website: instWebsite,
        adminName,
        adminDesignation,
        adminContact,
        verificationDocument: instDocUploaded ? "university_charter_accreditation.pdf" : undefined,
      };
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payloadData, completeOnboarding }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setError(resData.error || "Failed to save onboarding data.");
        setSubmitting(false);
        return;
      }

      router.push(resData.redirectTo || `/${role}/dashboard`);
    } catch {
      setError("An unexpected network error occurred.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink text-cream">
        <div className="text-center space-y-3">
          <div className="size-10 border-2 border-sand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-cream/70 font-medium">Loading your role onboarding wizard...</p>
        </div>
      </div>
    );
  }

  const role = user?.role || "student";

  return (
    <div className="min-h-screen bg-ink text-cream selection:bg-sand/30 selection:text-sand py-12 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-cream/10 pb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-sand text-ink flex items-center justify-center font-bold">
              <Compass className="size-4 text-ink" />
            </div>
            <span className="font-heading font-bold text-lg text-cream">
              Career<span className="text-sand">Launch</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => saveOnboarding(false)}
            disabled={submitting}
            className="flex items-center gap-1.5 text-xs text-cream/70 hover:text-sand transition-colors font-medium cursor-pointer"
          >
            <Save className="size-3.5" />
            <span>Save & continue later</span>
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-cream/60">
            <span className="capitalize">{role} Onboarding Wizard</span>
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

        {/* Wizard Container Glass Card */}
        <div className="p-8 sm:p-10 rounded-[24px] border border-cream/15 bg-white/[0.04] backdrop-blur-xl shadow-2xl space-y-8">
          {/* ================================================================ */}
          {/* 1. STUDENT ONBOARDING                                            */}
          {/* ================================================================ */}
          {role === "student" && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sand/15 text-sand text-[11px] font-semibold mb-1">
                      <GraduationCap className="size-3.5" />
                      <span>Student Profile Setup</span>
                    </div>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Personal & Contact Information
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Introduce yourself to recruiters and faculty advisors with clean contact details.
                    </p>
                  </div>

                  {/* Profile Picture Upload */}
                  <div className="flex items-center gap-5 p-4 rounded-xl border border-cream/10 bg-white/[0.02]">
                    <div className="size-16 rounded-full bg-slate flex items-center justify-center text-cream font-bold overflow-hidden border border-cream/20 shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg text-sand">{user?.name?.charAt(0) || "S"}</span>
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="student-avatar" className="text-xs font-semibold text-cream cursor-pointer">
                        Upload Profile Photo
                      </Label>
                      <p className="text-[11px] text-cream/50">JPG, PNG or GIF up to 5MB.</p>
                      <input
                        id="student-avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="text-xs text-cream/60 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sand/20 file:text-sand cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Contact Phone</Label>
                      <Input
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Current Location</Label>
                      <Input
                        value={studentLocation}
                        onChange={(e) => setStudentLocation(e.target.value)}
                        placeholder="City, State"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-cream/80 font-medium">Headline / Bio</Label>
                    <Textarea
                      rows={3}
                      value={studentBio}
                      onChange={(e) => setStudentBio(e.target.value)}
                      placeholder="Aspiring software engineer passionate about machine learning systems..."
                      className="bg-white/[0.05] border-cream/15 text-cream rounded-xl resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <PillButton
                      variant="primary"
                      size="md"
                      onClick={() => setStep(2)}
                      icon={<ArrowRight className="size-4" />}
                    >
                      Next: Academic Details
                    </PillButton>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-cream/60 hover:text-cream mb-1"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Back to Personal</span>
                    </button>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Academic Credentials
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Specify your institution and department so verified coursework can be populated.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Institution Name</Label>
                      <Input
                        value={studentInstitution}
                        onChange={(e) => setStudentInstitution(e.target.value)}
                        placeholder="University or College"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Department</Label>
                        <Input
                          value={studentDepartment}
                          onChange={(e) => setStudentDepartment(e.target.value)}
                          placeholder="e.g. Computer Science"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Degree Program</Label>
                        <Input
                          value={studentDegree}
                          onChange={(e) => setStudentDegree(e.target.value)}
                          placeholder="e.g. B.Tech / B.S."
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Graduation Year</Label>
                        <Input
                          type="number"
                          value={studentGradYear}
                          onChange={(e) => setStudentGradYear(e.target.value)}
                          placeholder="2026"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Cumulative CGPA / GPA</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={studentCgpa}
                          onChange={(e) => setStudentCgpa(e.target.value)}
                          placeholder="e.g. 8.75"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-cream/10">
                    <PillButton variant="ghost" size="md" onClick={() => setStep(1)}>
                      Back
                    </PillButton>
                    <PillButton
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                      onClick={() => saveOnboarding(true)}
                      icon={<CheckCircle2 className="size-4" />}
                    >
                      {submitting ? "Finishing..." : "Complete Student Onboarding"}
                    </PillButton>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* 2. FACULTY ONBOARDING                                            */}
          {/* ================================================================ */}
          {role === "faculty" && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sand/15 text-sand text-[11px] font-semibold mb-1">
                      <Users className="size-3.5" />
                      <span>Faculty Onboarding</span>
                    </div>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Institutional Affiliation
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Specify your current academic appointment and department.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Academic Designation</Label>
                      <Select value={facultyDesignation} onValueChange={setFacultyDesignation}>
                        <SelectTrigger className="bg-white/[0.05] border-cream/15 text-cream rounded-xl">
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                          <SelectItem value="Professor">Professor</SelectItem>
                          <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                          <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                          <SelectItem value="Head of Department">Head of Department</SelectItem>
                          <SelectItem value="Dean of Engineering">Dean of Engineering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Department</Label>
                        <Input
                          value={facultyDepartment}
                          onChange={(e) => setFacultyDepartment(e.target.value)}
                          placeholder="e.g. Computer Science & Engineering"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Institution</Label>
                        <Input
                          value={facultyInstitution}
                          onChange={(e) => setFacultyInstitution(e.target.value)}
                          placeholder="e.g. St. Jude Institute of Technology"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <PillButton
                      variant="primary"
                      size="md"
                      onClick={() => setStep(2)}
                      icon={<ArrowRight className="size-4" />}
                    >
                      Next: Qualifications & Expertise
                    </PillButton>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-cream/60 hover:text-cream mb-1"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Back to Affiliation</span>
                    </button>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Qualifications & Research Expertise
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Add degrees and specialization tags to guide student mentorship and project evaluations.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">
                        Academic Qualifications (comma separated)
                      </Label>
                      <Input
                        value={facultyQualifications}
                        onChange={(e) => setFacultyQualifications(e.target.value)}
                        placeholder="e.g. Ph.D. in Computer Science, M.Tech in Software Systems"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">
                        Subject Matter Expertise (comma separated)
                      </Label>
                      <Input
                        value={facultyExpertise}
                        onChange={(e) => setFacultyExpertise(e.target.value)}
                        placeholder="e.g. Distributed Systems, Machine Learning, Cloud Security"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-cream/10">
                    <PillButton variant="ghost" size="md" onClick={() => setStep(1)}>
                      Back
                    </PillButton>
                    <PillButton
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                      onClick={() => saveOnboarding(true)}
                      icon={<CheckCircle2 className="size-4" />}
                    >
                      {submitting ? "Finishing..." : "Complete Faculty Onboarding"}
                    </PillButton>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* 3. RECRUITER ONBOARDING                                          */}
          {/* ================================================================ */}
          {role === "recruiter" && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sand/15 text-sand text-[11px] font-semibold mb-1">
                      <Briefcase className="size-3.5" />
                      <span>Corporate Recruiter Onboarding</span>
                    </div>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Company & Organization Profile
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Tell students about your company, industry domain, and organizational scale.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Company Name</Label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Apex Cloud Solutions"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Company Website</Label>
                        <Input
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          placeholder="https://company.com"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Industry Domain</Label>
                        <Input
                          value={companyIndustry}
                          onChange={(e) => setCompanyIndustry(e.target.value)}
                          placeholder="Cloud & AI Infrastructure"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <PillButton
                      variant="primary"
                      size="md"
                      onClick={() => setStep(2)}
                      icon={<ArrowRight className="size-4" />}
                    >
                      Next: Verification & Documents
                    </PillButton>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-cream/60 hover:text-cream mb-1"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Back to Company Details</span>
                    </button>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Recruiter Credentials & Verification
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Submit corporate verification documents for institutional campus drive authorization.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Recruiter Designation</Label>
                        <Input
                          value={recruiterDesignation}
                          onChange={(e) => setRecruiterDesignation(e.target.value)}
                          placeholder="e.g. Senior Talent Partner"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Official Work Email</Label>
                        <Input
                          type="email"
                          value={officialEmail}
                          onChange={(e) => setOfficialEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Document Upload Area */}
                    <div className="space-y-2">
                      <Label className="text-xs text-cream/80 font-medium">
                        Corporate Verification Document (Certificate of Incorporation / Work ID)
                      </Label>
                      <div
                        onClick={() => setRecruiterDocUploaded(!recruiterDocUploaded)}
                        className={cn(
                          "p-6 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center space-y-2",
                          recruiterDocUploaded
                            ? "border-sand bg-sand/10"
                            : "border-cream/20 bg-white/[0.02] hover:border-sand/40"
                        )}
                      >
                        {recruiterDocUploaded ? (
                          <>
                            <FileCheck className="size-8 text-sand mx-auto" />
                            <div className="text-xs font-semibold text-sand">
                              Document Attached: corporate_registration_cert.pdf
                            </div>
                            <span className="text-[10px] text-cream/50 block">
                              Click to remove or re-upload. Status will be marked: Pending Verification.
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="size-8 text-cream/40 mx-auto" />
                            <div className="text-xs font-medium text-cream">
                              Click to simulate uploading verification document
                            </div>
                            <span className="text-[10px] text-cream/40 block">
                              PDF, PNG, JPG up to 10MB (Verification status: Pending)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-cream/10">
                    <PillButton variant="ghost" size="md" onClick={() => setStep(1)}>
                      Back
                    </PillButton>
                    <PillButton
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                      onClick={() => saveOnboarding(true)}
                      icon={<CheckCircle2 className="size-4" />}
                    >
                      {submitting ? "Finishing..." : "Submit for Verification"}
                    </PillButton>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* 4. INSTITUTION ONBOARDING                                        */}
          {/* ================================================================ */}
          {role === "institution" && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sand/15 text-sand text-[11px] font-semibold mb-1">
                      <Building2 className="size-3.5" />
                      <span>Institution Onboarding</span>
                    </div>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      University & College Profile
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Configure your institutional domain, accreditation status, and campus location.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Institution Name</Label>
                      <Input
                        value={instName}
                        onChange={(e) => setInstName(e.target.value)}
                        placeholder="St. Jude Institute of Technology"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Institution Type</Label>
                        <Select
                          value={instType}
                          onValueChange={(val: any) => setInstType(val)}
                        >
                          <SelectTrigger className="bg-white/[0.05] border-cream/15 text-cream rounded-xl">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="University">University</SelectItem>
                            <SelectItem value="Autonomous College">Autonomous College</SelectItem>
                            <SelectItem value="Institute of Technology">Institute of Technology</SelectItem>
                            <SelectItem value="Polytechnic">Polytechnic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Campus Location</Label>
                        <Input
                          value={instLocation}
                          onChange={(e) => setInstLocation(e.target.value)}
                          placeholder="e.g. Austin, Texas"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Official Website</Label>
                      <Input
                        value={instWebsite}
                        onChange={(e) => setInstWebsite(e.target.value)}
                        placeholder="https://university.edu"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <PillButton
                      variant="primary"
                      size="md"
                      onClick={() => setStep(2)}
                      icon={<ArrowRight className="size-4" />}
                    >
                      Next: Authorized Admin & Accreditation
                    </PillButton>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-cream/60 hover:text-cream mb-1"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Back to Institution Details</span>
                    </button>
                    <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
                      Admin Authorization & Accreditation
                    </h2>
                    <p className="text-xs sm:text-sm text-cream/60">
                      Authorize placement officers and provide university charter verification.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Admin Full Name</Label>
                        <Input
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="Dr. Arthur Pendelton"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-cream/80 font-medium">Admin Designation</Label>
                        <Input
                          value={adminDesignation}
                          onChange={(e) => setAdminDesignation(e.target.value)}
                          placeholder="Dean of Placement & Academic Affairs"
                          className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream/80 font-medium">Admin Contact Phone</Label>
                      <Input
                        value={adminContact}
                        onChange={(e) => setAdminContact(e.target.value)}
                        placeholder="+1 (555) 902-1849"
                        className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                      />
                    </div>

                    {/* Document Upload Area */}
                    <div className="space-y-2">
                      <Label className="text-xs text-cream/80 font-medium">
                        Institutional Accreditation / Charter Document
                      </Label>
                      <div
                        onClick={() => setInstDocUploaded(!instDocUploaded)}
                        className={cn(
                          "p-6 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center space-y-2",
                          instDocUploaded
                            ? "border-sand bg-sand/10"
                            : "border-cream/20 bg-white/[0.02] hover:border-sand/40"
                        )}
                      >
                        {instDocUploaded ? (
                          <>
                            <FileCheck className="size-8 text-sand mx-auto" />
                            <div className="text-xs font-semibold text-sand">
                              Document Attached: university_charter_naac_accreditation.pdf
                            </div>
                            <span className="text-[10px] text-cream/50 block">
                              Click to remove. Status: Pending Verification.
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="size-8 text-cream/40 mx-auto" />
                            <div className="text-xs font-medium text-cream">
                              Click to upload official institutional accreditation document
                            </div>
                            <span className="text-[10px] text-cream/40 block">
                              PDF or Scanned Certificate (Verification status: Pending)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-cream/10">
                    <PillButton variant="ghost" size="md" onClick={() => setStep(1)}>
                      Back
                    </PillButton>
                    <PillButton
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                      onClick={() => saveOnboarding(true)}
                      icon={<CheckCircle2 className="size-4" />}
                    >
                      {submitting ? "Finishing..." : "Complete Institution Onboarding"}
                    </PillButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
