export type EventStatus = "draft" | "published" | "cancelled" | "past";

export interface IEvent {
  id: string;
  title: string;
  date: Date;
  category: string;
  capacity: number;
  organizerId: string;
  status: EventStatus;
}

export interface IEventWithStats extends IEvent {
  attendingCount: number;
}