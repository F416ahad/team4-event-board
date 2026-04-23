import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DashboardService } from "../../src/event_dash/EventService";
import type { UserRole } from "../../src/auth/User";

describe("Dashboard Actions (Publish / Cancel)", () => {
  let prisma: PrismaClient;
  let service: DashboardService;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new DashboardService(prisma);

    await prisma.rSVP.deleteMany();
    await prisma.event.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  // ✅ Organizer can publish their own event
  it("organizer can publish their own event", async () => {
    const event = await prisma.event.create({
      data: {
        id: "1",
        title: "Draft Event",
        organizerId: "org1",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    await service.getEventForDashboard(
      "PUBLISHED"
    );

    const updated = await prisma.event.findUnique({ where: { id: event.id } });

    expect(updated?.status).toBe("PUBLISHED");
  });

  // ❌ Organizer cannot modify someone else's event
  it("organizer cannot publish another organizer's event", async () => {
    const event = await prisma.event.create({
      data: {
        id: "2",
        title: "Other Event",
        organizerId: "org2",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    await expect(
      service.getDashboard(
        "org2",
        "organizer" as UserRole
      )
    ).rejects.toThrow();
  });

  // ✅ Admin can publish any event
  it("admin can publish any event", async () => {
    const event = await prisma.event.create({
      data: {
        id: "3",
        title: "Admin Event",
        organizerId: "org2",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    await service.updateEventStatus(
      event.id,
      "admin1",
      "admin" as UserRole,
      "PUBLISHED"
    );

    const updated = await prisma.event.findUnique({ where: { id: event.id } });

    expect(updated?.status).toBe("PUBLISHED");
  });

  // ✅ Organizer can cancel their own event
  it("organizer can cancel their own event", async () => {
    const event = await prisma.event.create({
      data: {
        id: "4",
        title: "Cancelable Event",
        organizerId: "org1",
        capacity: 10,
        status: "PUBLISHED",
        date: new Date(),
        category: "test",
      },
    });

    await service.updateEventStatus(
      event.id,
      "org1",
      "organizer" as UserRole,
      "CANCELLED"
    );

    const updated = await prisma.event.findUnique({ where: { id: event.id } });

    expect(updated?.status).toBe("CANCELLED");
  });

  // ❌ Member cannot perform actions
  it("member cannot update event status", async () => {
    const event = await prisma.event.create({
      data: {
        id: "5",
        title: "Member Blocked",
        organizerId: "org1",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    await expect(
      service.updateEventStatus(
        event.id,
        "m1",
        "member" as UserRole,
        "PUBLISHED"
      )
    ).rejects.toThrow("Forbidden");
  });
});