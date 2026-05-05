-- AlterTable
ALTER TABLE "Rsvp" ADD COLUMN "waitlistPosition" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "date" DATETIME NOT NULL,
    "endTime" DATETIME,
    "category" TEXT NOT NULL DEFAULT 'other',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("capacity", "createdAt", "createdByUserId", "date", "endTime", "id", "status", "title", "updatedAt") SELECT "capacity", "createdAt", "createdByUserId", "date", "endTime", "id", "status", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
