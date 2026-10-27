-- VCMS Seed Data for MySQL
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE notification_log;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE appointments;
TRUNCATE TABLE patients;
TRUNCATE TABLE clients;
TRUNCATE TABLE vet_working_hours;
TRUNCATE TABLE staff_accounts;

-- Staff Accounts (password is 'password' -> $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
INSERT INTO staff_accounts (staff_id, name, email, phone, password_hash, role, must_change_password) VALUES
(1, 'Anita Admin', 'admin@vcms.test', '9800000001', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Clinic Administrator', 0),
(2, 'Ravi Reception', 'ravi@vcms.test', '9800000002', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Receptionist', 0),
(3, 'Sneha Reception', 'sneha@vcms.test', '9800000003', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Receptionist', 0),
(4, 'Dr. Rao', 'rao@vcms.test', '9800000004', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Veterinarian', 0),
(5, 'Dr. Iyer', 'iyer@vcms.test', '9800000005', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Veterinarian', 0),
(6, 'Tara Tech', 'tara@vcms.test', '9800000006', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Veterinary Technician', 0);

-- Vet working hours: Dr. Rao (id=4) Mon-Sat 9-17, Dr. Iyer (id=5) Mon-Sat 12-20
INSERT INTO vet_working_hours (vet_id, weekday, start_time, end_time) VALUES
(4, 1, '09:00', '17:00'), (4, 2, '09:00', '17:00'), (4, 3, '09:00', '17:00'),
(4, 4, '09:00', '17:00'), (4, 5, '09:00', '17:00'), (4, 6, '09:00', '17:00'),
(5, 1, '12:00', '20:00'), (5, 2, '12:00', '20:00'), (5, 3, '12:00', '20:00'),
(5, 4, '12:00', '20:00'), (5, 5, '12:00', '20:00'), (5, 6, '12:00', '20:00');

-- Clients
INSERT INTO clients (client_id, name, phone, email, address, password_hash) VALUES
(1, 'Meera Joshi', '9820011111', 'meera@mail.com', 'Dadar, Mumbai', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
(2, 'Rohan Mehta', '9820022222', 'rohan@mail.com', 'Bandra, Mumbai', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
(3, 'Priya Nair', '9820033333', 'priya@mail.com', 'Andheri, Mumbai', NULL),
(4, 'Imran Shaikh', '9820044444', 'imran@mail.com', 'Kurla, Mumbai', NULL),
(5, 'Kavita Desai', '9820055555', 'kavita@mail.com', 'Powai, Mumbai', NULL),
(6, 'Meera J.', '9820011111', 'meera.j@mail.com', 'Dadar, Mumbai', NULL);

-- Patients
INSERT INTO patients (patient_id, client_id, name, species, breed, date_of_birth, sex, color_markings, microchip_number) VALUES
(1, 1, 'Bruno', 'Dog', 'Labrador', '2020-03-12', 'M', 'Golden', 'MC1001'),
(2, 1, 'Mittens', 'Cat', 'Persian', '2021-06-01', 'F', 'White', NULL),
(3, 2, 'Rocky', 'Dog', 'Beagle', '2019-11-20', 'M', 'Tri-colour', 'MC1003'),
(4, 2, 'Luna', 'Cat', 'Siamese', '2022-02-14', 'F', 'Cream', NULL),
(5, 3, 'Coco', 'Dog', 'Pomeranian', '2023-01-09', 'F', 'Orange', NULL),
(6, 3, 'Kiwi', 'Bird', 'Parakeet', '2024-04-04', 'M', 'Green', NULL),
(7, 4, 'Simba', 'Cat', 'Tabby', '2020-08-30', 'M', 'Striped', 'MC1007'),
(8, 5, 'Daisy', 'Dog', 'Golden Retriever', '2018-12-05', 'F', 'Golden', NULL),
(9, 5, 'Thumper', 'Rabbit', 'Dutch', '2023-05-17', 'M', 'Black/white', NULL),
(10, 6, 'Bruno Jr.', 'Dog', 'Labrador', '2024-09-01', 'M', 'Golden', NULL);

-- Appointments (reference date ~ Oct 2026)
INSERT INTO appointments (appointment_id, patient_id, vet_id, service_type, slot_start, duration_min, status, source, cancellation_reason) VALUES
(1, 1, 4, 'Check-up', '2026-10-20 10:00:00', 30, 'Completed', 'staff', NULL),
(2, 2, 4, 'Vaccination', '2026-10-20 11:00:00', 30, 'Completed', 'staff', NULL),
(3, 3, 5, 'Check-up', '2026-10-21 14:00:00', 30, 'Cancelled', 'staff', 'Owner travelling'),
(4, 4, 4, 'Check-up', '2026-10-27 09:30:00', 30, 'Scheduled', 'staff', NULL),
(5, 5, 5, 'Grooming', '2026-10-27 13:00:00', 30, 'Scheduled', 'staff', NULL),
(6, 6, 4, 'Check-up', '2026-10-28 10:00:00', 30, 'Requested', 'owner', NULL),
(7, 7, 4, 'Surgery consult', '2026-10-27 11:00:00', 30, 'Checked-In', 'staff', NULL),
(8, 8, 5, 'Vaccination', '2026-10-29 16:00:00', 30, 'Scheduled', 'staff', NULL);

-- Notification Log (CI-1, CI-2, APT-9 stub records)
INSERT INTO notification_log (client_id, appointment_id, channel, kind, message, delivery_status) VALUES
(1, 1, 'email', 'confirmation', 'Appointment confirmed for Bruno on 2026-10-20 10:00:00 with Dr. Rao', 'Delivered (stub)'),
(1, 2, 'sms', 'confirmation', 'Appointment confirmed for Mittens on 2026-10-20 11:00:00 with Dr. Rao', 'Delivered (stub)'),
(2, 3, 'email', 'status_change', 'Appointment for Rocky on 2026-10-21 cancelled: Owner travelling', 'Delivered (stub)'),
(2, 4, 'email', 'confirmation', 'Appointment confirmed for Luna on 2026-10-27 09:30:00 with Dr. Rao', 'Delivered (stub)'),
(3, 5, 'sms', 'confirmation', 'Appointment confirmed for Coco on 2026-10-27 13:00:00 with Dr. Iyer', 'Delivered (stub)'),
(3, 6, 'email', 'confirmation', 'Appointment requested for Kiwi on 2026-10-28 10:00:00 with Dr. Rao', 'Delivered (stub)'),
(4, 7, 'email', 'confirmation', 'Appointment confirmed for Simba on 2026-10-27 11:00:00 with Dr. Rao', 'Delivered (stub)'),
(5, 8, 'sms', 'confirmation', 'Appointment confirmed for Daisy on 2026-10-29 16:00:00 with Dr. Iyer', 'Delivered (stub)');

SET FOREIGN_KEY_CHECKS = 1;
