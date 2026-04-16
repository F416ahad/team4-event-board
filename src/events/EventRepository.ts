import type { Event, CreateEventInput, EventCategory } from './Event'

export interface IEventRepository {
  findById(id: string): Promise<Event | null>
  findActive(): Promise<Event[]>
  findPast(category?: EventCategory): Promise<Event[]>
  save(input: CreateEventInput): Promise<Event>
  transitionExpired(): Promise<number>
}