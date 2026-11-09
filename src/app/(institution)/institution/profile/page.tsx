"use client";

import * as React from "react";
import {
  Building2,
  Users,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  Clock,
  Layers,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstitutionProfile, DepartmentItem } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function InstitutionProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const [user, setUser] = React.useState<{ id: string; name: string; email: string } | null>(null);
  const [profile, setProfile] = React.useState<InstitutionProfile | null>(null);

  // Department modal / inline form
  const [newDeptName, setNewDeptName] = React.useState("");
  const [newDeptCode, setNewDeptCode] = React.useState("");
  const [newDeptHead, setNewDeptHead] = React.useState("");
  const [newDeptStudents, setNewDeptStudents] = React.useState("120");
  const [newDeptFaculty, setNewDeptFaculty] = React.useState("8");

  React.useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile/institution");
        const data = await res.json();
        if (mounted && res.ok && data.success) {
          setUser(data.user);
          setProfile(data.profile);
        }
      } catch {
        if (mounted) setFeedback({ text: "Failed to load institution profile.", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/profile/institution", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          type: profile.type,
          location: profile.location,
          website: profile.website,
          accreditation: profile.accreditation,
          establishedYear: profile.establishedYear,
          adminName: profile.adminName,
          adminDesignation: profile.adminDesignation,
          adminContact: profile.adminContact,
          departments: profile.departments,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setIsEditing(false);
        setFeedback({ text: "Institution profile saved successfully.", type: "success" });
      } else {
        setFeedback({ text: data.error || "Failed to save profile.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || !newDeptCode.trim() || !profile) return;

    try {
      const res = await fetch("/api/profile/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeptName.trim(),
          code: newDeptCode.trim().toUpperCase(),
          head: newDeptHead.trim() || "Head of Dept",
          studentCount: Number(newDeptStudents) || 0,
          facultyCount: Number(newDeptFaculty) || 0,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProfile({ ...profile, departments: data.departments });
        setNewDeptName("");
        setNewDeptCode("");
        setNewDeptHead("");
        setFeedback({ text: "Department added successfully.", type: "success" });
      }
    } catch {
      setFeedback({ text: "Failed to add department.", type: "error" });
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/profile/departments?id=${deptId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile({ ...profile, departments: data.departments });
        setFeedback({ text: "Department removed.", type: "success" });
      }
    } catch {
      setFeedback({ text: "Failed to delete department.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-sand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === "verified";
  const totalStudents = profile?.departments.reduce((acc, d) => acc + d.studentCount, 0) || 0;
  const totalFaculty = profile?.departments.reduce((acc, d) => acc + d.facultyCount, 0) || 0;

  return (
    <div className="space-y-8 p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-2xl bg-[#22343D] text-sand font-bold text-2xl flex items-center justify-center border-2 border-sand/30 shadow-md">
            <Building2 className="size-10 text-sand" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                {profile?.name || "Institution Name"}
              </h1>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Accredited Institution
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <Clock className="size-3 text-amber-600" />
                  Pending Accreditation
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {profile?.type} • {profile?.location} • Est. {profile?.establishedYear}
            </p>
            <p className="text-xs text-slate-500">Accreditation: {profile?.accreditation || "NAAC / ABET"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <PillButton
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              icon={<Save className="size-3.5" />}
            >
              {saving ? "Saving..." : "Save Profile"}
            </PillButton>
          ) : (
            <PillButton
              variant="primary"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<Edit3 className="size-3.5" />}
            >
              Edit Profile
            </PillButton>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "p-3 rounded-xl border text-xs flex items-center gap-2",
            feedback.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-rose-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-[22px] border border-border bg-white shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Departments</span>
          <div className="font-heading font-extrabold text-2xl text-ink">{profile?.departments.length || 0}</div>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Students</span>
          <div className="font-heading font-extrabold text-2xl text-sand">{totalStudents}</div>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Faculty Members</span>
          <div className="font-heading font-extrabold text-2xl text-ink">{totalFaculty}</div>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Faculty Ratio</span>
          <div className="font-heading font-extrabold text-2xl text-slate-700">
            {totalFaculty ? `1:${Math.round(totalStudents / totalFaculty)}` : "—"}
          </div>
        </div>
      </div>

      {/* Departments CRUD Section */}
      <div className="p-6 sm:p-8 rounded-[24px] border border-border bg-white shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Layers className="size-4 text-[#C4A885]" />
            <span>Academic Departments ({profile?.departments.length || 0})</span>
          </div>
        </div>

        {/* Table of Departments */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="pb-3">Code</th>
                <th className="pb-3">Department Name</th>
                <th className="pb-3">Department Head</th>
                <th className="pb-3">Students</th>
                <th className="pb-3">Faculty</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile?.departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-mono font-bold text-ink">{dept.code}</td>
                  <td className="py-3 font-semibold text-slate-800">{dept.name}</td>
                  <td className="py-3 text-slate-600">{dept.head}</td>
                  <td className="py-3 font-medium text-slate-700">{dept.studentCount}</td>
                  <td className="py-3 font-medium text-slate-700">{dept.facultyCount}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Department"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Department Form */}
        <div className="p-5 rounded-2xl border border-dashed border-sand/40 bg-sand/5 space-y-3">
          <span className="text-xs font-semibold text-[#5C4D3A] uppercase tracking-wider block">
            Add New Department
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Input
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
              placeholder="Code (e.g. AI)"
              className="bg-white font-mono uppercase"
            />
            <Input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="Department Name"
              className="bg-white sm:col-span-2"
            />
            <Input
              value={newDeptHead}
              onChange={(e) => setNewDeptHead(e.target.value)}
              placeholder="Dept Head Name"
              className="bg-white"
            />
            <PillButton
              variant="primary"
              size="sm"
              onClick={handleAddDepartment}
              icon={<Plus className="size-3.5" />}
              className="w-full justify-center"
            >
              Add
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}
