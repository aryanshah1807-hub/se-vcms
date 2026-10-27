import cron from 'node-cron';
import {query} from './db.js';

// APT-9 / CI-2: hourly job queues a reminder for appointments starting in ~24 hours (stub: logs only, SI-1)
export function startReminders(){
  cron.schedule('0 * * * *', async () => {
    try {
      await query(`
        INSERT INTO notification_log(client_id, appointment_id, kind, message)
        SELECT p.client_id, a.appointment_id, 'reminder_24h',
               CONCAT('Reminder: appointment on ', DATE_FORMAT(a.slot_start, '%d %b %H:%i'))
        FROM appointments a
        JOIN patients p USING(patient_id)
        WHERE a.status = 'Scheduled'
          AND a.slot_start BETWEEN DATE_ADD(NOW(), INTERVAL 23 HOUR) AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
          AND NOT EXISTS (
            SELECT 1 FROM notification_log n
            WHERE n.appointment_id = a.appointment_id AND n.kind = 'reminder_24h'
          )
      `);
    } catch (e) {
      console.error('reminder job failed', e.message);
    }
  });
}
