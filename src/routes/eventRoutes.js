import express from 'express';
const router = express.Router();
import * as eventController from '../controllers/eventController.js';


router.get('/:id', eventController.showEventDetail);

export default router;

import express from 'express';
import * as eventController from '../controllers/eventController.js';

const router = express.Router();

// the main event list with filters
router.get('/', eventController.listEvents);

export default router;