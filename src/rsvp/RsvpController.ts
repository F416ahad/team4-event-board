import type { Response } from "express";
import type { RsvpService } from "./RsvpService";
import type { ILoggingService } from "../service/LoggingService";
import type { IAppBrowserSession } from "../session/AppSession";

// Controller interface for rsvp
export interface IRsvpController {
  toggleRSVP(
    res: Response,
    eventId: string,
    userId: string,
    session: IAppBrowserSession
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly service: RsvpService, // Inject RSVP service dependency
    private readonly logger: ILoggingService // Inject logger dependency
  ) {}

  // Maps service errors to HTTP status codes
  private mapErrorStatus(error: Error): number {
    const message = error.message.toLowerCase(); // normalize messages

    if(message.includes("event not found")) return 404;
    if(message.includes("not allowed")) return 403;
    if(message.includes("validation")) return 400; // bad input data
    if(message.includes("full")) return 409; // event capacity reached

    // default fallback for unexpected errors
    return 500;
  }

}