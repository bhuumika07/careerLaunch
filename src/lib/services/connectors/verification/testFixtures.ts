// src/lib/services/connectors/verification/testFixtures.ts
import type { ConnectorOpportunity } from "../types.ts";

export const VERIFICATION_TEST_FIXTURES: {
  legitimateAtsJob: ConnectorOpportunity;
  fresherFriendlyInternship: ConnectorOpportunity;
  feeBasedScamJob: ConnectorOpportunity;
  freeEmailScamJob: ConnectorOpportunity;
  expiredClosedJob: ConnectorOpportunity;
  staleJob: ConnectorOpportunity;
} = {
  legitimateAtsJob: {
    id: "opp_cf_live_01",
    title: "Systems Engineer, Distributed Edge",
    organization: "Cloudflare",
    description:
      "Join Cloudflare's core infrastructure team to build globally distributed, low-latency edge caching and DNS proxying systems using Go, Rust, and Linux network namespaces. Requires strong communication skills, problem solving, and experience with Docker.",
    type: "job",
    experienceLevel: "mid",
    location: "Bengaluru, Karnataka, India",
    isRemote: false,
    salary: "₹25 - 40 LPA",
    skills: ["Go", "Rust", "Docker", "Linux"],
    postedDate: "2026-11-14T08:00:00.000Z",
    originalUrl: "https://boards.greenhouse.io/cloudflare/jobs/8038898",
    sourceId: "greenhouse",
    sourceExternalId: "8038898",
    fetchedAt: "2026-11-15T10:00:00.000Z",
    lastVerifiedAt: "2026-11-15T10:00:00.000Z",
    verificationStatus: "verified",
    rawPayloadRef: "raw://greenhouse/8038898_live.json",
  },

  fresherFriendlyInternship: {
    id: "opp_figma_intern_02",
    title: "Software Engineering Intern (Summer 2027)",
    organization: "Figma",
    description:
      "Summer internship open to current college students and new graduates. You will collaborate with senior engineers to build interactive React and TypeScript canvas features. Requires 0 - 1 years of experience, basic data structures knowledge, and team collaboration.",
    type: "internship",
    experienceLevel: "fresher",
    location: "San Francisco, CA",
    isRemote: true,
    salary: "$55 / hour",
    skills: ["React", "TypeScript", "JavaScript"],
    postedDate: "2026-11-15T09:00:00.000Z",
    originalUrl: "https://boards.greenhouse.io/figma/jobs/6178851004",
    sourceId: "greenhouse",
    sourceExternalId: "6178851004",
    fetchedAt: "2026-11-15T12:00:00.000Z",
    lastVerifiedAt: "2026-11-15T12:00:00.000Z",
    verificationStatus: "verified",
    rawPayloadRef: "raw://greenhouse/6178851004_intern.json",
  },

  feeBasedScamJob: {
    id: "opp_scam_fee_03",
    title: "Data Entry Operator / Remote Assistant",
    organization: "Apex Global Solutions",
    description:
      "Work from home data entry operator. Earn ₹50,000 daily. To confirm your interview slot, pay a mandatory registration fee of ₹499 via UPI. Contact HR on Telegram @apex_global_hr to receive registration link.",
    type: "job",
    experienceLevel: "fresher",
    location: "New Delhi, Delhi, India",
    isRemote: true,
    salary: "₹50,000 daily",
    skills: ["Data Entry", "MS Excel"],
    postedDate: "2026-11-15T05:00:00.000Z",
    originalUrl: "https://apex-jobs-fake.com/register?fee=499",
    sourceId: "job_board",
    sourceExternalId: "scam_fee_001",
    fetchedAt: "2026-11-15T06:00:00.000Z",
    lastVerifiedAt: "2026-11-15T06:00:00.000Z",
    verificationStatus: "pending",
  },

  freeEmailScamJob: {
    id: "opp_scam_email_04",
    title: "Junior Backend Developer",
    organization: "Global Tech Innovations",
    description:
      "Immediate opening for Junior Developer. No interview required, direct selection upon resume submission. Send CV to hr.recruiter2026@gmail.com along with refundable security deposit receipt.",
    type: "job",
    experienceLevel: "fresher",
    location: "Bengaluru, Karnataka, India",
    isRemote: true,
    skills: ["Python", "Django"],
    postedDate: "2026-11-14T11:00:00.000Z",
    originalUrl: "https://globaltech-hiring.info/apply",
    sourceId: "job_board",
    fetchedAt: "2026-11-15T07:00:00.000Z",
    verificationStatus: "pending",
  },

  expiredClosedJob: {
    id: "opp_expired_05",
    title: "Machine Learning Researcher",
    organization: "Datadog",
    description:
      "Develop large language models for observability telemetry and anomaly detection using PyTorch.",
    type: "research",
    experienceLevel: "senior",
    location: "New York, NY",
    isRemote: false,
    skills: ["PyTorch", "Python", "Machine Learning"],
    originalUrl: "https://boards.greenhouse.io/datadog/jobs/99999999",
    sourceId: "greenhouse",
    sourceExternalId: "99999999",
    fetchedAt: "2026-11-10T10:00:00.000Z",
    lastVerifiedAt: "2026-11-10T10:00:00.000Z",
    verificationStatus: "verified",
  },

  staleJob: {
    id: "opp_stale_06",
    title: "Cloud Infrastructure Architect",
    organization: "GitLab",
    description:
      "Design resilient Kubernetes clusters and AWS infrastructure for GitLab Dedicated.",
    type: "job",
    experienceLevel: "senior",
    location: "Remote",
    isRemote: true,
    skills: ["Kubernetes", "AWS", "Terraform", "Go"],
    originalUrl: "https://boards.greenhouse.io/gitlab/jobs/7777777",
    sourceId: "greenhouse",
    sourceExternalId: "7777777",
    fetchedAt: "2026-11-12T00:00:00.000Z",
    lastVerifiedAt: "2026-11-12T00:00:00.000Z", // 3 days ago (stale)
    verificationStatus: "verified",
  },
};
