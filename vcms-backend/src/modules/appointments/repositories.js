// Repositories for Module 2: Appointment Scheduling (SRS 4.2)
import { query } from '../../shared/db.js';

export class AppointmentRepository {
  async findById(id) {
    const { rows } = await query(
      `SELECT a.appointment_id AS id, a.patient_id AS patientId, a.vet_id AS vetId,
              p.client_id AS clientId, p.name AS patient, v.name AS vet, a.service_type AS service,
              DATE_FORMAT(a.slot_start, '%Y-%m-%d') AS date,
              DATE_FORMAT(a.slot_start, '%H:%i') AS time,
              a.status, a.cancellation_reason AS reason
       FROM appointments a
       JOIN patients p USING(patient_id)
       JOIN staff_accounts v ON v.staff_id = a.vet_id
       WHERE a.appointment_id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByVetAndDate(vetId, date) {
    const { rows } = await query(
      `SELECT DATE_FORMAT(slot_start, '%H:%i') AS time FROM appointments
       WHERE vet_id = ? AND DATE(slot_start) = ? AND status <> 'Cancelled'`,
      [vetId, date]
    );
    return rows;
  }

  async findAll(ownerClientId = null) {
    const SEL = `SELECT a.appointment_id AS id, a.patient_id AS patientId, a.vet_id AS vetId,
      p.name AS patient, v.name AS vet, a.service_type AS service,
      DATE_FORMAT(a.slot_start, '%Y-%m-%d') AS date,
      DATE_FORMAT(a.slot_start, '%H:%i') AS time,
      a.status, a.cancellation_reason AS reason
      FROM appointments a
      JOIN patients p USING(patient_id)
      JOIN staff_accounts v ON v.staff_id = a.vet_id`;
    const sql = `${SEL} ${ownerClientId ? 'WHERE p.client_id = ?' : ''} ORDER BY a.slot_start`;
    const { rows } = await query(sql, ownerClientId ? [ownerClientId] : []);
    return rows;
  }

  async create(txClient, { patientId, vetId, service, slotStart, status, source }) {
    const res = await txClient.query(
      `INSERT INTO appointments(patient_id, vet_id, service_type, slot_start, status, source)
       VALUES(?, ?, ?, ?, ?, ?)`,
      [patientId, vetId, service, slotStart, status, source]
    );
    return { appointment_id: res.insertId, patientId, vetId, service, slotStart, status, source };
  }

  async updateStatus(txClient, id, status, reason = null) {
    const res = await txClient.query(
      `UPDATE appointments SET status = ?, cancellation_reason = COALESCE(?, cancellation_reason)
       WHERE appointment_id = ?`,
      [status, reason, id]
    );
    return res.rowCount > 0;
  }

  async updateSlot(txClient, id, slotStart) {
    const res = await txClient.query(
      `UPDATE appointments SET slot_start = ? WHERE appointment_id = ? AND status = 'Scheduled'`,
      [slotStart, id]
    );
    return res.rowCount > 0;
  }
}

export class VetScheduleRepository {
  async findActiveVeterinarians() {
    const { rows } = await query(`
      SELECT s.staff_id AS id, s.name,
        HOUR(MIN(w.start_time)) AS start,
        HOUR(MAX(w.end_time)) AS \`end\`
      FROM staff_accounts s
      JOIN vet_working_hours w ON w.vet_id = s.staff_id
      WHERE s.active AND s.role = 'Veterinarian'
      GROUP BY s.staff_id, s.name
      ORDER BY s.name
    `);
    return rows;
  }

  async findWorkingHours(vetId, weekday) {
    const { rows } = await query(
      `SELECT start_time, end_time FROM vet_working_hours WHERE vet_id = ? AND weekday = ?`,
      [vetId, weekday]
    );
    return rows[0] || null;
  }
}

export class NotificationRepository {
  async log(txClient, { clientId = null, appointmentId = null, kind, message, channel = 'email' }) {
    const executor = txClient || { query };
    await executor.query(
      `INSERT INTO notification_log(client_id, appointment_id, kind, message, channel)
       VALUES(?, ?, ?, ?, ?)`,
      [clientId, appointmentId, kind, message, channel]
    );
  }

  async notifyAppointment(txClient, apptId, kind, msg) {
    const executor = txClient || { query };
    await executor.query(
      `INSERT INTO notification_log(client_id, appointment_id, kind, message)
       SELECT p.client_id, a.appointment_id, ?, ?
       FROM appointments a
       JOIN patients p USING(patient_id)
       WHERE a.appointment_id = ?`,
      [kind, msg, apptId]
    );
  }

  async findAll(ownerClientId = null) {
    const sql = `SELECT DATE_FORMAT(created_at, '%d %b %Y %H:%i') AS \`at\`,
      channel, message AS msg, delivery_status AS status
      FROM notification_log ${ownerClientId ? 'WHERE client_id = ?' : ''}
      ORDER BY notification_id DESC
      LIMIT 200`;
    const { rows } = await query(sql, ownerClientId ? [ownerClientId] : []);
    return rows;
  }
}
