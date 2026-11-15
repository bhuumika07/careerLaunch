// Validation service for Opportunity records
import { PrismaClient, VerificationStatus, LifecycleStatus } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

/**
 * Perform required‑field checks and simple heuristics.
 * Returns an object with flags that can be persisted on the Opportunity.
 */
export async function validateOpportunity(opportunityId: string) {
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) throw new Error(`Opportunity ${opportunityId} not found`);

  const flags: {
    missingFields: string[];
    urlReachable?: boolean;
    suspicious?: boolean;
    relevanceScore?: number;
  } = { missingFields: [] };

  // Required fields
  if (!opp.title) flags.missingFields.push("title");
  if (!opp.organizationName) flags.missingFields.push("organizationName");
  if (!opp.sourceUrl) flags.missingFields.push("sourceUrl");

  // URL reachability (simple HEAD request, timeout 5s)
  if (opp.sourceUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(opp.sourceUrl, { method: "HEAD", signal: controller.signal as any });
      clearTimeout(timeout);
      flags.urlReachable = res.ok;
    } catch (_) {
      flags.urlReachable = false;
    }
  }

  // Spam / suspicious heuristics – look for payment requests etc.
  if (opp.description) {
    const low = opp.description.toLowerCase();
    const suspiciousPhrases = ["pay", "payment", "transfer money", "visa", "personal info", "bank account"];
    flags.suspicious = suspiciousPhrases.some((p) => low.includes(p));
  }

  // Simple relevance check – placeholder (could be a score from 0‑1)
  flags.relevanceScore = 1; // assume relevant for now

  // Update verificationStatus based on checks
  let newStatus = opp.verificationStatus;
  if (flags.missingFields.length > 0 || flags.urlReachable === false) {
    newStatus = VerificationStatus.pending; // keep pending for admin review
  } else if (flags.suspicious) {
    newStatus = VerificationStatus.unverified;
  } else {
    newStatus = VerificationStatus.verified;
  }

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      verificationStatus: newStatus,
      missingFields: flags.missingFields,
    },
  });

  return flags;
}
