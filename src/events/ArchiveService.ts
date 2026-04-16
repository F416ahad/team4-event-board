import type { IEventRepository } from './EventRepository'
import type { Event, EventCategory } from './Event'
import { Ok, Err, type Result } from '../lib/result'

export type ArchiveError = { name: 'ArchiveError'; message: string }

export interface IArchiveService {
  transitionExpired(): Promise<number>
  getArchive(category?: EventCategory): Promise<Result<Event[], ArchiveError>>
}

class ArchiveService implements IArchiveService {
  constructor(private readonly eventRepo: IEventRepository) {}

  async transitionExpired(): Promise<number> {
    return this.eventRepo.transitionExpired()
  }

  async getArchive(category?: EventCategory): Promise<Result<Event[], ArchiveError>> {
    try {
      const events = await this.eventRepo.findPast(category)
      return Ok(events)
    } catch {
      return Err<ArchiveError>({ name: 'ArchiveError', message: 'Failed to retrieve archive.' })
    }
  }
}

export function CreateArchiveService(eventRepo: IEventRepository): IArchiveService {
  return new ArchiveService(eventRepo)
}