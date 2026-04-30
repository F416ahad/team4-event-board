import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export function createTestPrisma(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL?.replace('file:', '') ?? './prisma/dev.db',
  });
  return new PrismaClient({ adapter });
}