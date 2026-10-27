# VCMS Backend (Node + Express + PostgreSQL)

1. Start the database (from vcms-database):  `docker compose up -d`
2. In this folder:
       npm install
       npm run dev            # http://localhost:4000/api/health
   (PowerShell blocked? use `npm.cmd install` and `npm.cmd run dev`)
3. Connect the frontend: copy `frontend-api.js` over `vcms-frontend/src/api.js`, then in `App.jsx` add
   `api.useRole(e.target.value).then(load);` inside the role dropdown's onChange.

## Structure (one module per team member)
- src/modules/registration.js   Module 1, SRS 4.1 (REG-1..7)
- src/modules/appointments.js   Module 2, SRS 4.2 (APT-1..9)
- src/shared/                   db + transactions, JWT auth/RBAC, errors, reminder job

## API
POST /api/auth/login  {email,password}
GET/POST /api/clients, POST /api/clients/:id/pets, PATCH /api/clients/:id/deactivate, POST /api/clients/merge, PATCH /api/clients/me
GET /api/patients, GET /api/audit
GET /api/vets, GET /api/vets/:id/slots?date=YYYY-MM-DD
GET/POST /api/appointments, PATCH /api/appointments/:id/status, PATCH /api/appointments/:id/reschedule
GET /api/notifications

Logins (password Password@123): admin@vcms.test, ravi@vcms.test (receptionist), rao@vcms.test (vet), meera@mail.com (pet owner).
Send `Authorization: Bearer <token>`. The server returns a fresh token in the `X-Refreshed-Token` header; unused tokens expire after 20 minutes (SE-5).
