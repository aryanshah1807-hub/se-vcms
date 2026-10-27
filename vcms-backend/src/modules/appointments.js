// Module 2: Appointment Scheduling (SRS 4.2)
import {Router} from 'express';
import {z} from 'zod';
import {query, tx} from '../shared/db.js';
import {allow, ROLES as R} from '../shared/auth.js';
import {h, HttpError} from '../shared/util.js';

const r = Router();
const FRONT = [R.REC, R.ADMIN];
const CLINICAL = [R.VET, R.TECH];

const SEL = `SELECT a.appointment_id AS id, a.patient_id AS patientId, a.vet_id AS vetId,
  p.name AS patient, v.name AS vet, a.service_type AS service,
  DATE_FORMAT(a.slot_start, '%Y-%m-%d') AS date,
  DATE_FORMAT(a.slot_start, '%H:%i') AS time,
  a.status, a.cancellation_reason AS reason
  FROM appointments a
  JOIN patients p USING(patient_id)
  JOIN staff_accounts v ON v.staff_id = a.vet_id`;

const notify = (c, apptId, kind, msg) => c.query(
  `INSERT INTO notification_log(client_id, appointment_id, kind, message)
   SELECT p.client_id, a.appointment_id, ?, ?
   FROM appointments a
   JOIN patients p USING(patient_id)
   WHERE a.appointment_id = ?`,
  [kind, msg, apptId]
);

r.get('/vets', h(async (req, res) => {
  const {rows} = await query(`
    SELECT s.staff_id AS id, s.name,
      HOUR(MIN(w.start_time)) AS start,
      HOUR(MAX(w.end_time)) AS \`end\`
    FROM staff_accounts s
    JOIN vet_working_hours w ON w.vet_id = s.staff_id
    WHERE s.active AND s.role = 'Veterinarian'
    GROUP BY s.staff_id, s.name
    ORDER BY s.name
  `);
  res.json(rows);
}));

// APT-3: Available slots calculation in Node
r.get('/vets/:id/slots', h(async (req, res) => {
  const {date} = z.object({date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.query);
  const vetId = +req.params.id;

  // MySQL day of week: Sunday=0 ... Saturday=6
  const targetDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = targetDate.getDay();

  const hours = await query(
    `SELECT start_time, end_time FROM vet_working_hours WHERE vet_id = ? AND weekday = ?`,
    [vetId, dayOfWeek]
  );
  if (!hours.rows[0]) return res.json([]);

  const startTimeStr = hours.rows[0].start_time; // HH:MM:SS
  const endTimeStr = hours.rows[0].end_time;

  const [sH, sM] = startTimeStr.split(':').map(Number);
  const [eH, eM] = endTimeStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;

  // Booked non-cancelled appointments for this vet on this day
  const booked = await query(
    `SELECT DATE_FORMAT(slot_start, '%H:%i') AS time FROM appointments
     WHERE vet_id = ? AND DATE(slot_start) = ? AND status <> 'Cancelled'`,
    [vetId, date]
  );
  const bookedTimes = new Set(booked.rows.map(b => b.time));

  const availableSlots = [];
  for (let m = startMins; m + 30 <= endMins; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const slotTime = `${hh}:${mm}`;
    if (!bookedTimes.has(slotTime)) {
      availableSlots.push(slotTime);
    }
  }

  res.json(availableSlots);
}));

// APT-8: owners only see their own pets' appointments (SE-6)
r.get('/appointments', h(async (req, res) => {
  const own = req.user.role === R.OWNER;
  const sql = `${SEL} ${own ? 'WHERE p.client_id = ?' : ''} ORDER BY a.slot_start`;
  const {rows} = await query(sql, own ? [req.user.clientId] : []);
  res.json(rows);
}));

// APT-1, APT-2 (owner request => Requested); APT-4 and BR-3 are enforced by the database
r.post('/appointments', h(async (req, res) => {
  const b = z.object({
    patientId: z.coerce.number(),
    vetId: z.coerce.number(),
    service: z.string().min(1),
    date: z.string(),
    time: z.string().regex(/^\d{2}:\d{2}$/)
  }).parse(req.body);

  const owner = req.user.role === R.OWNER;
  if (owner) {
    const ok = await query(`SELECT 1 FROM patients WHERE patient_id = ? AND client_id = ?`, [b.patientId, req.user.clientId]);
    if (!ok.rows[0]) throw new HttpError(403, 'You can only book for your own pets.');
  } else if (!FRONT.includes(req.user.role)) {
    throw new HttpError(403, 'Your role cannot do this.');
  }

  const out = await tx(req.user, async c => {
    const slotStart = `${b.date} ${b.time}:00`;
    const status = owner ? 'Requested' : 'Scheduled';
    const source = owner ? 'owner' : 'staff';

    const ins = await c.query(
      `INSERT INTO appointments(patient_id, vet_id, service_type, slot_start, status, source) VALUES(?, ?, ?, ?, ?, ?)`,
      [b.patientId, b.vetId, b.service, slotStart, status, source]
    );
    const apptId = ins.insertId;

    await notify(c, apptId, 'confirmation', `Appointment ${status.toLowerCase()} for ${b.date} ${b.time}`); // CI-1, APT-9
    return {id: apptId, status};
  });
  res.status(201).json(out);
}));

// Status changes. Role rules here; legal transitions are enforced by the DB trigger (SRS B.3)
r.patch('/appointments/:id/status', h(async (req, res) => {
  const {status, reason} = z.object({
    status: z.enum(['Scheduled', 'Checked-In', 'In-Progress', 'Completed', 'Cancelled']),
    reason: z.string().optional()
  }).parse(req.body);

  const id = +req.params.id;
  const role = req.user.role;
  const allowed = status === 'Cancelled' ? [...FRONT, R.OWNER] // APT-6
    : ['Scheduled', 'Checked-In'].includes(status) ? FRONT // confirm; APT-7 check-in
    : CLINICAL;

  if (!allowed.includes(role)) throw new HttpError(403, 'Your role cannot do this.');
  if (status === 'Cancelled' && !reason?.trim()) throw new HttpError(400, 'A cancellation reason is required.');

  if (role === R.OWNER) {
    const ok = await query(
      `SELECT 1 FROM appointments a JOIN patients p USING(patient_id) WHERE a.appointment_id = ? AND p.client_id = ?`,
      [id, req.user.clientId]
    );
    if (!ok.rows[0]) throw new HttpError(403, 'You can only cancel your own appointments.');
  }

  await tx(req.user, async c => {
    const u = await c.query(
      `UPDATE appointments SET status = ?, cancellation_reason = COALESCE(?, cancellation_reason) WHERE appointment_id = ?`,
      [status, reason || null, id]
    );
    if (!u.rowCount) throw new HttpError(404, 'Appointment not found.');
    if (status !== 'In-Progress') {
      await notify(c, id, 'status_change', `Appointment #${id} is now ${status}`);
    }
  });
  res.json({ok: true});
}));

// APT-5: only Scheduled appointments can be rescheduled
r.patch('/appointments/:id/reschedule', allow(...FRONT), h(async (req, res) => {
  const b = z.object({date: z.string(), time: z.string().regex(/^\d{2}:\d{2}$/)}).parse(req.body);
  const id = +req.params.id;

  await tx(req.user, async c => {
    const u = await c.query(
      `UPDATE appointments SET slot_start = ? WHERE appointment_id = ? AND status = 'Scheduled'`,
      [`${b.date} ${b.time}:00`, id]
    );
    if (!u.rowCount) throw new HttpError(400, 'Only scheduled appointments can be rescheduled.');
    await notify(c, id, 'status_change', `Appointment #${id} moved to ${b.date} ${b.time}`);
  });
  res.json({ok: true});
}));

// CI-1/CI-2: notification log (owners see only their own)
r.get('/notifications', h(async (req, res) => {
  const own = req.user.role === R.OWNER;
  const sql = `SELECT DATE_FORMAT(created_at, '%d %b %Y %H:%i') AS \`at\`,
    channel, message AS msg, delivery_status AS status
    FROM notification_log ${own ? 'WHERE client_id = ?' : ''}
    ORDER BY notification_id DESC
    LIMIT 200`;
  const {rows} = await query(sql, own ? [req.user.clientId] : []);
  res.json(rows);
}));

export default r;
