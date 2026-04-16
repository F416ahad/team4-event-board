import express from 'express';
const router = express.Router();
import * as eventController from '../controllers/eventController.js';


router.get('/:id', eventController.showEventDetail);

export default router;