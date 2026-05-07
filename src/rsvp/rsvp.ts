// Re-export the canonical types so existing imports from "./rsvp" keep working.
// The single source of truth lives in src/events/Event.ts.
export type {
  Event,
  EventCategory,
  EventStatus,
  RSVP,
  RSVPStatus,
} from "../events/Event"
export { EVENT_CATEGORIES, coerceCategory, isEventCategory } from "../events/Event"
