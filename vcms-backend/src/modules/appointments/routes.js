// Appointment Routes (Member B)
import { Router } from 'express';
import { allow, ROLES as R } from '../../shared/auth.js';
import { h } from '../../shared/util.js';
import { appointmentController as c } from './controller.js';

const router = Router();
const FRONT = [R.REC, R.ADMIN];

router.get('/vets', h(c.getVets));
router.get('/vets/:id/slots', h(c.getSlots));
router.get('/appointments', h(c.getAppointments));
router.post('/appointments', h(c.book));
router.patch('/appointments/:id/status', h(c.updateStatus));
router.patch('/appointments/:id/reschedule', allow(...FRONT), h(c.reschedule));
router.get('/notifications', h(c.getNotifications));

export default router;
