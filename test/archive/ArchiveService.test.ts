import { CreateArchiveService } from '../../src/events/ArchiveService'
import { InMemoryEventRepository } from '../../src/events/InMemoryEventRepository'
import type { Event } from '../../src/events/Event'

function makeEvent(overrides: Partial<Event> = {}): Event {
  const now = new Date()
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Test Event',
    description: 'desc',
    location: 'Room 1',
    category: 'academic',
    organizerId: 'org-1',
    startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    capacity: 50,
    status: 'active',
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    ...overrides,
  }
}

describe('ArchiveService', () => {
  let repo: InMemoryEventRepository
  let service: ReturnType<typeof CreateArchiveService>

  beforeEach(() => {
    repo = new InMemoryEventRepository()
    service = CreateArchiveService(repo)
  })

  describe('transitionExpired', () => {
    it('transitions active events whose endTime has passed to past', async () => {
      const expired = makeEvent()
      repo.seed([expired])

      const count = await service.transitionExpired()

      expect(count).toBe(1)
      const archive = await repo.findPast()
      expect(archive).toHaveLength(1)
      expect(archive[0].status).toBe('past')
    })

    it('does not transition events that have not yet ended', async () => {
      const future = makeEvent({
        startTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      })
      repo.seed([future])

      const count = await service.transitionExpired()

      expect(count).toBe(0)
      const active = await repo.findActive()
      expect(active).toHaveLength(1)
    })

    it('does not re-transition events already marked past', async () => {
      const alreadyPast = makeEvent({ status: 'past' })
      repo.seed([alreadyPast])

      const count = await service.transitionExpired()

      expect(count).toBe(0)
    })

    it('handles a mix of expired, future, and already-past events', async () => {
      const expired1 = makeEvent({ id: 'e1' })
      const expired2 = makeEvent({ id: 'e2' })
      const future = makeEvent({
        id: 'f1',
        startTime: new Date(Date.now() + 60_000),
        endTime: new Date(Date.now() + 120_000),
      })
      const alreadyPast = makeEvent({ id: 'p1', status: 'past' })
      repo.seed([expired1, expired2, future, alreadyPast])

      const count = await service.transitionExpired()

      expect(count).toBe(2)
      const active = await repo.findActive()
      expect(active).toHaveLength(1)
      expect(active[0].id).toBe('f1')
    })
  })

  describe('getArchive', () => {
    it('returns past events in reverse chronological order', async () => {
      const now = new Date()
      const older = makeEvent({
        id: 'old',
        status: 'past',
        endTime: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      })
      const newer = makeEvent({
        id: 'new',
        status: 'past',
        endTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      })
      repo.seed([older, newer])

      const result = await service.getArchive()

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.map((e) => e.id)).toEqual(['new', 'old'])
    })

    it('filters by category when provided', async () => {
      const tech = makeEvent({ id: 't1', status: 'past', category: 'tech' })
      const social = makeEvent({ id: 's1', status: 'past', category: 'social' })
      repo.seed([tech, social])

      const result = await service.getArchive('tech')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value).toHaveLength(1)
      expect(result.value[0].id).toBe('t1')
    })

    it('returns empty array when no past events exist', async () => {
      const result = await service.getArchive()

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value).toHaveLength(0)
    })

    it('does not include active events', async () => {
      const active = makeEvent({ id: 'a1', status: 'active' })
      repo.seed([active])

      const result = await service.getArchive()

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value).toHaveLength(0)
    })
  })
})