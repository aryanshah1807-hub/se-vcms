import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import { login, registerPetOwner, auth } from './shared/auth.js';
import { h, errorHandler } from './shared/util.js';
import { openApiSpec } from './shared/swagger.js';
import { startReminders } from './shared/reminders.js';

import registrationRoutes from './modules/registration/routes.js';
import appointmentRoutes from './modules/appointments/routes.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  exposedHeaders: ['X-Refreshed-Token']
}));
app.use(express.json());

// Public health check and API docs
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// SE-2 Public login endpoint
app.post('/api/auth/login', h(async (req, res) => {
  const out = await login(req.body?.email || '', req.body?.password || '');
  out ? res.json(out) : res.status(401).json({ message: 'Email or password is incorrect.' });
}));

// Public Pet Owner self-registration
app.post('/api/auth/register-owner', h(async (req, res) => {
  const { name, phone, email, address, password } = req.body || {};
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ message: 'Name, phone, email, and password are required.' });
  }
  const out = await registerPetOwner({ name, phone, email, address, password });
  res.status(201).json(out);
}));

// SE-2, SE-4, SE-5: Authenticated and role-protected routes
app.use('/api', auth);
app.use('/api', registrationRoutes);
app.use('/api', appointmentRoutes);

// Centralized error handling
app.use(errorHandler);

// APT-9, CI-2 background job
startReminders();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`VCMS API running on http://localhost:${PORT} (Swagger Docs: http://localhost:${PORT}/api-docs)`));
