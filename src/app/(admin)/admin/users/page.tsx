"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Filter,
  UserX,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "pending_verification" | "deactivated";
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: UserRow) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
        setActionSuccess(`User ${user.email} marked as ${newStatus}.`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch {
      // ignore
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-ink via-slate to-ink border border-cream/15 p-6 md:p-8 text-cream shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge className="bg-sand/20 text-sand border-sand/40">Access Control & Security</Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-cream">
            User Account Management
          </h1>
          <p className="text-xs sm:text-sm text-cream/70">
            Audit registered student, recruiter, faculty, and institutional accounts across the ecosystem.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email address..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-ink/5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-sand"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="recruiter">Recruiter</option>
            <option value="institution">Institution</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink/5 border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-ink/[0.01]">
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {user.name}
                    <div className="text-[10px] text-muted-foreground font-normal">{user.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    {user.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-success font-medium text-[11px]">
                        <CheckCircle2 className="size-3" /> Email Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warning font-medium text-[11px]">
                        Pending Email
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        user.status === "active"
                          ? "bg-success/15 text-success"
                          : user.status === "suspended"
                          ? "bg-danger/15 text-danger"
                          : "bg-ink/10 text-muted-foreground"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {user.role !== "admin" && (
                      <Button
                        size="sm"
                        variant={user.status === "active" ? "outline" : "default"}
                        onClick={() => handleToggleStatus(user)}
                        className={`h-7 text-[10px] rounded-full font-semibold ${
                          user.status === "active"
                            ? "border-danger text-danger hover:bg-danger/10"
                            : "bg-sand hover:bg-sand/90 text-ink"
                        }`}
                      >
                        {user.status === "active" ? (
                          <>
                            <UserX className="size-3 mr-1" /> Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-3 mr-1" /> Restore
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
