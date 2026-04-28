import type { Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IAppBrowserSession } from "../session/AppSession";
import type { IEventRepository, EventWithCounts } from "./InMemoryRepository";
import { Ok, type Result } from "../lib/result";
 
type DomainError = { name: string; message: string };
type UserRole = "admin" | "staff" | "user";
 
export interface IEventController {
  showDashboard(
    res: Response,
    session: IAppBrowserSession,
    userId: string,
    role: UserRole
  ): Promise<void>;
 
  getDashboardData(
    userId: string,
    role: UserRole
  ): Promise<Result<Record<string, EventWithCounts[]>, DomainError>>;
 
  publishEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    role: UserRole,
    htmx: boolean
  ): Promise<void>;
 
  cancelEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    role: UserRole,
    htmx: boolean
  ): Promise<void>;
}
 
class EventController implements IEventController {
  constructor(
    private readonly repo: IEventRepository,
    private readonly logger: ILoggingService
  ) {}
 
  async getDashboardData(
    userId: string,
    role: UserRole
  ): Promise<Result<Record<string, EventWithCounts[]>, DomainError>> {
    return this.repo.getEventsForOrganizer(userId, role);
  }
 
  async showDashboard(
    res: Response,
    session: IAppBrowserSession,
    userId: string,
    role: UserRole
  ): Promise<void> {
    const result = await this.repo.getEventsForOrganizer(userId, role);
 
    if (!result.ok) {
      res.status(403).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }
 
    res.render("dashboard", { session, groups: result.value });
  }
 
  async publishEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    role: UserRole,
    htmx: boolean
  ): Promise<void> {
    const result = await this.repo.publishEvent(eventId, userId, role);
 
    if (!result.ok) {
      const status = result.value.name === "EventNotFoundError" ? 404 : 403;
      res.status(status).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }
 
    this.logger.info(`Event ${eventId} published by ${userId}`);
 
    if (htmx) {
      // Return just the updated row fragment for HTMX swap
      const eventsResult = await this.repo.getEventsForOrganizer(userId, role);
      if (!eventsResult.ok) {
        res.status(500).render("partials/error", { message: "Reload failed.", layout: false });
        return;
      }
      const allEvents = Object.values(eventsResult.value).flat();
      const event = allEvents.find((e) => e.id === eventId);
      if (!event) {
        res.status(404).render("partials/error", { message: "Event not found.", layout: false });
        return;
      }
      res.render("partials/event-row", { event, layout: false });
      return;
    }
 
    res.redirect("/dashboard");
  }
 
  async cancelEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    role: UserRole,
    htmx: boolean
  ): Promise<void> {
    const result = await this.repo.cancelEvent(eventId, userId, role);
 
    if (!result.ok) {
      const status = result.value.name === "EventNotFoundError" ? 404 : 403;
      res.status(status).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }
 
    this.logger.info(`Event ${eventId} cancelled by ${userId}`);
 
    if (htmx) {
      const eventsResult = await this.repo.getEventsForOrganizer(userId, role);
      if (!eventsResult.ok) {
        res.status(500).render("partials/error", { message: "Reload failed.", layout: false });
        return;
      }
      const allEvents = Object.values(eventsResult.value).flat();
      const event = allEvents.find((e) => e.id === eventId);
      if (!event) {
        res.status(404).render("partials/error", { message: "Event not found.", layout: false });
        return;
      }
      res.render("partials/event-row", { event, layout: false });
      return;
    }
 
    res.redirect("/dashboard");
  }
}
 
export function CreateEventController(
  repo: IEventRepository,
  logger: ILoggingService
): IEventController {
  return new EventController(repo, logger);
}