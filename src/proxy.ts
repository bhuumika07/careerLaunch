import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "cl_session";

const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  "/student": ["student", "job_seeker", "admin"],
  "/admin": ["admin"],
  "/resume": ["student", "job_seeker", "admin"],
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
  const isOpportunitiesRoute = pathname.startsWith("/opportunities");
  const isNotificationsRoute = pathname.startsWith("/notifications");
  const isProtected =
    allowedRoles !== null ||
    isSettingsRoute ||
    isOnboardingRoute ||
    isOpportunitiesRoute ||
    isNotificationsRoute;

  if (!isProtected) {
    return NextResponse.next();
  }

  // 2. Validate session cookie presence
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    const redirectPath = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("redirect", redirectPath);
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
    "/resume/:path*",
    "/resume",
    "/onboarding/:path*",
    "/settings/:path*",
    "/opportunities/:path*",
    "/opportunities",
    "/notifications/:path*",
    "/notifications",
  ],
};
