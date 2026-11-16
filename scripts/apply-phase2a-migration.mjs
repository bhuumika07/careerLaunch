import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(process.cwd(), "prisma", "migrations", "20261116_phase2a_onboarding_and_provenance.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("Applying Phase 2A migration SQL...");
  
  // Split statements by semicolon or execute directly
  // In pg / prisma, executeRawUnsafe can execute multiple statements if the driver allows or in a transaction.
  await prisma.$executeRawUnsafe(sql);
  console.log("Migration executed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
