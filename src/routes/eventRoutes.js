import express from 'express';
// @ts-ignore
import * as eventController from '../controllers/eventController.js';

const router = express.Router();

router.get('/', eventController.listEvents);
router.get('/:id', eventController.showEvent);

export default router;