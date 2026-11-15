// src/lib/services/verification/urlValidator.ts

export interface UrlValidationResult {
  isValid: boolean;
  finalUrl?: string;
  isRedirect: boolean;
  requiresReview?: boolean;
  reason?: string;
}

const DEFAULT_APPROVED_DOMAINS = [
  "greenhouse.io",
  "boards.greenhouse.io",
  "boards-api.greenhouse.io",
  "lever.co",
  "jobs.lever.co",
  "ashbyhq.com",
  "jobs.ashbyhq.com",
];

/**
 * Validates application URLs and inspects redirect destinations.
 *
 * Invariant: Redirects must NOT auto-mark an opportunity invalid.
 */
export async function validateApplicationUrl(
  rawUrl: string,
  approvedDomains: string[] = DEFAULT_APPROVED_DOMAINS,
  fetchFn: typeof fetch = fetch
): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      isValid: false,
      isRedirect: false,
      reason: "Malformed application URL",
    };
  }

  // Check initial protocol
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isValid: false,
      isRedirect: false,
      reason: `Unsupported protocol "${parsed.protocol}"`,
    };
  }

  // Check if initial hostname belongs to an approved domain
  const isApproved = (host: string) =>
    approvedDomains.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );

  const initialHostname = parsed.hostname.toLowerCase();

  try {
    // Perform HEAD or GET with manual redirect handling to inspect destination
    const response = await fetchFn(rawUrl, {
      method: "HEAD",
      redirect: "manual",
    });

    const isRedirect =
      response.status === 301 ||
      response.status === 302 ||
      response.status === 307 ||
      response.status === 308;

    if (isRedirect) {
      const location = response.headers.get("Location");
      if (location) {
        const destUrl = new URL(location, rawUrl);
        const destHost = destUrl.hostname.toLowerCase();

        if (isApproved(destHost)) {
          return {
            isValid: true,
            isRedirect: true,
            finalUrl: destUrl.toString(),
            reason: `Redirected to approved domain ${destHost}`,
          };
        }

        // Redirected outside approved list: allow link but flag for human review
        return {
          isValid: true,
          isRedirect: true,
          finalUrl: destUrl.toString(),
          requiresReview: true,
          reason: `Redirected to external domain "${destHost}". Flagged for review; not auto-invalidated.`,
        };
      }
    }

    return {
      isValid: true,
      isRedirect: false,
      finalUrl: rawUrl,
      requiresReview: !isApproved(initialHostname),
      reason: isApproved(initialHostname)
        ? "Approved domain"
        : "Unlisted employer domain; flagged for review",
    };
  } catch {
    // Network error during validation: Do NOT invalidate URL, keep existing with review flag
    return {
      isValid: true,
      isRedirect: false,
      finalUrl: rawUrl,
      requiresReview: true,
      reason: "Transient network issue during redirect inspection; maintained as valid.",
    };
  }
}
