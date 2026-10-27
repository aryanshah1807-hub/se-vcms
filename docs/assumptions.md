# VCMS Design Assumptions & Clarifications
## Based on SRS Appendix C (To Be Determined List) and Constraints

1. **Database Engine Selection**:
   - The user requested MySQL as the target database engine for the operational environment.
   - All relational integrity, foreign key cascading, constraints, and audit/status transition triggers have been designed in MySQL 8.0+ syntax with strict engine modes.

2. **Notification Gateway (TBD-1 / CI-1 / CI-2 / SI-1.2)**:
   - As specified in the prompt and SRS SI-1.2, real SMS and email gateways are stubbed out.
   - All notifications are persistently written to the `notification_log` database table with delivery status `'Delivered (stub)'`.
   - Notifications are queryable by role (`GET /api/notifications`) and visible on the dedicated "Notifications" page.

3. **Vaccination Overdue Warning (APT-10)**:
   - Module 4 (Vaccination Tracking) is out of scope for Release 1.0 demonstration.
   - An injectable `IVaccinationStatusProvider` interface is defined in `backend/src/shared/vaccination.js` (or `VaccinationService`) with a default mock implementation.
   - For boarding and grooming services, the provider checks the mock registry; if overdue, a non-blocking warning is attached to the response.

4. **Session Timeout (SE-5)**:
   - JWT tokens are signed with a 20-minute lifetime (`expiresIn: '20m'`).
   - Every authenticated request issues an `X-Refreshed-Token` header containing a fresh 20-minute token, effectively resetting the idle timer on user activity. Inactivity for 20 minutes triggers a 401 Unauthorized, prompting re-authentication.

5. **Soft Deletion Policy (REG-6)**:
   - Clients and patients are never deleted via `DELETE` statements.
   - MySQL triggers `trg_clients_nodelete` and `trg_patients_nodelete` reject direct `DELETE` statements with a `SQLSTATE '45000'` signal.
   - Deactivation is performed by setting `status = 'inactive'`.
