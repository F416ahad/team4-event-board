import { PrismaClient } from "@prisma/client";
import type { DashboardEventDTO } from "../../src/event_dash/EventService";
import { DashboardService } from "../../src/event_dash/EventService";
import { InMemoryEventRepository } from "../../src/rsvp/InMemoryRepository";
import { EventService } from "../../src/rsvp/waitlistService";
import type { UserRole } from "../../src/auth/User";

describe("Dashboard Events - Filtering, Grouping, and Correctness", () => {
  let prisma: PrismaClient;
  let service: EventService;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new EventService(prisma);
  });

  afterEach(async () => {
    await prisma.rSVP.deleteMany();
    await prisma.event.deleteMany();
    await prisma.$disconnect();
  });

  it("organizer only sees their own events", async () => {
    await prisma.event.create({
      data: {
        id: "1",
        title: "Org1 Event",
        organizerId: "org1",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "Conference"
      },
    });

    await prisma.event.create({
      data: {
        id: "2",
        title: "Org2 Event",
        organizerId: "org2",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "Workshop"
      },
    });

    const result = await service.getDashboard(
      "org1",
      "ADMIN"
      
    );

    expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        organizerId: expect.any(String),
        status: expect.any(String),
        capacity: expect.any(Number),
        attendeeCount: expect.any(Number),
        attendingRatio: expect.stringContaining("/"),
    });

  it("admin sees all events", async () => {
    const result = await service.getDashboard(
      "admin1",
      "ADMIN"
    );

    expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        organizerId: expect.any(String),
        status: expect.any(String),
        capacity: expect.any(Number),
        attendeeCount: expect.any(Number),
        attendingRatio: expect.stringContaining("/"),
    });
  });

  it("groups events by status correctly", async () => {
    const result = await service.getDashboard(
      "admin1",
      "ADMIN" 
    );

    expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        organizerId: expect.any(String),
        status: expect.any(String),
        capacity: expect.any(Number),
        attendeeCount: expect.any(Number),
        attendingRatio: expect.stringContaining("/"),
    });


    const drafts = result.filter((e) => e.status === "DRAFT");

    const published = result.filter((e) => e.status === "PUBLISHED");

    const cancelled = result.filter((e) => e.status === "CANCELLED");

    const past = result.filter((e) => e.status === "PAST");

    expect(drafts).toBeDefined();
    expect(published).toBeDefined();
    expect(cancelled).toBeDefined();
    expect(past).toBeDefined();
  });

  it("calculates attendance correctly from RSVPs", async () => {
    const event = await prisma.event.create({
      data: {
        id: "1",
        title: "Event",
        organizerId: "org1",
        capacity: 5,
        status: "PUBLISHED",
        rsvps: {
          create: [
            { memberId: "u1", status: "ATTENDING" },
            { memberId: "u2", status: "ATTENDING" },
            { memberId: "u3", status: "WAITLISTED" },
          ],
        },
        date: new Date(),
        category: "Meetup"
      },
    });

    const result: DashboardEventDTO[] = await service.getDashboard(
      "org1",
      "ADMIN"   
    );

    const match = result.find((e) => e.id === event.id);

    expect(match?.attendeeCount).toBe(2);
    expect(match?.capacity).toBe(5);
    expect(match?.attendingRatio).toBe("2 / 5");
  });

  it("member access is forbidden", async () => {
    await expect(
      service.getDashboard("m1", "ADMIN")
    ).rejects.toThrow("Forbidden");
  });
});
});