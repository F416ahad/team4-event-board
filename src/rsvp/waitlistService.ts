import "dotenv/config";
import { Err, Ok, type Result } from "../lib/result";
import type { PrismaClient, Prisma } from "@prisma/client";

export type EventWithRsvps = {
  id: string;
  title: string;
  date: Date;
  category: string;
  capacity: number;
  rsvps: {
    id: string;
    status: string;
    waitlistPosition: number | null;
    memberId: string;
    member: { displayName: string };
  }[];
};

export interface IRsvpService {
  cancelRsvpAndPromote(
    eventId: string,
    memberId: string
  ): Promise<Result<void, { name: "UnexpectedDependencyError"; message: string }>>;

  getEventWithRsvps(
    eventId: string
  ): Promise<Result<EventWithRsvps | null, { name: "UnexpectedDependencyError"; message: string }>>;
}

class RsvpService implements IRsvpService {
  constructor(private readonly prisma: PrismaClient) {}

  async cancelRsvpAndPromote(
    eventId: string,
    memberId: string
  ): Promise<Result<void, { name: "UnexpectedDependencyError"; message: string }>> {
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Find the RSVP
        const rsvp = await tx.rSVP.findUnique({
          where: {
            eventId_memberId: {
              eventId,
              memberId,
            },
          },
        });

        if (!rsvp) {
          throw new Error("RSVP not found");
        }

        if (rsvp.status === "CANCELLED") {
          return; // nothing to do
        }

        // 2. Cancel current RSVP (only if ATTENDING or WAITLISTED)
        await tx.rSVP.update({
          where: {
            id: rsvp.id,
          },
          data: {
            status: "CANCELLED",
            waitlistPosition: null,
          },
        });

        // 3. If they were NOT attending, no promotion needed
        if (rsvp.status !== "ATTENDING") {
          return;
        }

        // 4. Find next person in waitlist (FIFO by createdAt)
        const nextUp = await tx.rSVP.findFirst({
          where: {
            eventId,
            status: "WAITLISTED",
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (!nextUp) {
          return; // no one to promote
        }

        // 5. Promote them to ATTENDING
        await tx.rSVP.update({
          where: {
            id: nextUp.id,
          },
          data: {
            status: "ATTENDING",
            waitlistPosition: null,
          },
        });

        // 6. Recompute waitlist positions for remaining WAITLISTED users
        const remaining = await tx.rSVP.findMany({
          where: {
            eventId,
            status: "WAITLISTED",
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        await Promise.all(
          remaining.map((rsvp: typeof remaining[number], index: number) =>
            tx.rSVP.update({
              where: { id: rsvp.id },
              data: {
                waitlistPosition: index + 1,
              },
            })
          )
        );
      });

      return Ok(undefined);
    } catch (e) {
      return Err({
        name: "UnexpectedDependencyError" as const,
        message:
          e instanceof Error ? e.message : "Failed to process waitlist",
      });
    }
  }
  async getEventWithRsvps(
    eventId: string
  ): Promise<Result<EventWithRsvps | null, { name: "UnexpectedDependencyError"; message: string }>> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          rsvps: {
            where: {status: { not: "CANCELLED" } },
            orderBy: { createdAt: "asc" },
            include: { member: { select: { displayName: true } } },
          }
        }
      });
      return Ok(event);
    } catch (e) {
      return Err({
        name: "UnexpectedDependencyError" as const,
        message:
          e instanceof Error ? e.message : "Failed to fetch event with RSVPs",
      });
    }
  }}