import express from 'express';
const router = express.Router();
import * as eventController from '../controllers/eventController.js';


router.get('/:id', eventController.showEventDetail);
router.post('/events/:id/rsvp', eventController.handleRSVP);

export default router;