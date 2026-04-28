// src/tests/feature8-dashboard.test.ts
import {
  InMemoryEventRepository,
  CreateInMemoryEventRepository,
  type InMemoryEvent,
  type InMemoryRSVP,
} from "../rsvp/InMemoryRepository";

// ── Fixtures ────────────────────────────────────────────────────────

const ORGANIZER_ID = "organizer-1";
const OTHER_ORGANIZER_ID = "organizer-2";
const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";

function makeEvent(overrides: Partial<InMemoryEvent> = {}): InMemoryEvent {
  return {
    id: "event-1",
    title: "Test Event",
    date: new Date("2025-06-01"),
    category: "Workshop",
    capacity: 10,
    organizerId: ORGANIZER_ID,
    status: "PUBLISHED",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRsvp(overrides: Partial<InMemoryRSVP> = {}): InMemoryRSVP {
  return {
    id: "rsvp-1",
    eventId: "event-1",
    memberId: MEMBER_ID,
    status: "ATTENDING",
    waitlistPosition: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Feature 8 — Organizer Event Dashboard", () => {
  let repo: InMemoryEventRepository;

  beforeEach(() => {
    repo = CreateInMemoryEventRepository();
  });

  // ── Authorization ──────────────────────────────────────────────────

  describe("authorization", () => {
    it("rejects members with UnauthorizedError", async () => {
      const result = await repo.getEventsForOrganizer(MEMBER_ID, "user");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.value.name).toBe("UnauthorizedError");
      }
    });

    it("allows staff to access the dashboard", async () => {
      repo.seedEvent(makeEvent());
      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
    });

    it("allows admin to access the dashboard", async () => {
      repo.seedEvent(makeEvent());
      const result = await repo.getEventsForOrganizer(ADMIN_ID, "admin");
      expect(result.ok).toBe(true);
    });
  });

  // ── Organizer sees only their own events ──────────────────────────

  describe("organizer event visibility", () => {
    it("organizer only sees their own events", async () => {
      repo.seedEvent(makeEvent({ id: "e1", organizerId: ORGANIZER_ID }));
      repo.seedEvent(makeEvent({ id: "e2", organizerId: OTHER_ORGANIZER_ID }));

      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const all = Object.values(result.value).flat();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe("e1");
    });

    it("organizer sees zero events when they have none", async () => {
      repo.seedEvent(makeEvent({ organizerId: OTHER_ORGANIZER_ID }));

      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const all = Object.values(result.value).flat();
      expect(all).toHaveLength(0);
    });
  });

  // ── Admin sees all events ─────────────────────────────────────────

  describe("admin event visibility", () => {
    it("admin sees events from all organizers", async () => {
      repo.seedEvent(makeEvent({ id: "e1", organizerId: ORGANIZER_ID }));
      repo.seedEvent(makeEvent({ id: "e2", organizerId: OTHER_ORGANIZER_ID }));

      const result = await repo.getEventsForOrganizer(ADMIN_ID, "admin");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const all = Object.values(result.value).flat();
      expect(all).toHaveLength(2);
    });
  });

  // ── Grouping by status ────────────────────────────────────────────

  describe("grouping by status", () => {
    it("groups events correctly by status", async () => {
      repo.seedEvent(makeEvent({ id: "e1", status: "PUBLISHED" }));
      repo.seedEvent(makeEvent({ id: "e2", status: "DRAFT" }));
      repo.seedEvent(makeEvent({ id: "e3", status: "CANCELLED" }));
      repo.seedEvent(makeEvent({ id: "e4", status: "PAST" }));

      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.PUBLISHED).toHaveLength(1);
      expect(result.value.DRAFT).toHaveLength(1);
      expect(result.value.CANCELLED).toHaveLength(1);
      expect(result.value.PAST).toHaveLength(1);
    });

    it("returns empty arrays for groups with no events", async () => {
      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.PUBLISHED).toEqual([]);
      expect(result.value.DRAFT).toEqual([]);
    });
  });

  // ── Attendee counts ───────────────────────────────────────────────

  describe("attendee counts", () => {
    it("counts only ATTENDING rsvps, not waitlisted or cancelled", async () => {
      repo.seedEvent(makeEvent({ id: "e1" }));
      repo.seedRsvp(makeRsvp({ id: "r1", eventId: "e1", memberId: "m1", status: "ATTENDING" }));
      repo.seedRsvp(makeRsvp({ id: "r2", eventId: "e1", memberId: "m2", status: "WAITLISTED", waitlistPosition: 1 }));
      repo.seedRsvp(makeRsvp({ id: "r3", eventId: "e1", memberId: "m3", status: "CANCELLED" }));

      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const event = result.value.PUBLISHED[0];
      expect(event.attendingCount).toBe(1);
    });

    it("returns zero attendingCount when no rsvps exist", async () => {
      repo.seedEvent(makeEvent());

      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.PUBLISHED[0].attendingCount).toBe(0);
    });

    it("counts attendees correctly across multiple events", async () => {
      repo.seedEvent(makeEvent({ id: "e1" }));
      repo.seedEvent(makeEvent({ id: "e2" }));
      repo.seedRsvp(makeRsvp({ id: "r1", eventId: "e1", memberId: "m1", status: "ATTENDING" }));
      repo.seedRsvp(makeRsvp({ id: "r2", eventId: "e1", memberId: "m2", status: "ATTENDING" }));
      repo.seedRsvp(makeRsvp({ id: "r3", eventId: "e2", memberId: "m3", status: "ATTENDING" }));

      const result = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const events = result.value.PUBLISHED;
      const e1 = events.find((e) => e.id === "e1")!;
      const e2 = events.find((e) => e.id === "e2")!;
      expect(e1.attendingCount).toBe(2);
      expect(e2.attendingCount).toBe(1);
    });
  });

  // ── Publish / cancel actions ──────────────────────────────────────

  describe("event status transitions", () => {
    it("publishes a draft event", async () => {
      repo.seedEvent(makeEvent({ id: "e1", status: "DRAFT" }));
      const result = await repo.publishEvent("e1", ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);

      const dashboard = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      if (!dashboard.ok) return;
      expect(dashboard.value.PUBLISHED).toHaveLength(1);
      expect(dashboard.value.DRAFT).toHaveLength(0);
    });

    it("cancels a published event", async () => {
      repo.seedEvent(makeEvent({ id: "e1", status: "PUBLISHED" }));
      const result = await repo.cancelEvent("e1", ORGANIZER_ID, "staff");
      expect(result.ok).toBe(true);

      const dashboard = await repo.getEventsForOrganizer(ORGANIZER_ID, "staff");
      if (!dashboard.ok) return;
      expect(dashboard.value.CANCELLED).toHaveLength(1);
    });

    it("returns EventNotFoundError for missing event", async () => {
      const result = await repo.publishEvent("nonexistent", ORGANIZER_ID, "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("EventNotFoundError");
    });

    it("prevents organizer from modifying another organizer's event", async () => {
      repo.seedEvent(makeEvent({ id: "e1", organizerId: OTHER_ORGANIZER_ID }));
      const result = await repo.publishEvent("e1", ORGANIZER_ID, "staff");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("UnauthorizedError");
    });

    it("admin can modify any organizer's event", async () => {
      repo.seedEvent(makeEvent({ id: "e1", organizerId: OTHER_ORGANIZER_ID, status: "DRAFT" }));
      const result = await repo.publishEvent("e1", ADMIN_ID, "admin");
      expect(result.ok).toBe(true);
    });
  });
});