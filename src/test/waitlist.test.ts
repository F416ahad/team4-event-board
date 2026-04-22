// src/tests/feature9-waitlist.test.ts
import {
  InMemoryEventRepository,
  CreateInMemoryEventRepository,
  type InMemoryEvent,
  type InMemoryRSVP,
} from "../rsvp/InMemoryRepository";

// ── Fixtures ────────────────────────────────────────────────────────

const EVENT_ID = "event-1";
const ORGANIZER_ID = "organizer-1";

function makeEvent(overrides: Partial<InMemoryEvent> = {}): InMemoryEvent {
  return {
    id: EVENT_ID,
    title: "Test Event",
    date: new Date("2025-06-01"),
    category: "Workshop",
    capacity: 3,
    organizerId: ORGANIZER_ID,
    status: "PUBLISHED",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeRsvp(
  id: string,
  memberId: string,
  status: InMemoryRSVP["status"],
  waitlistPosition: number | null = null,
  createdAt: Date = new Date()
): InMemoryRSVP {
  return { id, eventId: EVENT_ID, memberId, status, waitlistPosition, createdAt };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Feature 9 — Waitlist Promotion", () => {
  let repo: InMemoryEventRepository;

  beforeEach(() => {
    repo = CreateInMemoryEventRepository();
    repo.seedEvent(makeEvent());
  });

  // ── Happy path: promotion occurs ──────────────────────────────────

  describe("promotion when a spot opens up", () => {
    it("promotes the first waitlisted member when an attending member cancels", async () => {
      repo.seedMember({ id: "m1", displayName: "Alice" });
      repo.seedMember({ id: "m2", displayName: "Bob" });

      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));
      repo.seedRsvp(makeRsvp("r2", "m2", "WAITLISTED", 1, new Date("2024-01-01")));

      const result = await repo.cancelRsvpAndPromote(EVENT_ID, "m1");
      expect(result.ok).toBe(true);

      // Verify via getEventWithRsvps
      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      expect(eventResult.ok).toBe(true);
      if (!eventResult.ok || !eventResult.value) return;

      const attending = eventResult.value.rsvps.find((r) => r.memberId === "m2");
      expect(attending?.status).toBe("ATTENDING");
      expect(attending?.waitlistPosition).toBeNull();
    });

    it("promotes the earliest waitlisted member (FIFO order)", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));
      repo.seedRsvp(makeRsvp("r2", "m2", "WAITLISTED", 1, new Date("2024-01-02")));
      repo.seedRsvp(makeRsvp("r3", "m3", "WAITLISTED", 2, new Date("2024-01-01"))); // earlier

      const result = await repo.cancelRsvpAndPromote(EVENT_ID, "m1");
      expect(result.ok).toBe(true);

      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      // m3 joined earlier so should be promoted
      const promoted = eventResult.value.rsvps.find((r) => r.memberId === "m3");
      expect(promoted?.status).toBe("ATTENDING");
    });

    it("cancelling the attending member sets their status to CANCELLED", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));

      await repo.cancelRsvpAndPromote(EVENT_ID, "m1");

      // m1 should be CANCELLED — they won't appear in getEventWithRsvps (filters CANCELLED)
      // so we verify by checking that they are not in the active list
      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      const m1Rsvp = eventResult.value.rsvps.find((r) => r.memberId === "m1");
      expect(m1Rsvp).toBeUndefined();
    });
  });

  // ── No promotion when waitlist is empty ───────────────────────────

  describe("no promotion when waitlist is empty", () => {
    it("cancels the attending member without error when no one is waitlisted", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));

      const result = await repo.cancelRsvpAndPromote(EVENT_ID, "m1");
      expect(result.ok).toBe(true);
    });

    it("leaves no attending members when last attendee cancels with empty waitlist", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));

      await repo.cancelRsvpAndPromote(EVENT_ID, "m1");

      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      expect(eventResult.value.rsvps).toHaveLength(0);
    });
  });

  // ── Queue position accuracy ───────────────────────────────────────

  describe("queue positions", () => {
    it("recomputes waitlist positions after promotion", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));
      repo.seedRsvp(makeRsvp("r2", "m2", "WAITLISTED", 1, new Date("2024-01-01")));
      repo.seedRsvp(makeRsvp("r3", "m3", "WAITLISTED", 2, new Date("2024-01-02")));
      repo.seedRsvp(makeRsvp("r4", "m4", "WAITLISTED", 3, new Date("2024-01-03")));

      await repo.cancelRsvpAndPromote(EVENT_ID, "m1");

      // m2 was promoted; m3 and m4 should shift to positions 1 and 2
      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      const m3 = eventResult.value.rsvps.find((r) => r.memberId === "m3");
      const m4 = eventResult.value.rsvps.find((r) => r.memberId === "m4");

      expect(m3?.waitlistPosition).toBe(1);
      expect(m4?.waitlistPosition).toBe(2);
    });

    it("single remaining waitlisted member gets position 1 after promotion", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));
      repo.seedRsvp(makeRsvp("r2", "m2", "WAITLISTED", 1, new Date("2024-01-01")));
      repo.seedRsvp(makeRsvp("r3", "m3", "WAITLISTED", 2, new Date("2024-01-02")));

      await repo.cancelRsvpAndPromote(EVENT_ID, "m1"); // m2 promoted

      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      const m3 = eventResult.value.rsvps.find((r) => r.memberId === "m3");
      expect(m3?.waitlistPosition).toBe(1);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns RsvpNotFoundError when RSVP does not exist", async () => {
      const result = await repo.cancelRsvpAndPromote(EVENT_ID, "nonexistent-member");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("RsvpNotFoundError");
    });

    it("is a no-op when the RSVP is already cancelled", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "CANCELLED"));
      repo.seedRsvp(makeRsvp("r2", "m2", "WAITLISTED", 1));

      const result = await repo.cancelRsvpAndPromote(EVENT_ID, "m1");
      expect(result.ok).toBe(true);

      // m2 should NOT have been promoted since m1 was already cancelled
      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      const m2 = eventResult.value.rsvps.find((r) => r.memberId === "m2");
      expect(m2?.status).toBe("WAITLISTED");
    });

    it("cancelling a waitlisted member does not trigger promotion", async () => {
      repo.seedRsvp(makeRsvp("r1", "m1", "ATTENDING"));
      repo.seedRsvp(makeRsvp("r2", "m2", "WAITLISTED", 1, new Date("2024-01-01")));
      repo.seedRsvp(makeRsvp("r3", "m3", "WAITLISTED", 2, new Date("2024-01-02")));

      await repo.cancelRsvpAndPromote(EVENT_ID, "m2"); // m2 cancels from waitlist

      // m1 should still be attending, m3 should stay waitlisted
      const eventResult = await repo.getEventWithRsvps(EVENT_ID);
      if (!eventResult.ok || !eventResult.value) return;

      const m1 = eventResult.value.rsvps.find((r) => r.memberId === "m1");
      const m3 = eventResult.value.rsvps.find((r) => r.memberId === "m3");

      expect(m1?.status).toBe("ATTENDING");
      expect(m3?.status).toBe("WAITLISTED");
    });
  });
});