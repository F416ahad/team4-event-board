import type { Request, Response } from 'express'
import type { AttendeeError, IAttendeeService } from './AttendeeService'
import { getAuthenticatedUser, recordPageView } from '../session/AppSession'
import type { AppSessionStore } from '../session/AppSession'

export interface IAttendeeController {
  getAttendees(req: Request, res: Response): Promise<void>
}

class AttendeeController implements IAttendeeController {
  constructor(private readonly attendeeService: IAttendeeService) {}

  async getAttendees(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req.session as AppSessionStore)
    if (!user) {
      res.status(401).render('partials/error', {
        message: 'Please log in to continue.',
        layout: false,
      })
      return
    }

    const eventId = Array.isArray(req.params['eventId'])
      ? req.params['eventId'][0]
      : req.params['eventId'] ?? ''

    const result = await this.attendeeService.getAttendeesForEvent(
      eventId,
      user.userId,
      user.role
    )

    if (!result.ok) {
      const err = result.value as AttendeeError
      const status = err.name === 'Forbidden' ? 403 : 404
      res.status(status).render('partials/error', {
        message: err.message,
        layout: false,
      })
      return
    }

    const session = recordPageView(req.session as AppSessionStore)

    res.render('events/attendees', {
      session,
      attendees: result.value,
    })
  }
}

export function CreateAttendeeController(attendeeService: IAttendeeService): IAttendeeController {
  return new AttendeeController(attendeeService)
}