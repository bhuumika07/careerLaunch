import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb } from "@/lib/db";
import { comparePassword } from "@/lib/auth-utils";
import { createSession } from "@/lib/session";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate limiting check
    const rateLimitKey = `login:${normalizedEmail}`;
    const rateCheck = checkRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
          code: "RATE_LIMITED",
          retryAfter: rateCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds ?? 900),
          },
        }
      );
    }

    // 2. Lookup user in database
    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      const attempt = recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
          remainingAttempts: attempt.remainingAttempts,
        },
        { status: 401 }
      );
    }

    if (user.status === "deactivated") {
      return NextResponse.json(
        {
          success: false,
          error: "This account has been deactivated. Please contact support to reactivate.",
          code: "ACCOUNT_DEACTIVATED",
        },
        { status: 403 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          error: "This account has been suspended by an administrator.",
          code: "ACCOUNT_SUSPENDED",
        },
        { status: 403 }
      );
    }

    // 3. Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const attempt = recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
          remainingAttempts: attempt.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 4. Success: Reset rate limit
    resetRateLimit(rateLimitKey);

    // 5. Create secure session cookie
    await createSession(user.id, user.role);

    // Determine redirect destination
    const destination = user.onboardingCompleted
      ? `/${user.role}/dashboard`
      : `/onboarding`;

    return NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
      },
      redirectTo: destination,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
