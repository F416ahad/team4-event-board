import type { Request, Response } from 'express'
import type { ArchiveError, IArchiveService } from './ArchiveService'
import type { EventCategory } from './Event'
import { recordPageView } from '../session/AppSession'
import type { AppSessionStore } from '../session/AppSession'

const VALID_CATEGORIES: EventCategory[] = [
  'academic', 'social', 'sports', 'arts', 'tech', 'other',
]

export interface IArchiveController {
  getArchive(req: Request, res: Response): Promise<void>
}

class ArchiveController implements IArchiveController {
  constructor(private readonly archiveService: IArchiveService) {}

  async getArchive(req: Request, res: Response): Promise<void> {
    const raw = req.query['category']
    const category =
      typeof raw === 'string' && VALID_CATEGORIES.includes(raw as EventCategory)
        ? (raw as EventCategory)
        : undefined

    const result = await this.archiveService.getArchive(category)

    if (!result.ok) {
      const err = result.value as ArchiveError
      res.status(500).render('partials/error', {
        message: err.message,
        layout: false,
      })
      return
    }

    const isHtmx = req.get('HX-Request') === 'true'

    if (isHtmx) {
      // Return only the event list partial for inline swap
      res.render('events/partials/archive-list', {
        events: result.value,
        selectedCategory: category ?? null,
        categories: VALID_CATEGORIES,
        layout: false,
      })
      return
    }

    const session = recordPageView(req.session as AppSessionStore)

    res.render('events/archive', {
      session,
      events: result.value,
      selectedCategory: category ?? null,
      categories: VALID_CATEGORIES,
    })
  }
}

export function CreateArchiveController(archiveService: IArchiveService): IArchiveController {
  return new ArchiveController(archiveService)
}