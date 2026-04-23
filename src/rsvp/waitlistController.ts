import type { Response } from "express";
import type { EventService } from "./waitlistService";
import type { ILoggingService } from "../service/LoggingService";
import type { Request } from "express";

export interface IRsvpController {
  cancelRsvpFromForm(
    req: Request,
    res: Response,
    eventId: string, 
    userId: string
  ): Promise<void>;
  showEvent(
    req: Request,
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly rsvpService: EventService,
    private readonly logger: ILoggingService
  ) {}

  async cancelRsvpFromForm(
    req: Request,
    res: Response,
    eventId: string,
    userId: string

  ): Promise<void> {
    const result = await this.rsvpService.cancelEvent(
    eventId,
    userId
  );

    if (!result) {
        this.logger.warn(`RSVP cancel failed: ${result}`);
        res.status(500).render("partials/error", {
            message: result,
            layout: false,
    });
    return;
  }

    this.logger.info(
      `RSVP cancelled + waitlist processed for user ${userId} on event ${eventId}`
    );

    // redirect back to event page (adjust route if needed)
    res.redirect(`/events/${eventId}`);
  }

  async showEvent(
    req: Request,
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void> {
    const result = await this.rsvpService.publishEvent(eventId, userId);

    if (!result) {
      this.logger.warn(`Failed to fetch event: ${result}`);
      res.status(500).render("partials/error", {
        onmessage,
        layout: false,
      });
      return;
    }

    if (!result) {
      res.status(404).render("partials/error", {
        message: "Event not found",
        layout: false,
      });
      return;
    }

    const event = result;
    const currentUserRsvp = event.rsvps.find((r: { memberId: string; }) => r.memberId === userId) ?? null;

    res.render("events", {
      event,
      currentUserRsvp,
      session: req.session,
    });
  }
}

export function CreateRsvpController(
  rsvpService: EventService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(rsvpService, logger);
}