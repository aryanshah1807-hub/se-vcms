// Appointment Service (Member B - SRS 4.2)
import { tx } from '../../shared/db.js';
import { HttpError } from '../../shared/util.js';
import { AppointmentRepository, VetScheduleRepository, NotificationRepository } from './repositories.js';
import { PatientRepository, AuditRepository } from '../registration/repositories.js';
import { vaccinationProvider } from '../../shared/vaccination.js';

export class AppointmentService {
  constructor(
    apptRepo = new AppointmentRepository(),
    vetRepo = new VetScheduleRepository(),
    patientRepo = new PatientRepository(),
    notifRepo = new NotificationRepository(),
    vaccineProvider = vaccinationProvider,
    auditRepo = new AuditRepository()
  ) {
    this.apptRepo = apptRepo;
    this.vetRepo = vetRepo;
    this.patientRepo = patientRepo;
    this.notifRepo = notifRepo;
    this.vaccineProvider = vaccineProvider;
    this.auditRepo = auditRepo;
  }

  // APT-3, BR-3
  async getAvailableSlots(vetId, date, serviceType = '') {
    const targetDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = targetDate.getDay(); // 0=Sunday .. 6=Saturday

    const hours = await this.vetRepo.findWorkingHours(vetId, dayOfWeek);
    if (!hours) return [];

    const [sH, sM] = hours.start_time.split(':').map(Number);
    const [eH, eM] = hours.end_time.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    const booked = await this.apptRepo.findByVetAndDate(vetId, date);
    const bookedTimes = new Set(booked.map(b => b.time));

    const availableSlots = [];
    for (let m = startMins; m + 30 <= endMins; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slotTime = `${hh}:${mm}`;
      if (!bookedTimes.has(slotTime)) {
        availableSlots.push(slotTime);
      }
    }
    return availableSlots;
  }

  // APT-1, APT-2, APT-4, APT-10, CI-1
  async bookAppointment(dto, actor) {
    const isOwner = actor?.role === 'Pet Owner';
    if (isOwner) {
      // SE-6: Verify patient belongs to this owner
      const pet = await this.patientRepo.findById(dto.patientId);
      if (!pet || pet.client_id !== actor.clientId) {
        throw new HttpError(403, 'You can only book for your own pets.');
      }
    }

    // APT-10 Vaccination Check for boarding/grooming services
    const vacCheck = await this.vaccineProvider.checkVaccinationStatus(dto.patientId, dto.service);

    const slotStart = `${dto.date} ${dto.time}:00`;
    const status = isOwner ? 'Requested' : 'Scheduled';
    const source = isOwner ? 'owner' : 'staff';

    return await tx(actor, async (c) => {
      const created = await this.apptRepo.create(c, {
        patientId: dto.patientId,
        vetId: dto.vetId,
        service: dto.service,
        slotStart,
        status,
        source
      });

      await this.auditRepo.record(c, {
        entityType: 'appointments',
        entityId: created.appointment_id,
        action: 'INSERT',
        newData: { status, patientId: dto.patientId, vetId: dto.vetId, slotStart },
        changedBy: actor?.id
      });

      await this.notifRepo.notifyAppointment(
        c,
        created.appointment_id,
        'confirmation',
        `Appointment ${status.toLowerCase()} for ${dto.date} ${dto.time}`
      );

      return {
        id: created.appointment_id,
        status,
        vaccineWarning: vacCheck.isOverdue ? vacCheck.warning : null
      };
    });
  }

  // APT-2 Confirm appointment (Requested -> Scheduled)
  async confirmAppointment(id, actor) {
    return await this.updateStatus(id, 'Scheduled', null, actor);
  }

  // APT-5: Reschedule (Only Scheduled appointments can be rescheduled)
  async rescheduleAppointment(id, date, time, actor) {
    const appt = await this.apptRepo.findById(id);
    if (!appt) throw new HttpError(404, 'Appointment not found.');
    if (appt.status !== 'Scheduled') {
      throw new HttpError(400, 'Only scheduled appointments can be rescheduled.');
    }

    const slotStart = `${date} ${time}:00`;
    await tx(actor, async (c) => {
      const ok = await this.apptRepo.updateSlot(c, id, slotStart);
      if (!ok) throw new HttpError(400, 'Unable to reschedule appointment.');
      await this.auditRepo.record(c, {
        entityType: 'appointments',
        entityId: id,
        action: 'UPDATE',
        oldData: { slotStart: `${appt.date} ${appt.time}:00` },
        newData: { slotStart },
        changedBy: actor?.id
      });
      await this.notifRepo.notifyAppointment(c, id, 'status_change', `Appointment #${id} moved to ${date} ${time}`);
    });
  }

  // APT-6: Cancel (Reason required, only before Checked-In)
  async cancelAppointment(id, reason, actor) {
    if (!reason?.trim()) {
      throw new HttpError(400, 'A cancellation reason is required.');
    }
    const appt = await this.apptRepo.findById(id);
    if (!appt) throw new HttpError(404, 'Appointment not found.');
    if (actor?.role === 'Pet Owner' && appt.clientId !== actor.clientId) {
      throw new HttpError(403, 'You can only cancel your own appointments.');
    }
    if (['Checked-In', 'In-Progress', 'Completed'].includes(appt.status)) {
      throw new HttpError(400, 'Appointments cannot be cancelled once checked in.');
    }

    return await this.updateStatus(id, 'Cancelled', reason, actor);
  }

  // APT-7: Check-In
  async checkInPatient(id, actor) {
    return await this.updateStatus(id, 'Checked-In', null, actor);
  }

  // General Status Transition (Appendix B.3 State Machine)
  async updateStatus(id, newStatus, reason, actor) {
    const appt = await this.apptRepo.findById(id);
    if (!appt) throw new HttpError(404, 'Appointment not found.');

    const role = actor.role;
    const FRONT = ['Receptionist', 'Clinic Administrator'];
    const CLINICAL = ['Veterinarian', 'Veterinary Technician'];

    // RBAC validation on allowed status initiators
    if (newStatus === 'Cancelled') {
      if (!FRONT.includes(role) && role !== 'Pet Owner') {
        throw new HttpError(403, 'Your role cannot cancel appointments.');
      }
    } else if (['Scheduled', 'Checked-In'].includes(newStatus)) {
      if (!FRONT.includes(role)) {
        throw new HttpError(403, 'Only receptionists or administrators can confirm or check in appointments.');
      }
    } else if (['In-Progress', 'Completed'].includes(newStatus)) {
      if (!CLINICAL.includes(role)) {
        throw new HttpError(403, 'Only clinical staff can start or complete consultations.');
      }
    }

    await tx(actor, async (c) => {
      const ok = await this.apptRepo.updateStatus(c, id, newStatus, reason);
      if (!ok) throw new HttpError(400, 'Failed to update appointment status.');

      await this.auditRepo.record(c, {
        entityType: 'appointments',
        entityId: id,
        action: 'UPDATE',
        oldData: { status: appt.status },
        newData: { status: newStatus, cancellation_reason: reason },
        changedBy: actor?.id
      });

      if (newStatus !== 'In-Progress') {
        await this.notifRepo.notifyAppointment(c, id, 'status_change', `Appointment #${id} is now ${newStatus}`);
      }
    });
  }

  async getCalendar(actor) {
    const own = actor?.role === 'Pet Owner';
    return await this.apptRepo.findAll(own ? actor.clientId : null);
  }

  async getVets() {
    return await this.vetRepo.findActiveVeterinarians();
  }

  async getNotifications(actor) {
    const own = actor?.role === 'Pet Owner';
    return await this.notifRepo.findAll(own ? actor.clientId : null);
  }
}

export const appointmentService = new AppointmentService();
