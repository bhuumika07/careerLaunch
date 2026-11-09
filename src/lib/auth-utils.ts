import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Excellent";
  color: string;
  checks: {
    length: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (checks.length) score += 1;
  if (checks.hasUppercase && checks.hasLowercase) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;

  const labels: PasswordStrength["label"][] = [
    "Very Weak",
    "Weak",
    "Fair",
    "Strong",
    "Excellent",
  ];

  const colors = [
    "#C26B5A", // Danger (Terracotta)
    "#E07A5F",
    "#D4A843", // Warning (Warm Amber)
    "#9CB380",
    "#7B9E6B", // Success (Olive Green)
  ];

  return {
    score,
    label: labels[score] || "Very Weak",
    color: colors[score] || "#C26B5A",
    checks,
  };
}
