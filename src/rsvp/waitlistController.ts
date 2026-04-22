import type { Response } from "express";
import type { IRsvpService } from "./waitlistService";
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
    private readonly rsvpService: IRsvpService,
    private readonly logger: ILoggingService
  ) {}

  async cancelRsvpFromForm(
    req: Request,
    res: Response,
    eventId: string
  ): Promise<void> {
    const result = await this.rsvpService.cancelRsvpAndPromote(
    eventId, 
    userId
  );

    if (!result.ok) {
        this.logger.warn(`RSVP cancel failed: ${result.value.message}`);
        res.status(500).render("partials/error", {
            message: result.value.message,
            layout: false,
    });
    return;
  }

    this.logger.info(
      `RSVP cancelled + waitlist processed for user ${user.email}`
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
    const result = await this.rsvpService.getEventWithRsvps(eventId);

    if (!result.ok) {
      const message = "name" in result.value ? result.value.message : "Unknown error";
      this.logger.warn(`Failed to fetch event: ${message}`);
      res.status(500).render("partials/error", {
        message,
        layout: false,
      });
      return;
    }

    if (!result.value) {
      res.status(404).render("partials/error", {
        message: "Event not found",
        layout: false,
      });
      return;
    }

    const event = result.value;
    const currentUserRsvp = event.rsvps.find((r: { memberId: string; }) => r.memberId === userId) ?? null;

    res.render("events", {
      event,
      currentUserRsvp,
      session: req.session,
    });
  }
}

export function CreateRsvpController(
  rsvpService: IRsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(rsvpService, logger);
}