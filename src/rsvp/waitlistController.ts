import type { Response } from "express";
import type { IRsvpService } from "./waitlistService";
import type { ILoggingService } from "../service/LoggingService";
import { getAuthenticatedUser, type IAppBrowserSession } from "../session/AppSession";
import { AuthenticationRequired } from "../auth/errors";

import type { Request } from "express";

export interface IRsvpController {
  cancelRsvpFromForm(
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
    eventId: string,
    userId: string
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

    this.logger.info(`RSVP cancelled for user ${userId}`);
    res.redirect(`/events/${eventId}`);
  }
}

export function CreateRsvpController(
  rsvpService: IRsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(rsvpService, logger);
}