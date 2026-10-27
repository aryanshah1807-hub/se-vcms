-- Seed data for VCMS in MySQL 8.0+
-- Demo password for all accounts: Password@123
USE vcms;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notification_log;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE appointments;
TRUNCATE TABLE patients;
TRUNCATE TABLE clients;
TRUNCATE TABLE vet_working_hours;
TRUNCATE TABLE staff_accounts;
SET FOREIGN_KEY_CHECKS = 1;

-- Staff accounts (bcrypt hash for Password@123)
INSERT INTO staff_accounts(staff_id, name, email, phone, password_hash, role, must_change_password, active) VALUES
 (1, 'Anita Admin', 'admin@vcms.test', '9800000001', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'Clinic Administrator', false, true),
 (2, 'Ravi Reception', 'ravi@vcms.test', '9800000002', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'Receptionist', false, true),
 (3, 'Sneha Reception', 'sneha@vcms.test', '9800000003', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'Receptionist', false, true),
 (4, 'Dr. Rao', 'rao@vcms.test', '9800000004', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'Veterinarian', false, true),
 (5, 'Dr. Iyer', 'iyer@vcms.test', '9800000005', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'Veterinarian', false, true),
 (6, 'Tara Tech', 'tara@vcms.test', '9800000006', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'Veterinary Technician', false, true);

-- Vet working hours (1 = Mon to 6 = Sat)
INSERT INTO vet_working_hours(vet_id, weekday, start_time, end_time) VALUES
 (4, 1, '09:00:00', '17:00:00'),
 (4, 2, '09:00:00', '17:00:00'),
 (4, 3, '09:00:00', '17:00:00'),
 (4, 4, '09:00:00', '17:00:00'),
 (4, 5, '09:00:00', '17:00:00'),
 (4, 6, '09:00:00', '17:00:00'),
 (5, 1, '12:00:00', '20:00:00'),
 (5, 2, '12:00:00', '20:00:00'),
 (5, 3, '12:00:00', '20:00:00'),
 (5, 4, '12:00:00', '20:00:00'),
 (5, 5, '12:00:00', '20:00:00'),
 (5, 6, '12:00:00', '20:00:00');

-- Clients
INSERT INTO clients(client_id, name, phone, email, address, password_hash, status) VALUES
 (1, 'Meera Joshi', '9820011111', 'meera@mail.com', 'Dadar, Mumbai', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'active'),
 (2, 'Rohan Mehta', '9820022222', 'rohan@mail.com', 'Bandra, Mumbai', '$2a$10$jkjxW/yZLZuQXhttpsd6FOpxu6zbcl6RCvOGuxTH7hbSJb2dwNI0S', 'active'),
 (3, 'Priya Nair', '9820033333', 'priya@mail.com', 'Andheri, Mumbai', NULL, 'active'),
 (4, 'Imran Shaikh', '9820044444', 'imran@mail.com', 'Kurla, Mumbai', NULL, 'active'),
 (5, 'Kavita Desai', '9820055555', 'kavita@mail.com', 'Powai, Mumbai', NULL, 'active'),
 (6, 'Meera J.', '9820011111', 'meera.j@mail.com', 'Dadar, Mumbai', NULL, 'active');

-- Patients
INSERT INTO patients(patient_id, client_id, name, species, breed, date_of_birth, sex, color_markings, microchip_number, status) VALUES
 (1, 1, 'Bruno', 'Dog', 'Labrador', '2020-03-12', 'M', 'Golden', 'MC1001', 'active'),
 (2, 1, 'Mittens', 'Cat', 'Persian', '2021-06-01', 'F', 'White', NULL, 'active'),
 (3, 2, 'Rocky', 'Dog', 'Beagle', '2019-11-20', 'M', 'Tri-colour', 'MC1003', 'active'),
 (4, 2, 'Luna', 'Cat', 'Siamese', '2022-02-14', 'F', 'Cream', NULL, 'active'),
 (5, 3, 'Coco', 'Dog', 'Pomeranian', '2023-01-09', 'F', 'Orange', NULL, 'active'),
 (6, 3, 'Kiwi', 'Bird', 'Parakeet', '2024-04-04', 'M', 'Green', NULL, 'active'),
 (7, 4, 'Simba', 'Cat', 'Tabby', '2020-08-30', 'M', 'Striped', 'MC1007', 'active'),
 (8, 5, 'Daisy', 'Dog', 'Golden Retriever', '2018-12-05', 'F', 'Golden', NULL, 'active'),
 (9, 5, 'Thumper', 'Rabbit', 'Dutch', '2023-05-17', 'M', 'Black/white', NULL, 'active'),
 (10, 6, 'Bruno Jr.', 'Dog', 'Labrador', '2024-09-01', 'M', 'Golden', NULL, 'active');

-- Appointments (current week anchor)
SET @monday = DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY);
SET @last_week_mon = DATE_SUB(@monday, INTERVAL 7 DAY);
SET @next_week_mon = DATE_ADD(@monday, INTERVAL 7 DAY);

INSERT INTO appointments(patient_id, vet_id, service_type, slot_start, status, source, cancellation_reason) VALUES
 (1, 4, 'Check-up', DATE_ADD(@last_week_mon, INTERVAL '10:00:00' HOUR_SECOND), 'Completed', 'staff', NULL),
 (2, 4, 'Vaccination', DATE_ADD(@last_week_mon, INTERVAL '11:00:00' HOUR_SECOND), 'Completed', 'staff', NULL),
 (3, 5, 'Check-up', DATE_ADD(DATE_ADD(@last_week_mon, INTERVAL 1 DAY), INTERVAL '14:00:00' HOUR_SECOND), 'Cancelled', 'staff', 'Owner travelling'),
 (4, 4, 'Check-up', DATE_ADD(@next_week_mon, INTERVAL '09:30:00' HOUR_SECOND), 'Scheduled', 'staff', NULL),
 (5, 5, 'Grooming', DATE_ADD(@next_week_mon, INTERVAL '13:00:00' HOUR_SECOND), 'Scheduled', 'staff', NULL),
 (6, 4, 'Check-up', DATE_ADD(DATE_ADD(@next_week_mon, INTERVAL 1 DAY), INTERVAL '10:00:00' HOUR_SECOND), 'Requested', 'owner', NULL),
 (7, 4, 'Surgery consult', DATE_ADD(@next_week_mon, INTERVAL '11:00:00' HOUR_SECOND), 'Checked-In', 'staff', NULL),
 (8, 5, 'Vaccination', DATE_ADD(DATE_ADD(@next_week_mon, INTERVAL 2 DAY), INTERVAL '16:00:00' HOUR_SECOND), 'Scheduled', 'staff', NULL);

-- Notifications
INSERT INTO notification_log(client_id, appointment_id, kind, message)
SELECT p.client_id, a.appointment_id, 'confirmation',
  CONCAT('Appointment ', LOWER(a.status), ' for ', DATE_FORMAT(a.slot_start, '%d %b %H:%i'))
FROM appointments a
JOIN patients p USING (patient_id)
WHERE a.status IN ('Scheduled', 'Requested');
