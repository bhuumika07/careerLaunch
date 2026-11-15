// prisma/seed.ts – Seed initial Source catalogue (disabled, unreviewed)
import { PrismaClient, SourceCategory, CollectionMethod, ComplianceStatus, SourceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sources = [
    {
      name: "AICTE Internship Portal",
      baseUrl: "https://internshipportal.aicte-india.org",
      category: SourceCategory.internships,
      collectionMethod: CollectionMethod.scrape,
      config: {},
    },
    {
      name: "National Career Service",
      baseUrl: "https://nationalcareerservice.gov.in",
      category: SourceCategory.jobs,
      collectionMethod: CollectionMethod.api,
      config: {},
    },
    {
      name: "Official Company Career Pages (sample)",
      baseUrl: "https://careers.example.com",
      category: SourceCategory.jobs,
      collectionMethod: CollectionMethod.scrape,
      config: {},
    },
    {
      name: "ANRF",
      baseUrl: "https://anrf.gov.in",
      category: SourceCategory.research,
      collectionMethod: CollectionMethod.rss,
      config: {},
    },
    {
      name: "National Scholarship Portal",
      baseUrl: "https://scholarship.gov.in",
      category: SourceCategory.scholarships,
      collectionMethod: CollectionMethod.api,
      config: {},
    },
    {
      name: "SWAYAM",
      baseUrl: "https://swayam.gov.in",
      category: SourceCategory.training,
      collectionMethod: CollectionMethod.rss,
      config: {},
    },
  ];

  for (const src of sources) {
    await prisma.source.create({
      data: {
        name: src.name,
        baseUrl: src.baseUrl,
        category: src.category,
        collectionMethod: src.collectionMethod,
        config: src.config,
        complianceStatus: ComplianceStatus.unreviewed,
        status: SourceStatus.disabled,
        collectionFrequency: 1440, // daily by default
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
