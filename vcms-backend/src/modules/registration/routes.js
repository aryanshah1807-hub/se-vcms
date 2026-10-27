// Registration Routes (Member A)
import { Router } from 'express';
import { allow, ROLES as R } from '../../shared/auth.js';
import { h } from '../../shared/util.js';
import { registrationController as c } from './controller.js';

const router = Router();
const STAFF = [R.REC, R.ADMIN, R.VET, R.TECH];
const FRONT = [R.REC, R.ADMIN];

router.get('/clients', allow(...STAFF), h(c.getClients));
router.post('/clients', allow(...FRONT), h(c.register));
router.get('/clients/me', allow(R.OWNER), h(c.getProfile));
router.patch('/clients/me', allow(R.OWNER), h(c.updateProfile));
router.post('/clients/me/pets', allow(R.OWNER), h(c.addMyPet));
router.post('/clients/:id/pets', allow(...FRONT), h(c.addPet));
router.patch('/clients/:id/deactivate', allow(...FRONT), h(c.deactivate));
router.post('/clients/merge', allow(...FRONT), h(c.merge));
router.get('/patients', h(c.getPatients));
router.get('/audit', allow(...STAFF), h(c.getAuditTrail));

export default router;
