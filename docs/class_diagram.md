# Class Diagram - Veterinary Clinic Management System (VCMS)
## Modules: Pet & Owner Registration (Module 1) and Appointment Scheduling (Module 2)
### References: SRS 4.1 (REG-1 to REG-7), SRS 4.2 (APT-1 to APT-10), Appendix B.1, Appendix B.2

```mermaid
classDiagram
    %% ==========================================
    %% DOMAIN ENTITIES (SRS Appendix B.1 Data Dictionary)
    %% ==========================================

    class StaffRole {
        <<enumeration>>
        Receptionist
        Veterinarian
        Veterinary Technician
        Clinic Administrator
        Pet Owner
    }

    class AppointmentStatus {
        <<enumeration>>
        Requested
        Scheduled
        Checked-In
        In-Progress
        Completed
        Cancelled
    }

    class RecordStatus {
        <<enumeration>>
        active
        inactive
        merged
    }

    class StaffAccount {
        +int staff_id
        +string name
        +string email
        +string phone
        +string password_hash
        +StaffRole role
        +boolean must_change_password
        +boolean active
        +boolean verifyPassword(string password)
    }

    class VetWorkingHours {
        +int id
        +int vet_id
        +int weekday
        +string start_time
        +string end_time
        +boolean isSlotWithinHours(string time, int durationMin)
    }

    class Client {
        +int client_id
        +string name
        +string phone
        +string email
        +string address
        +string password_hash
        +RecordStatus status
        +int merged_into
        +DateTime created_at
        +void markInactive()
        +void mergeInto(int survivingClientId)
    }

    class Patient {
        +int patient_id
        +int client_id
        +string name
        +string species
        +string breed
        +Date date_of_birth
        +decimal estimated_age_years
        +string sex
        +string color_markings
        +string microchip_number
        +RecordStatus status
        +DateTime created_at
        +void markInactive()
        +void reassignClient(int newClientId)
    }

    class Appointment {
        +int appointment_id
        +int patient_id
        +int vet_id
        +string service_type
        +DateTime slot_start
        +int duration_min
        +DateTime slot_end
        +AppointmentStatus status
        +string source
        +string cancellation_reason
        +DateTime created_at
        +boolean canTransitionTo(AppointmentStatus newStatus)
        +void reschedule(DateTime newSlotStart)
        +void cancel(string reason)
        +void checkIn()
    }

    class AuditLog {
        +bigint audit_id
        +string entity_type
        +int entity_id
        +string action
        +json old_data
        +json new_data
        +int changed_by
        +DateTime changed_at
    }

    class NotificationLog {
        +int notification_id
        +int client_id
        +int appointment_id
        +string channel
        +string kind
        +string message
        +string delivery_status
        +DateTime created_at
    }

    %% Entity Multiplicities (SRS Appendix B.2)
    Client "1" --> "1..*" Patient : owns (1:m)
    StaffAccount "1" --> "0..*" VetWorkingHours : configured working hours
    StaffAccount "1" --> "1..*" Appointment : attends (Veterinarian 1..*)
    Patient "1" --> "1..*" Appointment : scheduled for (1..*)
    Client "1" --> "0..*" NotificationLog : receives
    Appointment "1" --> "0..*" NotificationLog : triggers

    %% ==========================================
    %% SERVICE INTERFACES & PROVIDERS
    %% ==========================================

    class IVaccinationStatusProvider {
        <<interface>>
        +checkVaccinationStatus(patientId: int, serviceType: string) Promise~VaccinationCheckResult~
    }

    class MockVaccinationStatusProvider {
        +checkVaccinationStatus(patientId: int, serviceType: string) Promise~VaccinationCheckResult~
    }
    IVaccinationStatusProvider <|.. MockVaccinationStatusProvider

    %% ==========================================
    %% MODULE 1: REGISTRATION (Member A)
    %% ==========================================

    class ClientRepository {
        +findById(id: int) Promise~Client~
        +findByPhoneOrEmail(phone: string, email: string) Promise~Client~
        +findAllActive() Promise~Client[]~
        +create(clientData: ClientDTO) Promise~Client~
        +update(id: int, clientData: PartialClientDTO) Promise~boolean~
        +deactivate(id: int) Promise~boolean~
        +mergeClients(keepId: int, dropId: int) Promise~void~
    }

    class PatientRepository {
        +findById(id: int) Promise~Patient~
        +findByClientId(clientId: int) Promise~Patient[]~
        +findAllActive() Promise~Patient[]~
        +create(patientData: PatientDTO) Promise~Patient~
        +update(id: int, patientData: PartialPatientDTO) Promise~boolean~
        +deactivate(id: int) Promise~boolean~
        +reassignToClient(fromClientId: int, toClientId: int) Promise~void~
    }

    class RegistrationService {
        -ClientRepository clientRepo
        -PatientRepository patientRepo
        -AuditRepository auditRepo
        +registerClientAndPet(dto: RegisterClientAndPetDTO, actor: AuthUser) Promise~RegistrationResult~
        +addPetToClient(clientId: int, petDto: PatientDTO, actor: AuthUser) Promise~Patient~
        +updateClientContact(clientId: int, dto: ClientContactDTO, actor: AuthUser) Promise~void~
        +deactivateClient(clientId: int, actor: AuthUser) Promise~void~
        +mergeDuplicateClients(keepId: int, dropId: int, actor: AuthUser) Promise~void~
        +listClients(actor: AuthUser) Promise~ClientWithPetsDTO[]~
        +listPatients(actor: AuthUser) Promise~PatientSummaryDTO[]~
        +getAuditHistory(actor: AuthUser) Promise~AuditLogEntryDTO[]~
    }

    class RegistrationController {
        -RegistrationService registrationService
        +register(req: Request, res: Response) Promise~void~
        +addPet(req: Request, res: Response) Promise~void~
        +updateProfile(req: Request, res: Response) Promise~void~
        +deactivate(req: Request, res: Response) Promise~void~
        +merge(req: Request, res: Response) Promise~void~
        +getClients(req: Request, res: Response) Promise~void~
        +getPatients(req: Request, res: Response) Promise~void~
        +getAuditTrail(req: Request, res: Response) Promise~void~
    }

    RegistrationController --> RegistrationService
    RegistrationService --> ClientRepository
    RegistrationService --> PatientRepository

    %% ==========================================
    %% MODULE 2: APPOINTMENTS (Member B)
    %% ==========================================

    class AppointmentRepository {
        +findById(id: int) Promise~Appointment~
        +findOverlapping(vetId: int, slotStart: DateTime, durationMin: int, excludeApptId: int) Promise~Appointment~
        +findByVetAndDate(vetId: int, date: string) Promise~Appointment[]~
        +findAll(filters: AppointmentFilterDTO) Promise~AppointmentDetailDTO[]~
        +create(dto: CreateAppointmentDTO) Promise~Appointment~
        +updateStatus(id: int, status: AppointmentStatus, cancellationReason: string) Promise~boolean~
        +updateSlot(id: int, slotStart: DateTime) Promise~boolean~
    }

    class VetScheduleRepository {
        +findActiveVeterinarians() Promise~VetSummaryDTO[]~
        +findWorkingHours(vetId: int, weekday: int) Promise~VetWorkingHours~
    }

    class AppointmentService {
        -AppointmentRepository apptRepo
        -VetScheduleRepository vetRepo
        -PatientRepository patientRepo
        -NotificationRepository notifRepo
        -IVaccinationStatusProvider vaccineProvider
        +getAvailableSlots(vetId: int, date: string, serviceType: string) Promise~string[]~
        +bookAppointment(dto: BookAppointmentDTO, actor: AuthUser) Promise~AppointmentResultDTO~
        +requestAppointment(dto: RequestAppointmentDTO, actor: AuthUser) Promise~AppointmentResultDTO~
        +confirmAppointment(appointmentId: int, actor: AuthUser) Promise~void~
        +rescheduleAppointment(appointmentId: int, date: string, time: string, actor: AuthUser) Promise~void~
        +cancelAppointment(appointmentId: int, reason: string, actor: AuthUser) Promise~void~
        +checkInPatient(appointmentId: int, actor: AuthUser) Promise~void~
        +updateStatus(appointmentId: int, newStatus: AppointmentStatus, reason: string, actor: AuthUser) Promise~void~
        +getCalendar(filters: CalendarFilterDTO, actor: AuthUser) Promise~AppointmentDetailDTO[]~
    }

    class AppointmentController {
        -AppointmentService appointmentService
        +getVets(req: Request, res: Response) Promise~void~
        +getSlots(req: Request, res: Response) Promise~void~
        +getAppointments(req: Request, res: Response) Promise~void~
        +book(req: Request, res: Response) Promise~void~
        +updateStatus(req: Request, res: Response) Promise~void~
        +reschedule(req: Request, res: Response) Promise~void~
        +getNotifications(req: Request, res: Response) Promise~void~
    }

    AppointmentController --> AppointmentService
    AppointmentService --> AppointmentRepository
    AppointmentService --> VetScheduleRepository
    AppointmentService --> IVaccinationStatusProvider
    AppointmentService ..> PatientRepository : inter-module service contract
```
