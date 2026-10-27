# Sequence Diagrams - Veterinary Clinic Management System (VCMS)
## Core Use Cases across Module 1 and Module 2
### Showing UI -> Controller -> Service -> Repository -> Database and Side Effects

---

## 2.a. Register New Client + Pet (with Duplicate Warning Check: REG-1, REG-2, REG-3)

```mermaid
sequenceDiagram
    autonumber
    actor Receptionist as Receptionist (UI)
    participant RC as RegistrationController
    participant RS as RegistrationService
    participant CR as ClientRepository
    participant PR as PatientRepository
    participant DB as MySQL Database
    participant AL as AuditLog

    Receptionist->>RC: POST /api/clients {client, pet, confirmDuplicate: false}
    RC->>RS: registerClientAndPet(dto, actor)
    RS->>CR: findByPhoneOrEmail(client.phone, client.email)
    CR->>DB: SELECT * FROM clients WHERE status='active' AND (phone=? OR email=?)
    DB-->>CR: existing record (e.g. Meera Joshi)
    CR-->>RS: Client {name: 'Meera Joshi', phone: '9820011111'}
    
    alt Duplicate Detected & confirmDuplicate == false (REG-3 Warning)
        RS-->>RC: throws HttpError(409, "Client with phone/email already exists: Meera Joshi")
        RC-->>Receptionist: 409 Conflict with warning details
        Receptionist->>Receptionist: Shows Duplicate Warning Dialog ("Register anyway?")
    end

    opt Receptionist confirms duplicate (confirmDuplicate: true)
        Receptionist->>RC: POST /api/clients {client, pet, confirmDuplicate: true}
        RC->>RS: registerClientAndPet(dto, actor)
        RS->>DB: START TRANSACTION
        RS->>DB: SET @app_user_id = actor.id
        RS->>CR: create(client)
        CR->>DB: INSERT INTO clients(name, phone, email, address) VALUES(...)
        DB->>AL: Trigger: INSERT INTO audit_log (clients, INSERT, @app_user_id)
        DB-->>CR: clientId: 11
        RS->>PR: create(patient with client_id=11)
        PR->>DB: INSERT INTO patients(client_id, name, species, breed, sex, ...) VALUES(...)
        DB->>AL: Trigger: INSERT INTO audit_log (patients, INSERT, @app_user_id)
        DB-->>PR: patientId: 15
        RS->>DB: COMMIT TRANSACTION
        RS-->>RC: { id: 11, name: '...', patientId: 15 }
        RC-->>Receptionist: 201 Created { id: 11, ... }
    end
```

---

## 2.b. Merge Duplicate Clients (REG-4)

```mermaid
sequenceDiagram
    autonumber
    actor User as Receptionist / Admin (UI)
    participant RC as RegistrationController
    participant RS as RegistrationService
    participant CR as ClientRepository
    participant DB as MySQL Database
    participant AL as AuditLog

    User->>RC: POST /api/clients/merge { keepId: 1, dropId: 6 }
    RC->>RS: mergeDuplicateClients(keepId=1, dropId=6, actor)
    
    alt Validation: keepId == dropId
        RS-->>RC: throws HttpError(400, "Choose two different clients")
        RC-->>User: 400 Bad Request
    else Valid Merge
        RS->>DB: START TRANSACTION
        RS->>DB: SET @app_user_id = actor.id
        RS->>CR: mergeClients(keepId=1, dropId=6)
        CR->>DB: CALL merge_clients(1, 6)
        Note over DB: UPDATE patients SET client_id=1 WHERE client_id=6;<br/>UPDATE clients SET status='merged', merged_into=1 WHERE client_id=6;
        DB->>AL: Trigger: INSERT INTO audit_log (clients, UPDATE status='merged', @app_user_id)
        DB-->>CR: Success
        RS->>DB: COMMIT TRANSACTION
        RS-->>RC: { ok: true }
        RC-->>User: 200 OK { ok: true }
    end
```

---

## 2.c. Book Appointment as Receptionist (APT-1, APT-3, APT-4, APT-10, BR-3)

```mermaid
sequenceDiagram
    autonumber
    actor Receptionist as Receptionist (UI)
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant VS as VetScheduleRepository
    participant VP as IVaccinationStatusProvider
    participant AR as AppointmentRepository
    participant DB as MySQL Database
    participant NL as NotificationLog
    participant AL as AuditLog

    %% Step 1: Query slots
    Receptionist->>AC: GET /api/vets/4/slots?date=2026-10-28&serviceType=Check-up
    AC->>AS: getAvailableSlots(vetId=4, date='2026-10-28', serviceType='Check-up')
    AS->>VS: findWorkingHours(vetId=4, weekday=3)
    VS->>DB: SELECT * FROM vet_working_hours WHERE vet_id=4 AND weekday=3
    DB-->>VS: { start_time: '09:00', end_time: '17:00' }
    AS->>AR: findByVetAndDate(vetId=4, date='2026-10-28')
    AR->>DB: SELECT slot_start FROM appointments WHERE vet_id=4 AND status<>'Cancelled'
    DB-->>AR: [ '10:00', '11:00' ]
    AS-->>AC: Available: ['09:00', '09:30', '10:30', '11:30', ...]
    AC-->>Receptionist: 200 OK with slots array

    %% Step 2: Book appointment
    Receptionist->>AC: POST /api/appointments { patientId: 1, vetId: 4, service: 'Grooming', date: '2026-10-28', time: '09:30' }
    AC->>AS: bookAppointment(dto, actor)
    AS->>VP: checkVaccinationStatus(patientId=1, serviceType='Grooming') (APT-10)
    VP-->>AS: { isOverdue: false, warning: null }
    
    AS->>DB: START TRANSACTION
    AS->>DB: SET @app_user_id = actor.id
    AS->>AR: create(dto with status='Scheduled', source='staff')
    AR->>DB: INSERT INTO appointments(patient_id, vet_id, service_type, slot_start, status, source) VALUES(...)
    Note over DB: Trigger trg_appt_hours_ins checks working hours & prevents double booking (APT-4)
    DB->>AL: Trigger: INSERT INTO audit_log (appointments, INSERT, @app_user_id)
    DB-->>AR: appointment_id = 9
    
    AS->>DB: INSERT INTO notification_log (client_id, appointment_id, kind='confirmation')
    DB-->>AS: Success
    AS->>DB: COMMIT TRANSACTION
    AS-->>AC: { id: 9, status: 'Scheduled' }
    AC-->>Receptionist: 201 Created { id: 9, status: 'Scheduled' }
```

---

## 2.d. Pet Owner Requests Appointment -> Receptionist Confirms (APT-2)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Pet Owner (Portal UI)
    actor Receptionist as Receptionist (UI)
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant PR as PatientRepository
    participant AR as AppointmentRepository
    participant DB as MySQL Database
    participant NL as NotificationLog

    %% Step 1: Pet Owner Requests
    Owner->>AC: POST /api/appointments { patientId: 1, vetId: 4, service: 'Check-up', date: '2026-10-29', time: '10:00' }
    AC->>AS: requestAppointment(dto, actor=PetOwner)
    AS->>PR: findById(patientId=1) (SE-6 owner pet check)
    PR->>DB: SELECT client_id FROM patients WHERE patient_id=1
    DB-->>PR: client_id: 1 (Matches Owner clientId)
    AS->>DB: START TRANSACTION
    AS->>AR: create(status='Requested', source='owner')
    AR->>DB: INSERT INTO appointments(..., status='Requested', source='owner')
    DB-->>AR: appointment_id = 10
    AS->>DB: INSERT INTO notification_log (client_id, kind='confirmation', msg='Appointment requested...')
    AS->>DB: COMMIT TRANSACTION
    AS-->>AC: { id: 10, status: 'Requested' }
    AC-->>Owner: 201 Created { id: 10, status: 'Requested' }

    %% Step 2: Receptionist Confirms
    Receptionist->>AC: PATCH /api/appointments/10/status { status: 'Scheduled' }
    AC->>AS: confirmAppointment(appointmentId=10, actor=Receptionist)
    AS->>DB: START TRANSACTION
    AS->>DB: SET @app_user_id = actor.id
    AS->>AR: updateStatus(id=10, status='Scheduled')
    AR->>DB: UPDATE appointments SET status='Scheduled' WHERE appointment_id=10
    Note over DB: Trigger trg_appt_status validates transition: Requested -> Scheduled
    DB-->>AR: 1 row affected
    AS->>DB: INSERT INTO notification_log(kind='status_change', msg='Appointment #10 is now Scheduled')
    AS->>DB: COMMIT TRANSACTION
    AS-->>AC: { ok: true }
    AC-->>Receptionist: 200 OK { ok: true }
```

---

## 2.e. Reschedule and Cancel Appointment (APT-5, APT-6)

```mermaid
sequenceDiagram
    autonumber
    actor User as Receptionist / Pet Owner (UI)
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant AR as AppointmentRepository
    participant DB as MySQL Database
    participant NL as NotificationLog
    participant AL as AuditLog

    %% Reschedule Scenario (APT-5)
    rect rgb(240, 248, 255)
        note over User, DB: Reschedule Appointment (Only allowed for 'Scheduled' / 'Confirmed')
        User->>AC: PATCH /api/appointments/4/reschedule { date: '2026-10-30', time: '14:00' }
        AC->>AS: rescheduleAppointment(id=4, date, time, actor)
        AS->>AR: findById(id=4)
        AR->>DB: SELECT * FROM appointments WHERE appointment_id=4
        DB-->>AR: Appointment { status: 'Scheduled' }
        AS->>DB: START TRANSACTION
        AS->>DB: SET @app_user_id = actor.id
        AS->>AR: updateSlot(id=4, slotStart='2026-10-30 14:00:00')
        AR->>DB: UPDATE appointments SET slot_start=? WHERE appointment_id=4 AND status='Scheduled'
        Note over DB: Trigger trg_appt_hours_upd validates new slot and prevents overlap
        DB->>AL: Trigger: INSERT INTO audit_log
        DB-->>AR: Success
        AS->>DB: INSERT INTO notification_log(kind='status_change', msg='Appointment moved...')
        AS->>DB: COMMIT TRANSACTION
        AS-->>AC: { ok: true }
        AC-->>User: 200 OK { ok: true }
    end

    %% Cancel Scenario (APT-6)
    rect rgb(255, 245, 245)
        note over User, DB: Cancel Appointment (Requires Reason; only before Checked-In)
        User->>AC: PATCH /api/appointments/4/status { status: 'Cancelled', reason: 'Owner emergency travel' }
        AC->>AS: cancelAppointment(id=4, reason='...', actor)
        AS->>AR: findById(id=4)
        AR->>DB: SELECT * FROM appointments WHERE appointment_id=4
        DB-->>AR: Appointment { status: 'Scheduled' }
        AS->>DB: START TRANSACTION
        AS->>DB: SET @app_user_id = actor.id
        AS->>AR: updateStatus(id=4, status='Cancelled', reason='...')
        AR->>DB: UPDATE appointments SET status='Cancelled', cancellation_reason=? WHERE appointment_id=4
        Note over DB: Trigger trg_appt_status validates transition: Scheduled -> Cancelled
        DB->>AL: Trigger: INSERT INTO audit_log
        DB-->>AR: Success
        AS->>DB: INSERT INTO notification_log(kind='status_change', msg='Appointment #4 is now Cancelled')
        AS->>DB: COMMIT TRANSACTION
        AS-->>AC: { ok: true }
        AC-->>User: 200 OK { ok: true }
    end
```

---

## 2.f. Check-In (APT-7) and Confirmation / 24-Hour Reminder (APT-9, CI-1, CI-2)

```mermaid
sequenceDiagram
    autonumber
    actor Receptionist as Receptionist (UI)
    participant Cron as node-cron Scheduler (Hourly Job)
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant AR as AppointmentRepository
    participant DB as MySQL Database
    participant NL as NotificationLog

    %% Check-in Upon Arrival (APT-7)
    Receptionist->>AC: PATCH /api/appointments/5/status { status: 'Checked-In' }
    AC->>AS: checkInPatient(appointmentId=5, actor=Receptionist)
    AS->>DB: START TRANSACTION
    AS->>DB: SET @app_user_id = actor.id
    AS->>AR: updateStatus(id=5, status='Checked-In')
    AR->>DB: UPDATE appointments SET status='Checked-In' WHERE appointment_id=5
    Note over DB: Trigger trg_appt_status ensures Scheduled -> Checked-In.<br/>Subsequent cancellations are now strictly rejected!
    DB-->>AR: Success
    AS->>DB: INSERT INTO notification_log(kind='status_change', msg='Appointment #5 is now Checked-In')
    AS->>DB: COMMIT TRANSACTION
    AS-->>AC: { ok: true }
    AC-->>Receptionist: 200 OK { ok: true }

    %% Automated 24-Hour Reminder Background Job (APT-9 / CI-2)
    Note over Cron, DB: Scheduled node-cron runs every hour: 0 * * * *
    Cron->>DB: SELECT appointments starting between NOW()+23h and NOW()+24h
    DB-->>Cron: [ { apptId: 8, clientId: 5, slot: '2026-10-22 16:00' } ]
    Cron->>DB: INSERT INTO notification_log(client_id, appointment_id, kind='reminder_24h', message='Reminder: appointment on 22 Oct 16:00')
    DB-->>Cron: 1 notification record created (SI-1.2 Delivered stub)
```
