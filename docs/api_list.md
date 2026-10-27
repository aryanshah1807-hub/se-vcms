# VCMS REST API Specification
## Standardized JSON REST API (CO-1)

All endpoints below `/api` require a valid JWT token in the `Authorization: Bearer <token>` header (SE-2), except `/api/auth/login` and `/api/health`.

### 1. Authentication & System
- `GET /api/health` - Health check endpoint.
- `POST /api/auth/login` - Authenticate staff or client. Body: `{ email, password }`. Returns `{ token, user: { id, name, role, kind, clientId } }`. (SE-2, SE-3).
- `GET /api/staff` - List all staff accounts and roles (Admin only: STAFF-1).
- `GET /api/vets` - List veterinarians with their working hours (STAFF-4).

### 2. Module 1: Pet and Owner Registration (SRS 4.1)
- `GET /api/clients` - List all active clients with nested pets array. Allowed: Receptionist, Clinic Administrator, Veterinarian, Veterinary Technician.
- `POST /api/clients` - Register new client and initial pet. Body: `{ client: { name, phone, email, address }, pet: { name, species, breed, sex, dob, microchip }, confirmDuplicate?: boolean }`. Returns 409 if phone/email matches existing client unless `confirmDuplicate: true`. (REG-1, REG-2, REG-3).
- `POST /api/clients/:id/pets` - Add an additional pet to an existing client. Body: `{ name, species, breed, sex, dob, microchip }`. (REG-2).
- `PATCH /api/clients/:id/deactivate` - Soft-delete/deactivate client without physical deletion. Allowed: Receptionist, Admin. (REG-6).
- `POST /api/clients/merge` - Merge two clients. Body: `{ keepId, dropId }`. Reassigns all patients and appointments to `keepId` and sets `dropId.status = 'merged'`. (REG-4).
- `PATCH /api/clients/me` - Self-service profile update. Allowed: Pet Owner only. Body: `{ phone?, email?, address? }`. (REG-5).
- `GET /api/patients` - List active patients. Staff see all patients; Pet Owners see only their own pets (SE-6).
- `GET /api/audit` - View chronological audit trail of all changes (who, what entity changed, before/after values, timestamp). (REG-7).

### 3. Module 2: Appointment Scheduling (SRS 4.2)
- `GET /api/vets/:id/slots?date=YYYY-MM-DD&serviceType=` - Returns available 30-minute time slots for a veterinarian on a specific date, filtering out booked slots and out-of-working-hours slots. (APT-3, BR-3).
- `GET /api/appointments` - List appointments with filters. Staff see all; Pet Owners see only their own pets' appointments. (APT-8, SE-6).
- `POST /api/appointments` - Book or request appointment.
  - Staff booking sets status `'Scheduled'`. (APT-1).
  - Owner request sets status `'Requested'`. (APT-2).
  - Checks double booking and vet working hours. (APT-4, BR-3).
  - Evaluates vaccination status for boarding/grooming services. (APT-10).
  - Triggers confirmation notification log entry. (APT-9, CI-1).
- `PATCH /api/appointments/:id/status` - Transition appointment state:
  - Receptionist confirms: `'Requested' -> 'Scheduled'`. (APT-2).
  - Receptionist check-in: `'Scheduled' -> 'Checked-In'`. (APT-7).
  - Veterinarian begins: `'Checked-In' -> 'In-Progress'`.
  - Veterinarian completes: `'In-Progress' -> 'Completed'`.
  - Cancel: Allowed only before `'Checked-In'` with mandatory `reason`. (APT-6).
- `PATCH /api/appointments/:id/reschedule` - Reschedule appointment. Allowed only if status is `'Scheduled'`. Body: `{ date: 'YYYY-MM-DD', time: 'HH:MM' }`. (APT-5).
- `GET /api/notifications` - View notification log entries sent via email/SMS stub. (CI-1, CI-2, APT-9).
