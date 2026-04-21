export type EventStatus = 'active' | 'past'

export type EventCategory =
  | 'academic'
  | 'social'
  | 'sports'
  | 'arts'
  | 'tech'
  | 'other'

export interface Event {
  id: string
  title: string
  description: string
  location: string
  category: EventCategory
  organizerId: string
  startTime: Date
  endTime: Date
  capacity: number
  status: EventStatus
  createdAt: Date
}

export type CreateEventInput = Omit<Event, 'id' | 'status' | 'createdAt'>