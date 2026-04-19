import type { Response } from "express";
import type { RsvpService } from "./RsvpService";
import type { ILoggingService } from "../service/LoggingService";
import type { IAppBrowserSession } from "../session/AppSession";
import { Result } from "../lib/result";

// Controller interface for rsvp
export interface IRsvpController {
  toggleRSVP(res: Response, eventId: string, userId: string, session: IAppBrowserSession): Promise<void>;
  showEvents(res: Response, session: IAppBrowserSession, currentUserId?: string): Promise<void>;
  showEvent(res: Response, eventId: string, session: IAppBrowserSession, currentUserId?: string): Promise<void>;
  createEvent(res: Response, title: string, capacity: number | undefined, session: IAppBrowserSession, userId: string): Promise<void>;
  getEventOwnerId(eventId: string): Promise<Result<string | null, Error>>;
  getUserRsvpStatus(res: Response, eventId: string, userId: string): Promise<void>;
  getAttendeeCount(res: Response, eventId: string): Promise<void>;
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

  async toggleRSVP(
    res: Response,
    eventId: string,
    userId: string,
    session: IAppBrowserSession
  ): Promise<void> {
    const result = await this.service.toggleRSVP(eventId, userId); // call service layer

    if(result.ok === false) 
    {
      const status = this.mapErrorStatus(result.value);  // map error to HTTP status

      this.logger.warn(
        `RSVP toggle failed: ${result.value.message}` // log warning for failure
      );

      // send HTTP error response with status code and display error message inside an HTML div
      res.status(status).send(`<div class="error">${result.value.message}</div>`); 

      return; // stop running if get error response
    }

    this.logger.info(
      `RSVP toggled for user=${userId} event=${eventId}` // successful login
    );

    // send success response status code
    res.status(200).json({
      success: true,
    });
  }

   // show all events
   async showEvents(res: Response, session: IAppBrowserSession, currentUserId?: string): Promise<void> {
    const result = await this.service.listEvents();
    if(!result.ok) 
    {
      const error = result.value as Error;
      this.logger.error(`Failed to list events: ${error.message}`);
      res.status(500).render("events/index", {
        session,
        events: [],
        error: "Unable to load events",
      });
      return;
    }
    res.render("events/index", {
      session,
      events: result.value,
      currentUserId,
      error: null,
    });
  }

    // show a single event with user's rsvp status
   async showEvent(res: Response, eventId: string, session: IAppBrowserSession, currentUserId?: string): Promise<void> {
    const result = await this.service.getEvent(eventId);

    if(!result.ok || !result.value) 
    {
      const errorMsg = result.ok === false ? (result.value as Error).message : "Event not found";
      this.logger.warn(`Event not found: ${eventId}`);
      res.status(404).render("events/show", {
        session,
        event: null,
        userRsvp: null,
        error: errorMsg,
      });
      return;
    }

    const event = result.value;
    const rsvpResult = await this.service.getUserRsvp(eventId, currentUserId);
    const userRsvp = rsvpResult.ok ? rsvpResult.value : null;
    res.render("events/show", {
      session,
      event,
      userRsvp,
      error: null,
    });
  }
    
    // create an event (admin/staff)
   async createEvent(res: Response, title: string, capacity: number | undefined, session: IAppBrowserSession, userId: string): Promise<void> {
    if (!title) {
      res.status(400).render("events/new", {
        session,
        error: "Event title is required",
        event: null,
      });
      return;
    }

    const result = await this.service.createEvent(title, userId, capacity);
    if(!result.ok) 
    {
      const error = result.value as Error;
      this.logger.error(`Failed to create event: ${error.message}`);
      res.status(400).render("events/new", {
        session,
        error: error.message,
        event: null,
      });
      return;
    }
    this.logger.info(`Event created: ${title}`);
    res.redirect("/events");
  }

  // get getEventOwnerId for comment controller
  async getEventOwnerId(eventId: string): Promise<Result<string | null, Error>> {
        return await this.service.getEventOwnerId(eventId);
    }

  // get current user's rsvp status for an event
  async getUserRsvpStatus(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void> {
    const result = await this.service.getUserRsvp(eventId, userId);

    if(!result.ok) 
    {
      // Cast to Error because ok === false
      res.status(500).json({ error: (result.value as Error).message });
      return;
    }

    const status = result.value?.status ?? null;
    res.json({ status });
  }

  // Get attendee count (number of "going") for an event
  async getAttendeeCount(
    res: Response,
    eventId: string
  ): Promise<void> {
    const result = await this.service.countGoing(eventId);
    if (!result.ok) {
      // Cast to Error because ok === false
      res.status(500).json({ error: (result.value as Error).message });
      return;
    }
    res.json({ count: result.value });
  }
}

// create factory function to create controller instance
export function CreateRsvpController(
  service: RsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(service, logger); // return controller
}