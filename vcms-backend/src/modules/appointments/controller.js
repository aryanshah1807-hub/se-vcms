
// Appointment Controller (Member B)
import { z } from 'zod';
import { appointmentService } from './service.js';

export class AppointmentController {
  constructor(service = appointmentService) {
    this.service = service;
  }

  getVets = async (req, res) => {
    const vets = await this.service.getVets();
    res.json(vets);
  };

  getSlots = async (req, res) => {
    const { date, serviceType } = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceType: z.string().optional()
    }).parse(req.query);

    const slots = await this.service.getAvailableSlots(+req.params.id, date, serviceType);
    res.json(slots);
  };

  getAppointments = async (req, res) => {
    const appointments = await this.service.getCalendar(req.user);
    res.json(appointments);
  };

  book = async (req, res) => {
    const body = z.object({
      patientId: z.coerce.number(),
      vetId: z.coerce.number(),
      service: z.string().min(1),
      date: z.string(),
      time: z.string().regex(/^\d{2}:\d{2}$/)
    }).parse(req.body);

    const result = await this.service.bookAppointment(body, req.user);
    res.status(201).json(result);
  };

  updateStatus = async (req, res) => {
    const { status, reason } = z.object({
      status: z.enum(['Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Cancelled']),
      reason: z.string().optional()
    }).parse(req.body);

    await this.service.updateStatus(+req.params.id, status, reason, req.user);
    res.json({ ok: true });
  };

  reschedule = async (req, res) => {
    const { date, time } = z.object({
      date: z.string(),
      time: z.string().regex(/^\d{2}:\d{2}$/)
    }).parse(req.body);

    await this.service.rescheduleAppointment(+req.params.id, date, time, req.user);
    res.json({ ok: true });
  };

  getNotifications = async (req, res) => {
    const notifs = await this.service.getNotifications(req.user);
    res.json(notifs);
  };
}

export const appointmentController = new AppointmentController();
