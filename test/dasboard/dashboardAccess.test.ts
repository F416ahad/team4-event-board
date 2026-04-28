import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DashboardService } from "../../src/event_dash/EventService"; // adjust if needed
import type { UserRole } from "../../src/auth/User";

describe("Dashboard Access Control", () => {
  let prisma: PrismaClient;
  let service: DashboardService;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new DashboardService(prisma);

    // Clean DB before each test
    await prisma.rSVP.deleteMany();
    await prisma.event.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it("organizer sees only their events", async () => {
    await prisma.event.create({
      data: {
        id: "1",
        title: "A",
        organizerId: "org1",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    await prisma.event.create({
      data: {
        id: "2",
        title: "B",
        organizerId: "org2",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    const result = await service.getDashboard(
      "org1",
      "organizer" as UserRole
    );

    expect(result.every((e) => e.organizerId === "org1")).toBe(true);
  });

  it("admin sees all events", async () => {
    await prisma.event.create({
      data: {
        id: "1",
        title: "A",
        organizerId: "org1",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    await prisma.event.create({
      data: {
        id: "2",
        title: "B",
        organizerId: "org2",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    const result = await service.getDashboard(
      "admin1",
      "admin" as UserRole
    );

    const all = await prisma.event.findMany();
    expect(result.length).toBe(all.length);
  });

  it("member is rejected", async () => {
    await expect(
      service.getDashboard("m1", "member" as UserRole)
    ).rejects.toThrow("Forbidden");
  });
});