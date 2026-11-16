import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "cl_session";

const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  "/student": ["student", "job_seeker", "admin"],
  "/admin": ["admin"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if route requires role check
  let allowedRoles: string[] | null = null;
  for (const [prefix, roles] of Object.entries(ROLE_ROUTE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      allowedRoles = roles;
      break;
    }
  }

  const isSettingsRoute = pathname.startsWith("/settings");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtected = allowedRoles !== null || isSettingsRoute || isOnboardingRoute;

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

  if (allowedRoles && roleCookie) {
    if (!allowedRoles.includes(roleCookie) && roleCookie !== "admin") {
      // Cross-role unauthorized access attempt: redirect to dashboard
      const userDashboardUrl = new URL(
        roleCookie === "admin" ? "/admin/dashboard" : "/student/dashboard",
        request.url
      );
      return NextResponse.redirect(userDashboardUrl);
    }
  }

  return NextResponse.next();
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    "/student/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
  ],
};
