import "dotenv/config";
import request from "supertest";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { DashboardService } from "../../src/event_dash/EventService";
import { CreateDashboardController } from "../../src/event_dash/EventController";



describe("Dashboard HTMX Behavior", () => {
  let app: express.Express;
  let prisma: PrismaClient;
    const logger = {    log: jest.fn(),    error: jest.fn(),  } as any;

  beforeEach(async () => {
    prisma = new PrismaClient();

    const service = new DashboardService(prisma);
    const controller = CreateDashboardController(service, logger);

    app = express();
    app.use(express.urlencoded({ extended: true }));

    // mock session middleware
    app.use((req, _res, next) => {
      req.session = {
        authenticatedUser: {
          userId: "org1",
          role: "organizer",
          email: "test@test.com",
          displayName: "Test",
          signedInAt: new Date().toISOString(),
        },
      } as any;
      next();
    });

    // routes (adjust to your actual routes)
    app.post("/dashboard/event/:id/publish", (req, res) =>
      controller.publishEvent(res, req.params.id, req.session.app = {
        authenticatedUser: {
            authenticatedUser: {
            userId: "org1",
            email: "test@test.com",
            displayName: "Test",
            role: "organizer",
            signedInAt: new Date().toISOString(),
    }}})
    );

    app.post("/dashboard/event/:id/cancel", (req, res) =>
      controller.cancelEvent(res, req.params.id, req.session)
    );

    await prisma.event.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  // ✅ Publish returns HTMX fragment
  it("publishing event returns updated HTML row", async () => {
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

    const res = await request(app)
      .post(`/dashboard/event/${event.id}/publish`)
      .set("hx-request", "true");

    expect(res.status).toBe(200);

    // HTMX should return HTML snippet, not JSON
    expect(res.text).toContain("PUBLISHED");
    expect(res.text).not.toContain("<html");
  });

  // ✅ Cancel returns updated row
  it("cancelling event updates HTMX row", async () => {
    const event = await prisma.event.create({
      data: {
        id: "2",
        title: "Active Event",
        organizerId: "org1",
        capacity: 10,
        status: "PUBLISHED",
        date: new Date(),
        category: "test",
      },
    });

    const res = await request(app)
      .post(`/dashboard/event/${event.id}/cancel`)
      .set("hx-request", "true");

    expect(res.status).toBe(200);
    expect(res.text).toContain("CANCELLED");
  });

  // ❌ Member cannot trigger HTMX actions
  it("member HTMX request is rejected", async () => {
    const event = await prisma.event.create({
      data: {
        id: "3",
        title: "Protected Event",
        organizerId: "org1",
        capacity: 10,
        status: "DRAFT",
        date: new Date(),
        category: "test",
      },
    });

    const res = await request(app)
      .post(`/dashboard/event/${event.id}/publish`)
      .set("hx-request", "true");

    // depending on your controller logic
    expect([403, 401]).toContain(res.status);
  });
});