"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowLeft,
  User,
  Lock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AccountSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [submittingProfile, setSubmittingProfile] = React.useState(false);
  const [submittingPassword, setSubmittingPassword] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState(false);

  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const [account, setAccount] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  } | null>(null);

  // Profile fields
  const [name, setName] = React.useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Deactivate modal
  const [deactivateModalOpen, setDeactivateModalOpen] = React.useState(false);
  const [deactivatePassword, setDeactivatePassword] = React.useState("");
  const [deactivateError, setDeactivateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchAccount = async () => {
      try {
        const res = await fetch("/api/user/account");
        const data = await res.json();
        if (mounted && res.ok && data.success) {
          setAccount(data.account);
          setName(data.account.name);
        } else if (mounted) {
          router.push("/login?redirect=/settings/account");
        }
      } catch {
        if (mounted) setMessage({ text: "Failed to load account information.", type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAccount();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmittingProfile(true);

    try {
      const res = await fetch("/api/user/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ text: data.error || "Failed to update profile", type: "error" });
      } else {
        setMessage({ text: "Account profile updated successfully.", type: "success" });
      }
    } catch {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ text: "New password must be at least 8 characters long.", type: "error" });
      return;
    }

    setSubmittingPassword(true);

    try {
      const res = await fetch("/api/user/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ text: data.error || "Failed to change password", type: "error" });
      } else {
        setMessage({ text: "Password changed successfully.", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateError(null);
    setDeactivating(true);

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deactivatePassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setDeactivateError(data.error || "Deactivation failed.");
        setDeactivating(false);
        return;
      }

      setDeactivateModalOpen(false);
      router.push("/");
    } catch {
      setDeactivateError("Network error occurred.");
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink text-cream">
        <div className="size-8 border-2 border-sand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = account?.role || "student";

  return (
    <div className="min-h-screen bg-ink text-cream selection:bg-sand/30 selection:text-sand py-12 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation header */}
        <div className="flex items-center justify-between border-b border-cream/10 pb-5">
          <Link
            href={`/${role}/dashboard`}
            className="inline-flex items-center gap-2 text-xs text-cream/70 hover:text-cream transition-colors font-medium"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-sand font-semibold uppercase tracking-wider">
            <Shield className="size-3.5" />
            <span>Account Security</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-cream">
            Account Settings
          </h1>
          <p className="text-sm text-cream/60">
            Manage your credentials, profile details, and account preferences.
          </p>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              message.type === "success"
                ? "border-success/40 bg-success/10 text-cream"
                : "border-danger/40 bg-danger/10 text-cream"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="size-4 text-success shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-danger shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. PERSONAL DETAILS CARD */}
        <form
          onSubmit={handleUpdateProfile}
          className="p-8 rounded-[22px] border border-cream/15 bg-white/[0.04] backdrop-blur-xl space-y-5"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-sand uppercase tracking-wider">
            <User className="size-4 text-sand" />
            <span>Profile Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-cream/80 font-medium">Display Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-cream/80 font-medium">Registered Email</Label>
              <Input
                value={account?.email || ""}
                disabled
                className="bg-white/[0.02] border-cream/10 text-cream/50 rounded-xl cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PillButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingProfile}
              icon={<Save className="size-3.5" />}
            >
              {submittingProfile ? "Saving..." : "Save Details"}
            </PillButton>
          </div>
        </form>

        {/* 2. CHANGE PASSWORD CARD */}
        <form
          onSubmit={handleChangePassword}
          className="p-8 rounded-[22px] border border-cream/15 bg-white/[0.04] backdrop-blur-xl space-y-5"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-sand uppercase tracking-wider">
            <Lock className="size-4 text-sand" />
            <span>Change Password</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-cream/80 font-medium">Current Password</Label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-cream/80 font-medium">New Password</Label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-cream/80 font-medium">Confirm New Password</Label>
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="bg-white/[0.05] border-cream/15 text-cream rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PillButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingPassword}
              icon={<Lock className="size-3.5" />}
            >
              {submittingPassword ? "Updating..." : "Update Password"}
            </PillButton>
          </div>
        </form>

        {/* 3. DANGER ZONE: DEACTIVATE ACCOUNT */}
        <div className="p-8 rounded-[22px] border border-danger/30 bg-danger/5 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-danger uppercase tracking-wider">
            <AlertTriangle className="size-4 text-danger" />
            <span>Danger Zone</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-lg">
              <h3 className="font-heading font-bold text-base text-cream">
                Deactivate Account
              </h3>
              <p className="text-xs text-cream/60 leading-relaxed">
                Deactivating disables your portal access, revokes active sessions, and hides your public telemetry profile.
              </p>
            </div>

            <PillButton
              variant="secondary"
              size="sm"
              onClick={() => setDeactivateModalOpen(true)}
              className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger shrink-0"
              icon={<Trash2 className="size-3.5 text-danger" />}
            >
              Deactivate Account
            </PillButton>
          </div>
        </div>

        {/* Deactivation Confirmation Modal */}
        <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold flex items-center gap-2 text-danger">
                <AlertTriangle className="size-5 text-danger" />
                Confirm Account Deactivation
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-1">
                This action will revoke active login sessions and freeze your verified portfolio. Enter your password to confirm.
              </DialogDescription>
            </DialogHeader>

            {deactivateError && (
              <div className="p-2.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs">
                {deactivateError}
              </div>
            )}

            <div className="space-y-2 py-2">
              <Label className="text-xs font-semibold">Enter Password to Confirm</Label>
              <Input
                type="password"
                required
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                placeholder="Your current password"
                className="bg-background/80 border-border text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <PillButton
                variant="ghost"
                size="sm"
                onClick={() => setDeactivateModalOpen(false)}
              >
                Cancel
              </PillButton>
              <PillButton
                variant="primary"
                size="sm"
                disabled={deactivating || !deactivatePassword}
                onClick={handleDeactivate}
                className="bg-danger text-white hover:bg-danger/90"
              >
                {deactivating ? "Deactivating..." : "Yes, Deactivate My Account"}
              </PillButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
