import type { Event, CreateEventInput, EventCategory } from "./Event"

export interface IEventRepository {
  findById(id: string): Promise<Event | null>
  findActive(): Promise<Event[]>
  findPast(category?: EventCategory): Promise<Event[]>
  save(input: CreateEventInput): Promise<Event>
  /**
   * Mark every active event whose endTime has passed as "past".
   * Returns the number of events transitioned. Called on startup
   * and every 60s by ArchiveService.
   */
  transitionExpired(): Promise<number>
}
