import { IEventService } from "../../src/event_dash/EventService"; // adjust path
import { PrismaClient } from "@prisma/client";

describe("Dashboard Access Control", () => {
  let prisma: PrismaClient;
  let service: IEventService;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new EventService(prisma);
  });

  it("organizer sees only their events", async () => {
    await prisma.event.create({
      data: { id: "1", title: "A", organizerId: "org1", capacity: 10, status: "DRAFT" },
    });

    await prisma.event.create({
      data: { id: "2", title: "B", organizerId: "org2", capacity: 10, status: "DRAFT" },
    });

    const result = await service.getDashboardEvents("org1", "ORGANIZER");

    expect(result.every(e => e.organizerId === "org1")).toBe(true);
  });

  it("admin sees all events", async () => {
    const result = await service.getDashboardEvents("admin1", "ADMIN");

    const all = await prisma.event.findMany();
    expect(result.length).toBe(all.length);
  });

  it("member is rejected", async () => {
    await expect(
      service.getDashboardEvents("m1", "MEMBER")
    ).rejects.toThrow();
  });
});