// src/lib/services/connectors/seedData.ts
import type { SourceRegistryEntry } from "./types.ts";

/**
 * Pre-configured seed sources according to Chunk 1 evaluation & approval.
 *
 * Key Invariants:
 * - Naukri: Seeded with status 'external_link_only' (NO automated scraping/republishing per Terms of Use).
 * - AICTE: Seeded with status 'external_link_only' (Link-out destination).
 * - Greenhouse, Lever, Ashby: Seeded with status 'active' (Approved public ATS APIs).
 * - Adzuna, NCS: Seeded with status 'permission_pending' (Subject to commercial/developer API key license).
 */
export const INITIAL_SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    id: "naukri",
    name: "Naukri.com",
    category: "job_board",
    geography: "India",
    accessMethod: "external_search",
    status: "external_link_only",
    termsUrl: "https://www.naukri.com/termsconditions",
    refreshInterval: 0,
    attributionText: "Direct external search destination. Listings not stored or redistributed.",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  {
    id: "greenhouse",
    name: "Greenhouse Public Job Board API",
    category: "ats",
    geography: "Global",
    accessMethod: "public_api",
    status: "active",
    termsUrl: "https://support.greenhouse.io",
    refreshInterval: 60,
    attributionText: "Powered by Greenhouse Official Job Board API",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  {
    id: "lever",
    name: "Lever Public Postings API",
    category: "ats",
    geography: "Global",
    accessMethod: "public_api",
    status: "active",
    termsUrl: "https://www.lever.co",
    refreshInterval: 60,
    attributionText: "Powered by Lever Official Postings API",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  {
    id: "ashby",
    name: "Ashby Public Job Board Posting API",
    category: "ats",
    geography: "Global",
    accessMethod: "public_api",
    status: "active",
    termsUrl: "https://www.ashbyhq.com",
    refreshInterval: 60,
    attributionText: "Powered by Ashby Official Posting API",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  {
    id: "aicte",
    name: "AICTE National Internship Portal",
    category: "internship_portal",
    geography: "India",
    accessMethod: "external_search",
    status: "external_link_only",
    termsUrl: "https://internship.aicte-india.org",
    refreshInterval: 0,
    attributionText: "Direct external destination for AICTE internship programs.",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  {
    id: "adzuna",
    name: "Adzuna Job Search API (India)",
    category: "job_board",
    geography: "India",
    accessMethod: "licensed_api",
    status: "permission_pending",
    termsUrl: "https://developer.adzuna.com",
    refreshInterval: 360,
    attributionText: "Job search data powered by Adzuna API.",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
  {
    id: "ncs",
    name: "National Career Service (Ministry of Labour & Employment)",
    category: "government",
    geography: "India",
    accessMethod: "public_api",
    status: "permission_pending",
    termsUrl: "https://data.gov.in",
    refreshInterval: 720,
    attributionText: "Open Data under National Data Sharing and Accessibility Policy (NDSAP).",
    createdAt: "2026-11-15T00:00:00.000Z",
    updatedAt: "2026-11-15T00:00:00.000Z",
  },
];
