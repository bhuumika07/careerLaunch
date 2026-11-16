// src/app/api/career-roles/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { roleCatalogueService } from "@/lib/services/career-roles/roleCatalogueService";
import { personalizedJsonResponse } from "@/lib/api/response";

export interface CanonicalRoleDto {
  id: string;
  canonicalName: string;
  domain: string;
  description: string;
}

export interface DomainDto {
  id: string;
  label: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  software: "Software Engineering",
  data_ai_ml: "Data Science, AI & ML",
  design: "Product Design & UI/UX",
  devops_cloud: "Cloud & DevOps",
  security: "Cybersecurity",
  product: "Product Management",
  business: "Business Analytics",
};

/**
 * GET /api/career-roles
 * Returns canonical career roles and domains directly from roleCatalogueService.
 * Eliminates hardcoded lists in client components.
 */
export async function GET(_req: NextRequest) {
  try {
    const catalogue = await roleCatalogueService.getCatalogue();

    const roles: CanonicalRoleDto[] = catalogue
      .filter((r) => r.isActive !== false)
      .map((r) => ({
        id: r.id,
        canonicalName: r.canonicalName,
        domain: r.domain,
        description: r.description,
      }));

    const domainIds = Array.from(new Set(roles.map((r) => r.domain)));
    const domains: DomainDto[] = domainIds.map((d) => ({
      id: d,
      label: DOMAIN_LABELS[d] || d.charAt(0).toUpperCase() + d.slice(1).replace(/_/g, " "),
    }));

    return personalizedJsonResponse({
      success: true,
      roles,
      domains,
    });
  } catch (error: any) {
    return personalizedJsonResponse(
      { success: false, error: error.message || "Failed to load roles catalogue" },
      { status: 500 }
    );
  }
}
