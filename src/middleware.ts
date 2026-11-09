import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "cl_session";

const ROLE_ROUTE_PREFIXES: Record<string, string> = {
  "/student": "student",
  "/faculty": "faculty",
  "/recruiter": "recruiter",
  "/institution": "institution",
  "/admin": "admin",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if route requires role check
  let requiredRole: string | null = null;
  for (const [prefix, role] of Object.entries(ROLE_ROUTE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      requiredRole = role;
      break;
    }
  }

  const isSettingsRoute = pathname.startsWith("/settings");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtected = requiredRole !== null || isSettingsRoute || isOnboardingRoute;

  if (!isProtected) {
    return NextResponse.next();
  }

  // 2. Validate session cookie presence
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify role matching from companion role cookie
  const roleCookie = request.cookies.get("cl_role")?.value;

  if (requiredRole && roleCookie) {
    if (roleCookie !== requiredRole && roleCookie !== "admin") {
      // Cross-role unauthorized access attempt: redirect to their own dashboard
      const userDashboardUrl = new URL(`/${roleCookie}/dashboard`, request.url);
      return NextResponse.redirect(userDashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/faculty/:path*",
    "/recruiter/:path*",
    "/institution/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
  ],
};
