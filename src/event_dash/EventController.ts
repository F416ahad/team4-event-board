import type { Response } from "express";
import type { IAppBrowserSession } from "../session/AppSession";
import type { DashboardService } from "./EventService";
import type { ILoggingService } from "../service/LoggingService";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IDashboardController {
  showDashboard(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void>;

  publishEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void>;

  cancelEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class DashboardController implements IDashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly logger: ILoggingService
  ) {}

  /**
   * GET /dashboard
   *
   * Renders the full dashboard or an HTMX partial depending on the
   * presence of the HX-Request header.
   *
   * Template locals:
   *   session  — passed through to all partials for nav/auth state
   *   grouped  — { active: DTO[], past: DTO[], cancelled: DTO[] }
   */
  async showDashboard(res: Response, session: IAppBrowserSession): Promise<void> {
    console.log("Rendering dashboard with grouped:");
    const auth = session.authenticatedUser;

    if (!auth) {
      res.status(403).render("errors/403", {
        session,
        error: "Not authenticated",
      });
      return;
    }

    try {
      const events = await this.service.getDashboard(auth.userId, auth.role);
      const grouped = this.service.groupByStatus(events);
      const isHxRequest = res.req.headers["hx-request"] === "true";

      const template = isHxRequest ? "dashboard/_dashboard" : "dashboard/index";

      res.status(200).render(template, { session, grouped });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`[Dashboard] showDashboard failed: ${message}`);

      if (message === "Forbidden") {
        res.status(403).render("errors/403", {
          session,
          error: "You are not allowed to access this dashboard",
        });
        return;
      }

      res.status(500).render("errors/500", { session, error: message });
    }
  }

  /**
   * POST /dashboard/events/:id/publish
   *
   * Sets the event status to "active".
   * On success: re-renders the _event-row partial (HTMX swap).
   * On failure: responds with a plain-text error the HTMX swap
   *             can display in an out-of-band target.
   */
  async publishEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void> {
    const auth = session.authenticatedUser;

    if (!auth) {
      res.status(403).send("Not authenticated");
      return;
    }

    try {
      await this.service.updateEventStatus(eventId, auth.userId, auth.role, "active");

      const updated = await this.service.getEventForDashboard(eventId);

      if (!updated) {
        res.status(404).send("Event not found after update");
        return;
      }

      res.status(200).render("dashboard/_event-row", { event: updated, session });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`[Dashboard] publishEvent failed for ${eventId}: ${message}`);
      res.status(this.statusCodeFor(message)).send(message);
    }
  }

  /**
   * POST /dashboard/events/:id/cancel
   *
   * Sets the event status to "cancelled".
   * Same HTMX row-swap pattern as publishEvent.
   */
  async cancelEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void> {
    const auth = session.authenticatedUser;

    if (!auth) {
      res.status(403).send("Not authenticated");
      return;
    }

    try {
      await this.service.updateEventStatus(eventId, auth.userId, auth.role, "cancelled");

      const updated = await this.service.getEventForDashboard(eventId);

      if (!updated) {
        res.status(404).send("Event not found after update");
        return;
      }

      res.status(200).render("dashboard/_event-row", { event: updated, session });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`[Dashboard] cancelEvent failed for ${eventId}: ${message}`);
      res.status(this.statusCodeFor(message)).send(message);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Map well-known error messages to appropriate HTTP status codes.
   * Avoids leaking internal errors as 403s (your original code
   * sent 403 for every failure including "Event not found").
   */
  private statusCodeFor(message: string): number {
    if (message === "Forbidden") return 403;
    if (message === "Event not found") return 404;
    if (message.startsWith("Cannot change")) return 409;  // Conflict
    return 500;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function CreateDashboardController(
  service: DashboardService,
  logger: ILoggingService
): IDashboardController {
  return new DashboardController(service, logger);
}